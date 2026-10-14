export function normalizeBarcode(value){
  const digits=String(value||'').replace(/\D/g,'');
  if(digits.length<8||digits.length>14)return null;
  return digits;
}
function safeHttps(value){
  try{const u=new URL(String(value||''));return u.protocol==='https:'?u.toString():null}catch{return null}
}
function first(value){return Array.isArray(value)?value.find(Boolean):value}
function cleanText(value,max=1200){const s=String(value||'').replace(/\s+/g,' ').trim();return s?s.slice(0,max):null}
function listText(value,max=600){if(Array.isArray(value))return cleanText(value.map(x=>typeof x==='string'?x:(x?.lc_name||x?.id||'')).filter(Boolean).join(', '),max);return cleanText(value,max)}

export function mapOpenFoodFactsProduct(code,body){
  const p=body?.product||null;if(!p)return null;
  const name=cleanText(p.product_name||p.product_name_fr||p.abbreviated_product_name||p.generic_name||p.generic_name_fr,220);
  if(!name)return null;
  const image=safeHttps(p.image_front_url||p.image_url||p.selected_images?.front?.display?.fr||p.selected_images?.front?.display?.en);
  const productCode=normalizeBarcode(p.code||code)||normalizeBarcode(code);
  return {
    code:productCode||String(code||''),name,
    brand:cleanText(p.brands,180),category:cleanText(p.categories,300),quantityLabel:cleanText(p.quantity,120),
    productQuantity:p.product_quantity==null?null:Number(p.product_quantity),productQuantityUnit:cleanText(p.product_quantity_unit,30),
    imageUrl:image,ingredients:cleanText(p.ingredients_text||p.ingredients_text_fr,1800),allergens:listText(p.allergens||p.allergens_tags,700),
    traces:listText(p.traces||p.traces_tags,500),labels:listText(p.labels||p.labels_tags,500),countries:listText(p.countries||p.countries_tags,500),
    origins:listText(p.origins||p.origins_tags,500),manufacturingPlaces:cleanText(p.manufacturing_places,500),embCodes:cleanText(p.emb_codes,300),
    nutritionGrade:cleanText(p.nutriscore_grade||p.nutrition_grades,20),ecoscoreGrade:cleanText(p.ecoscore_grade,20),
    completeness:Number.isFinite(Number(p.completeness))?Number(p.completeness):null,
    source:'open_food_facts',sourceLabel:'Open Food Facts',sourceUrl:`https://world.openfoodfacts.org/product/${encodeURIComponent(productCode||code)}`,
    sourceLicense:'ODbL',sourceAttribution:'Données produit : Open Food Facts — ODbL',verifiedByGs1Url:'https://www.gs1.org/services/verified-by-gs1'
  };
}

export function mapUpcItemDbItem(code,item){
  if(!item)return null;const name=cleanText(item.title||item.description,220);if(!name)return null;
  const productCode=normalizeBarcode(item.ean||item.upc||code)||normalizeBarcode(code);
  return {
    code:productCode||String(code||''),name,brand:cleanText(item.brand,180),category:cleanText(item.category,300),quantityLabel:cleanText(item.size,120),
    productQuantity:null,productQuantityUnit:null,imageUrl:safeHttps(first(item.images)),ingredients:null,allergens:null,traces:null,labels:null,countries:null,origins:null,manufacturingPlaces:null,embCodes:null,nutritionGrade:null,ecoscoreGrade:null,completeness:null,
    source:'upcitemdb',sourceLabel:'UPCitemdb',sourceUrl:`https://www.upcitemdb.com/upc/${encodeURIComponent(productCode||code)}`,
    sourceLicense:null,sourceAttribution:'Informations produit : UPCitemdb',verifiedByGs1Url:'https://www.gs1.org/services/verified-by-gs1'
  };
}

