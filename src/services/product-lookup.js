import { q } from '../db.js';
import { config } from '../config.js';
import { APP_VERSION } from '../version.js';

const FOUND_TTL_MS=30*24*60*60*1000;
const NOT_FOUND_TTL_MS=24*60*60*1000;
const ERROR_TTL_MS=15*60*1000;

export { normalizeBarcode, mapOpenFoodFactsProduct, mapUpcItemDbItem } from '../utils/product-data.js';
import { normalizeBarcode, mapOpenFoodFactsProduct, mapUpcItemDbItem } from '../utils/product-data.js';

async function fetchJson(url,{headers={},timeoutMs=config.productLookup?.timeoutMs||4500}={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.max(1000,timeoutMs));
  try{
    const r=await fetch(url,{headers:{Accept:'application/json',...headers},signal:controller.signal,redirect:'follow'});
    if(r.status===404)return {status:404,body:null,headers:r.headers};
    if(r.status===429)return {status:429,body:null,headers:r.headers};
    if(!r.ok)return {status:r.status,body:null,headers:r.headers};
    const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{return {status:502,body:null,headers:r.headers}}return {status:r.status,body,headers:r.headers};
  }finally{clearTimeout(timer)}
}

async function fetchOpenFoodFacts(code){
  if(config.productLookup?.openFoodFacts===false)return {found:false,provider:'open_food_facts',skipped:true};
  const fields=['code','product_name','abbreviated_product_name','generic_name','brands','categories','quantity','product_quantity','product_quantity_unit','image_front_url','image_url','selected_images','ingredients_text','allergens','allergens_tags','traces','traces_tags','labels','labels_tags','countries','countries_tags','origins','origins_tags','manufacturing_places','emb_codes','nutriscore_grade','nutrition_grades','ecoscore_grade','completeness'].join(',');
  const url=`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(code)}?product_type=all&cc=fr&lc=fr&tags_lc=fr&fields=${encodeURIComponent(fields)}`;
  try{
    const r=await fetchJson(url,{headers:{'User-Agent':`HygieSafe/${APP_VERSION} (${config.publicSiteUrl||config.appUrl||'https://www.hygiesafe.com'})`}});
    if(r.status===404)return {found:false,provider:'open_food_facts'};
    if(r.status!==200)return {found:false,provider:'open_food_facts',error:`http_${r.status}`};
    const product=mapOpenFoodFactsProduct(code,r.body);return product?{found:true,provider:'open_food_facts',product}:{found:false,provider:'open_food_facts'};
  }catch(e){return {found:false,provider:'open_food_facts',error:e?.name==='AbortError'?'timeout':'network'};}
}

async function fetchUpcItemDb(code){
  if(config.productLookup?.upcItemDb===false)return {found:false,provider:'upcitemdb',skipped:true};
  const paid=!!config.productLookup?.upcItemDbUserKey;
  const base=paid?'https://api.upcitemdb.com/prod/v1/lookup':'https://api.upcitemdb.com/prod/trial/lookup';
  const headers=paid?{user_key:config.productLookup.upcItemDbUserKey,key_type:config.productLookup.upcItemDbKeyType||'3scale'}:{};
  try{
    const r=await fetchJson(`${base}?upc=${encodeURIComponent(code)}`,{headers});
    if(r.status===404)return {found:false,provider:'upcitemdb'};
    if(r.status===429)return {found:false,provider:'upcitemdb',error:'rate_limited'};
    if(r.status!==200)return {found:false,provider:'upcitemdb',error:`http_${r.status}`};
    const item=r.body?.items?.[0];const product=mapUpcItemDbItem(code,item);return product?{found:true,provider:'upcitemdb',product}:{found:false,provider:'upcitemdb'};
  }catch(e){return {found:false,provider:'upcitemdb',error:e?.name==='AbortError'?'timeout':'network'};}
}

async function localArticle(organizationId,code){
  return (await q(`SELECT id,title,payload,updated_at FROM records WHERE organization_id=$1 AND type='stock_article' AND status<>'deleted' AND regexp_replace(COALESCE(payload->>'barcode',''),'[^0-9]','','g')=$2 ORDER BY updated_at DESC LIMIT 1`,[organizationId,code])).rows[0]||null;
}
async function memoryProduct(organizationId,code){
  return (await q(`SELECT * FROM organization_product_memory WHERE organization_id=$1 AND barcode=$2 LIMIT 1`,[organizationId,code])).rows[0]||null;
}
function memoryToProduct(row){if(!row)return null;const d=row.source_data||{};return {...d,code:row.barcode,name:row.product_name,brand:row.brand||d.brand||null,category:row.category||d.category||null,quantityLabel:row.quantity_label||d.quantityLabel||null,imageUrl:row.image_url||d.imageUrl||null,source:'hygiesafe_memory',sourceLabel:'Catalogue HygieSafe',sourceUrl:row.source_url||d.sourceUrl||null,sourceLicense:row.source_license||d.sourceLicense||null,sourceAttribution:'Produit déjà validé dans cet établissement',memoryId:row.id};}
function articleToProduct(row,code){const p=row.payload||{};return {code,name:p.product||row.title||'Article',brand:p.brand||null,category:p.category||null,quantityLabel:p.packageSize||p.quantityLabel||null,imageUrl:safeHttps(p.imageUrl),ingredients:p.ingredients||null,allergens:p.allergens||null,traces:p.traces||null,labels:p.labels||null,countries:p.countries||null,origins:p.origins||null,manufacturingPlaces:p.manufacturingPlaces||null,embCodes:p.embCodes||null,nutritionGrade:p.nutritionGrade||null,ecoscoreGrade:p.ecoscoreGrade||null,source:'hygiesafe_catalog',sourceLabel:'Catalogue HygieSafe',sourceUrl:null,sourceLicense:null,sourceAttribution:'Article déjà configuré dans cet établissement',articleId:row.id};}

async function readCache(code){
  const row=(await q(`SELECT * FROM external_product_cache WHERE barcode=$1 LIMIT 1`,[code])).rows[0]||null;if(!row)return null;
  await q(`UPDATE external_product_cache SET hit_count=hit_count+1,last_accessed_at=now() WHERE barcode=$1`,[code]).catch(()=>{});
  if(new Date(row.expires_at).getTime()<=Date.now())return null;
  return row;
}
async function writeCache(code,{status,source=null,product=null,attempts=[]}){
  const ttl=status==='found'?FOUND_TTL_MS:status==='not_found'?NOT_FOUND_TTL_MS:ERROR_TTL_MS;
  const expires=new Date(Date.now()+ttl).toISOString();
  await q(`INSERT INTO external_product_cache(barcode,status,source,payload,attempts,fetched_at,expires_at,last_accessed_at,hit_count) VALUES($1,$2,$3,$4,$5,now(),$6,now(),0) ON CONFLICT(barcode) DO UPDATE SET status=EXCLUDED.status,source=EXCLUDED.source,payload=EXCLUDED.payload,attempts=EXCLUDED.attempts,fetched_at=now(),expires_at=EXCLUDED.expires_at,last_accessed_at=now()`,[code,status,source,product||{},attempts,expires]);
}

export async function lookupProduct({organizationId,code,forceRefresh=false}){
  const barcode=normalizeBarcode(code);if(!barcode)return {found:false,code:null,error:'invalid_barcode',attempts:[]};
  const article=await localArticle(organizationId,barcode);if(article)return {found:true,code:barcode,source:'hygiesafe_catalog',product:articleToProduct(article,barcode),cached:true,attempts:[]};
  const memory=await memoryProduct(organizationId,barcode);if(memory){await q(`UPDATE organization_product_memory SET last_seen_at=now(),seen_count=seen_count+1 WHERE id=$1`,[memory.id]).catch(()=>{});return {found:true,code:barcode,source:'hygiesafe_memory',product:memoryToProduct(memory),cached:true,attempts:[]};}
  if(!forceRefresh){const cache=await readCache(barcode);if(cache){if(cache.status==='found')return {found:true,code:barcode,source:cache.source,product:cache.payload,cached:true,attempts:cache.attempts||[]};if(cache.status==='not_found')return {found:false,code:barcode,cached:true,attempts:cache.attempts||[],gs1VerificationUrl:'https://www.gs1.org/services/verified-by-gs1'};if(cache.status==='error')return {found:false,code:barcode,cached:true,temporarilyUnavailable:true,attempts:cache.attempts||[],gs1VerificationUrl:'https://www.gs1.org/services/verified-by-gs1'};}}
  const attempts=[];const off=await fetchOpenFoodFacts(barcode);attempts.push({provider:'open_food_facts',found:!!off.found,error:off.error||null,skipped:!!off.skipped});if(off.found){await writeCache(barcode,{status:'found',source:'open_food_facts',product:off.product,attempts});return {found:true,code:barcode,source:'open_food_facts',product:off.product,cached:false,attempts};}
  const upc=await fetchUpcItemDb(barcode);attempts.push({provider:'upcitemdb',found:!!upc.found,error:upc.error||null,skipped:!!upc.skipped});if(upc.found){await writeCache(barcode,{status:'found',source:'upcitemdb',product:upc.product,attempts});return {found:true,code:barcode,source:'upcitemdb',product:upc.product,cached:false,attempts};}
  const hadNetworkError=attempts.some(x=>x.error&&x.error!=='rate_limited');await writeCache(barcode,{status:hadNetworkError?'error':'not_found',attempts}).catch(()=>{});return {found:false,code:barcode,cached:false,attempts,gs1VerificationUrl:'https://www.gs1.org/services/verified-by-gs1'};
}

export async function rememberProduct({organizationId,userId,code,product,overrideName=null}){
  const barcode=normalizeBarcode(code);if(!barcode||!product?.name)return null;const name=cleanText(overrideName||product.name,220);if(!name)return null;
  const external=['open_food_facts','upcitemdb'].includes(product.source);
  // Les données externes restent dans le cache fournisseur séparé. Le catalogue établissement ne mémorise que la valeur validée par l'utilisateur + provenance.
  const compact=external?{code:barcode,name,externalSource:product.source||null,sourceLabel:product.sourceLabel||null,sourceUrl:safeHttps(product.sourceUrl),sourceLicense:product.sourceLicense||null,sourceAttribution:product.sourceAttribution||null,validatedByUser:true,verifiedByGs1Url:'https://www.gs1.org/services/verified-by-gs1'}:{code:barcode,name,brand:cleanText(product.brand,180),category:cleanText(product.category,300),quantityLabel:cleanText(product.quantityLabel,120),imageUrl:safeHttps(product.imageUrl),ingredients:cleanText(product.ingredients,1800),allergens:cleanText(product.allergens,700),traces:cleanText(product.traces,500),labels:cleanText(product.labels,500),countries:cleanText(product.countries,500),origins:cleanText(product.origins,500),manufacturingPlaces:cleanText(product.manufacturingPlaces,500),embCodes:cleanText(product.embCodes,300),nutritionGrade:cleanText(product.nutritionGrade,20),ecoscoreGrade:cleanText(product.ecoscoreGrade,20),source:product.source||null,sourceLabel:product.sourceLabel||null,sourceUrl:safeHttps(product.sourceUrl),sourceLicense:product.sourceLicense||null,sourceAttribution:product.sourceAttribution||null,verifiedByGs1Url:'https://www.gs1.org/services/verified-by-gs1'};
  const storedSource=external?'user_validated':(product.source||'manual');
  return (await q(`INSERT INTO organization_product_memory(organization_id,barcode,product_name,brand,category,quantity_label,image_url,source,source_url,source_license,source_data,verified_by,first_seen_at,last_seen_at,seen_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now(),1) ON CONFLICT(organization_id,barcode) DO UPDATE SET product_name=EXCLUDED.product_name,brand=EXCLUDED.brand,category=EXCLUDED.category,quantity_label=EXCLUDED.quantity_label,image_url=EXCLUDED.image_url,source=EXCLUDED.source,source_url=EXCLUDED.source_url,source_license=EXCLUDED.source_license,source_data=EXCLUDED.source_data,verified_by=EXCLUDED.verified_by,last_seen_at=now(),seen_count=organization_product_memory.seen_count+1,updated_at=now() RETURNING *`,[organizationId,barcode,name,external?null:compact.brand,external?null:compact.category,external?null:compact.quantityLabel,external?null:compact.imageUrl,storedSource,compact.sourceUrl,product.sourceLicense||null,compact,userId])).rows[0]||null;
}
