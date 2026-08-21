function fold(value=''){
  return String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[’‘`]/g,"'")
    .toUpperCase();
}
function compact(value=''){return String(value).replace(/\r/g,'').replace(/[ \t]+/g,' ').trim();}
function cleanLines(text=''){
  return String(text).replace(/\r/g,'').split(/\n+/).map(compact).filter(Boolean);
}
function validIsoParts(y,m,d){
  y=Number(y);m=Number(m);d=Number(d);
  if(y<2000||y>2100||m<1||m>12||d<1||d>31)return null;
  const dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return null;
  return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function toIso(day,month,year){
  let y=Number(year);if(String(year).length===2)y+=2000;
  return validIsoParts(y,Number(month),Number(day));
}
const MONTHS={JANVIER:1,JANUARY:1,FEVRIER:2,FEBRUARY:2,MARS:3,MARCH:3,AVRIL:4,APRIL:4,MAI:5,MAY:5,JUIN:6,JUNE:6,JUILLET:7,JULY:7,AOUT:8,AUGUST:8,SEPTEMBRE:9,SEPTEMBER:9,OCTOBRE:10,OCTOBER:10,NOVEMBRE:11,NOVEMBER:11,DECEMBRE:12,DECEMBER:12};

const DATE_LABELS=[
  {type:'production',confidence:97,aliases:['DATE DE PRODUCTION','PRODUCTION DATE','PRODUIT LE','FABRIQUE LE','MANUFACTURED ON']},
  {type:'frozen',confidence:97,aliases:['PRODUIT SURGELE LE','SURGELE LE','FROZEN ON','FROZEN DATE','CONGELE LE']},
  {type:'thawed',confidence:96,aliases:['DECONGELE LE','DATE DE DECONGELATION','THAWED ON']},
  {type:'ddm',confidence:98,aliases:['A CONSOMMER DE PREFERENCE AVANT','CONSOMMER DE PREFERENCE AVANT','BEST BEFORE','D.D.M','DDM','BBE','BEST BEFORE END']},
  {type:'dlc',confidence:98,aliases:["A CONSOMMER JUSQU'AU",'A CONSOMMER JUSQU AU','USE BY','USE-BY','D.L.C','DLC']},
  {type:'expiry',confidence:88,aliases:['A CONSOMMER AVANT LE','A CONSOMMER AVANT','DATE LIMITE','EXPIRATION DATE','EXPIRY DATE','EXPIRY','EXP DATE','EXP']}
];
function classifyDate(rawText,index,rawDate){
  const before=fold(rawText.slice(Math.max(0,index-180),index)).replace(/\s+/g,' ');
  const immediate=before.slice(-120);
  if(/JUSQU.{0,12}AU/.test(immediate))return {type:'dlc',confidence:91,distance:0,label:'JUSQU AU'};
  if(/(?:PREFER|PREFE|EFERENC|REFERENCE|ERENCE).{0,32}(?:AVANT|VANT)|BEST.{0,12}BEFORE/.test(immediate))return {type:'ddm',confidence:89,distance:0,label:'PREFERENCE AVANT'};
  let best=null;
  for(const label of DATE_LABELS){
    for(const alias of label.aliases){const pos=before.lastIndexOf(alias);if(pos<0)continue;const distance=before.length-(pos+alias.length);if(distance>130)continue;if(!best||distance<best.distance)best={type:label.type,confidence:label.confidence,distance,label:alias};}
  }
  if(best)return best;
  const around=fold(rawText.slice(Math.max(0,index-60),Math.min(rawText.length,index+rawDate.length+60)));
  for(const label of DATE_LABELS){for(const alias of label.aliases){if(around.includes(alias))return {type:label.type,confidence:label.confidence-10,distance:999,label:alias};}}
  const fuzzy=fold(rawText.slice(Math.max(0,index-150),Math.min(rawText.length,index+rawDate.length+25))).replace(/\s+/g,' ');
  if(/JUSQU.{0,12}AU/.test(fuzzy))return {type:'dlc',confidence:88,distance:999,label:'JUSQU AU'};
  if(/(?:PREFER|PREFE|EFERENC|REFERENCE|ERENCE).{0,28}(?:AVANT|VANT)|BEST.{0,12}BEFORE/.test(fuzzy))return {type:'ddm',confidence:86,distance:999,label:'PREFERENCE AVANT'};
  if(/(?:CONSOM|SOMMER).{0,22}AVANT/.test(fuzzy))return {type:'expiry',confidence:78,distance:999,label:'CONSOMMER AVANT'};
  return {type:'unknown',confidence:62,distance:999,label:null};
}
function endOfMonthIso(month,year){let y=Number(year);if(String(year).length===2)y+=2000;const m=Number(month);if(y<2000||y>2100||m<1||m>12)return null;return validIsoParts(y,m,new Date(Date.UTC(y,m,0)).getUTCDate());}
function findDates(text=''){
  const out=[];const seen=new Set();
  const endMonthRe=/(?:A\s+CONSOMMER\s+DE\s+PREFERENCE\s+AVANT\s+FIN|BEST\s+BEFORE\s+END|BBE)\s*[:#-]?\s*(\d{1,2})[\/.\-](\d{2,4})/gi;
  for(const m of text.matchAll(endMonthRe)){const iso=endOfMonthIso(m[1],m[2]);if(iso){seen.add(`${m.index}:${iso}`);out.push({date:iso,type:'ddm',confidence:97,label:'FIN DE MOIS',raw:m[0],index:m.index});}}
  const patterns=[
    {re:/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g,parse:m=>validIsoParts(m[1],m[2],m[3])},
    {re:/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g,parse:m=>toIso(m[1],m[2],m[3])},
    {re:/\b(\d{1,2})[\/.-](\d{1,2})\s+(\d{2,4})\b/g,parse:m=>toIso(m[1],m[2],m[3])},
    {re:/\b(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})\b/g,parse:m=>toIso(m[1],m[2],m[3])},
    {re:/\b(\d{1,2})\s+(JANVIER|JANUARY|F[ÉE]VRIER|FEBRUARY|MARS|MARCH|AVRIL|APRIL|MAI|MAY|JUIN|JUNE|JUILLET|JULY|AO[ÛU]T|AUGUST|SEPTEMBRE|SEPTEMBER|OCTOBRE|OCTOBER|NOVEMBRE|NOVEMBER|D[ÉE]CEMBRE|DECEMBER)\s+(\d{2,4})\b/gi,parse:m=>toIso(m[1],MONTHS[fold(m[2])],m[3])}
  ];
  for(const {re,parse} of patterns){for(const m of text.matchAll(re)){const iso=parse(m);if(!iso)continue;const key=`${m.index}:${iso}`;if(seen.has(key))continue;seen.add(key);const cls=classifyDate(text,m.index,m[0]);out.push({date:iso,type:cls.type,confidence:cls.confidence,label:cls.label,raw:m[0],index:m.index});}}
  out.sort((a,b)=>a.index-b.index);
  return out;
}
function pickPrimaryDate(candidates){
  const rank={dlc:6,ddm:5,expiry:4,unknown:3,thawed:2,frozen:1,production:0};
  const currentYear=new Date().getUTCFullYear();
  return [...candidates].filter(x=>['dlc','ddm','expiry','unknown'].includes(x.type)).filter(x=>x.type!=='unknown'||(Number(x.date.slice(0,4))>=currentYear-2&&Number(x.date.slice(0,4))<=currentYear+10)).sort((a,b)=>(rank[b.type]-rank[a.type])||(b.confidence-a.confidence)||a.index-b.index)[0]||null;
}
function findDateByType(candidates,type){return candidates.find(x=>x.type===type)?.date||null;}

function normalizeLotCandidate(value=''){
  let v=compact(value).replace(/^[\s:#./-]+/,'').replace(/\s+(?:POIDS|WEIGHT|CONSERVER|STORE|DATE|BEST|A CONSOMMER|INGREDIENTS).*$/i,'').trim();
  const tokens=v.match(/[A-Z0-9][A-Z0-9._\/-]{3,30}/gi)||[];
  if(tokens.length)return tokens.sort((a,b)=>b.replace(/\W/g,'').length-a.replace(/\W/g,'').length)[0].toUpperCase();
  const digits=(v.match(/(?:\d[\s-]*){5,30}/)||[])[0];
  return digits?digits.replace(/\D/g,''):null;
}
function findLot(text='',lines=[]){
  const labelRe=/(?:N\s*[°ºO]?\s*(?:DE\s*)?LOT|LOT\s*\/\s*LOT\s*NUMBER|LOT\s*NUMBER|LOT|BATCH(?:\s*(?:NO|NUMBER))?|(?:^|\s)L[.:#-](?=\s*[A-Z0-9]))/i;
  for(let i=0;i<lines.length;i++){
    if(!labelRe.test(lines[i]))continue;
    const directL=lines[i].match(/(?:^|\s)L[.:#-]\s*([A-Z0-9][A-Z0-9._\/-]{3,30})/i);if(directL)return {value:directL[1].toUpperCase(),confidence:94};
    const after=lines[i].replace(/^.*?(?:N\s*[°ºO]?\s*(?:DE\s*)?LOT|LOT\s*\/\s*LOT\s*NUMBER|LOT\s*NUMBER|LOT|BATCH(?:\s*(?:NO|NUMBER))?)\s*[:#-]?\s*/i,'');
    let candidate=normalizeLotCandidate(after);
    if(!candidate&&lines[i+1])candidate=normalizeLotCandidate(lines[i+1]);
    if(candidate)return {value:candidate,confidence:96};
  }
  const flat=compact(text);const m=flat.match(/(?:N\s*[°ºO]?\s*(?:DE\s*)?LOT|LOT(?:\s*\/\s*LOT\s*NUMBER|\s*NUMBER)?|BATCH(?:\s*(?:NO|NUMBER))?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9 ._\/-]{3,45})/i);
  const value=m?normalizeLotCandidate(m[1]):null;return value?{value,confidence:86}:{value:null,confidence:0};
}
function validGtin(code=''){
  if(!/^\d{8}$|^\d{12,14}$/.test(code))return false;
  const body=code.slice(0,-1).split('').map(Number);let sum=0;for(let i=body.length-1,pos=1;i>=0;i--,pos++)sum+=body[i]*(pos%2?3:1);return (10-(sum%10))%10===Number(code.at(-1));
}
function findBarcode(lines=[],dateCandidates=[]){
  const dateDigits=new Set(dateCandidates.flatMap(d=>[String(d.raw||'').replace(/\D/g,''),String(d.date||'').replace(/\D/g,'')]).filter(Boolean));
  const candidates=[];
  for(const line of lines){
    const letters=(line.match(/[A-Za-zÀ-ÿ]/g)||[]).length;if(letters>2&&!/EAN|GTIN|BARCODE/i.test(line))continue;
    const groups=line.match(/(?:\d[\s.-]*){8,14}/g)||[];
    for(const raw of groups){const code=raw.replace(/\D/g,'');if(dateDigits.has(code))continue;if(validGtin(code))candidates.push(code);}
  }
  const uniq=[...new Set(candidates)];uniq.sort((a,b)=>(b.length===13)-(a.length===13)||b.length-a.length);return uniq[0]?{value:uniq[0],confidence:99}:{value:null,confidence:0};
}
function findWeight(text=''){
  const flat=compact(text);const m=flat.match(/(?:POIDS\s*NET|NET\s*WEIGHT)[^0-9]{0,25}(\d+(?:[,.]\d+)?)\s*(KG|G)\b/i);
  if(!m)return {value:null,unit:null,raw:null,confidence:0};
  return {value:Number(m[1].replace(',','.')),unit:m[2].toLowerCase(),raw:`${m[1]} ${m[2]}`,confidence:96};
}
function findStorageTemperature(text=''){
  const flat=fold(compact(text)).replace(/º/g,'°');
  const range=flat.match(/(?:CONSERVER|CONSERVE|STORE|KEEP)[^.;]{0,100}?(?:ENTRE|BETWEEN)?\s*([+-]?\d{1,2})\s*°?\s*C?\s*(?:ET|AND|A|TO|-|\/)\s*([+-]?\d{1,2})\s*°?\s*C/i);
  if(range)return {min:Number(range[1]),max:Number(range[2]),unit:'°C',raw:range[0],confidence:93};
  const single=flat.match(/(?:CONSERVER|CONSERVE|STORE|KEEP)[^.;]{0,90}?([+-]?\d{1,2})\s*°\s*C/i);
  if(single){const v=Number(single[1]);const between=/ENTRE|BETWEEN/.test(single[0]);return {min:between?null:v,max:v,unit:'°C',raw:single[0],confidence:between?72:88};}
  return {min:null,max:null,unit:'°C',raw:null,confidence:0};
}
function productLineScore(line,index,ingredientsIndex){
  const f=fold(line);if(line.length<4||line.length>100)return -999;
  if(/INGREDIENT|CONSERVER|CONSERVE|STORE|KEEP|VALEUR|NUTRITION|ENERG|POIDS|WEIGHT|LOT|DATE|BEST BEFORE|FROZEN ON|SURGELE|PRODUCTION|CONSOMMER|DISTRIB|ADRESSE|AVENUE|RUE|WWW\.|ORIGINE|PREPARATION|RECHAUFFER|GLUCIDE|PROTEINE|MATIER|SALT|SEL|HALAL|HAPI FRANCE/.test(f)||/^IS[: ]/.test(f))return -999;
  let score=20-Math.min(index,12);const letters=(line.match(/[A-Za-zÀ-ÿ]/g)||[]).length;const digits=(line.match(/\d/g)||[]).length;if(letters<4)return -999;if(digits/Math.max(1,line.length)>.28)score-=20;if(/\b\d{5}\b/.test(line))score-=35;
  if(ingredientsIndex>0&&index<ingredientsIndex&&ingredientsIndex-index<=4)score+=38;
  const alphaUpper=(line.match(/[A-ZÀ-Ü]/g)||[]).length;if(alphaUpper/letters>.65)score+=10;
  if(/JAMBON|POULET|EMMENTAL|FROMAGE|PINSA|PIZZA|VIANDE|BOEUF|PORC|SAUMON|BEURRE|CREME|LAIT|PAIN|FRUIT|LEGUME/i.test(line))score+=14;
  return score;
}
function findProduct(lines=[]){
  const ingredientsIndex=lines.findIndex(x=>/INGR[EÉ]DIENTS?|INGREDIENTS?/i.test(x));
  const productKeyword=/JAMBON|POULET|EMMENTAL|MMENTAL|FROMAGE|PINSA|PIZZA|VIANDE|BOEUF|PORC|SAUMON|BEURRE|CREME|LAIT|PAIN|FRUIT|LEGUME/i;
  if(ingredientsIndex>0){
    let start=-1;for(let i=ingredientsIndex-1;i>=Math.max(0,ingredientsIndex-8);i--){if(productKeyword.test(lines[i])){start=i;break;}}
    if(start>=0){const parts=lines.slice(start,ingredientsIndex).filter(x=>x.length>1&&!/DISTRIB|ADRESSE|AVENUE|RUE|WWW\.|CONSERVER|DATE/i.test(fold(x)));const joined=parts.join(' ').replace(/\s{2,}/g,' ').trim();if(joined.length>=4&&joined.length<=140)return {value:joined,confidence:92};}
    const parts=[];for(let i=ingredientsIndex-1;i>=0&&parts.length<4;i--){const line=lines[i];if(productLineScore(line,i,ingredientsIndex)<=0){if(parts.length)break;continue;}parts.unshift(line);}if(parts.length){const joined=parts.join(' ').replace(/\s{2,}/g,' ').trim();if(joined.length>=4&&joined.length<=120)return {value:joined,confidence:82};}
  }
  const keywordLine=lines.find(line=>productKeyword.test(line)&&productLineScore(line,0,ingredientsIndex)>0);if(keywordLine)return {value:keywordLine.replace(/\s{2,}/g,' ').trim(),confidence:72};
  if(ingredientsIndex<0){const generic=lines.slice(0,8).map((line,index)=>({line,index,f:fold(line)})).find(x=>{const letters=(x.line.match(/[A-Za-zÀ-ÿ]/g)||[]).length,digits=(x.line.match(/\d/g)||[]).length;return x.line.length>=4&&x.line.length<=100&&letters>=4&&digits/Math.max(1,x.line.length)<.32&&!/DATE|DLC|DDM|BEST BEFORE|USE[- ]?BY|EXP|LOT|BATCH|PRODUIT SURGELE|SURGELE LE|PRODUCTION|CONSERVER|CONSERVE|STORE|KEEP|POIDS|WEIGHT|EAN|GTIN|BARCODE|SIRET|SIREN|ADRESSE|RUE|AVENUE|WWW\.|INGREDIENT/.test(x.f)});if(generic)return {value:generic.line.replace(/\s{2,}/g,' ').trim(),confidence:68};return {value:null,confidence:0};}
  const ranked=lines.map((line,index)=>({line,index,score:productLineScore(line,index,ingredientsIndex)})).filter(x=>x.score>=40).sort((a,b)=>b.score-a.score);const best=ranked[0];return best?{value:best.line.replace(/\s{2,}/g,' ').trim(),confidence:Math.min(94,60+Math.max(0,best.score))}:{value:null,confidence:0};
}
function confidenceSummary(fields,ocrConfidence=0){
  const vals=Object.values(fields).filter(v=>Number(v)>0).map(Number);const fieldAvg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return Math.round(Math.max(0,Math.min(100,fieldAvg*.75+Number(ocrConfidence||0)*.25)));
}

export function extractTraceability(text=''){
  const rawText=String(text).replace(/\r/g,'');const lines=cleanLines(rawText);const clean=compact(rawText);
  const dateCandidates=findDates(rawText);const primary=pickPrimaryDate(dateCandidates);const lot=findLot(rawText,lines);const barcode=findBarcode(lines,dateCandidates);const weight=findWeight(rawText);const storageTemperature=findStorageTemperature(rawText);const product=findProduct(lines);
  const warnings=[];
  if(!primary)warnings.push('Date limite non détectée');
  if(!lot.value)warnings.push('Numéro de lot non détecté');
  if(!product.value)warnings.push('Nom du produit à compléter');
  const expiryCandidates=dateCandidates.filter(x=>['dlc','ddm','expiry','unknown'].includes(x.type));
  if(new Set(expiryCandidates.map(x=>x.date)).size>1)warnings.push('Plusieurs dates limites possibles : vérification nécessaire');
  const fieldConfidence={date:primary?.confidence||0,lot:lot.confidence,product:product.confidence,barcode:barcode.confidence,weight:weight.confidence,storageTemperature:storageTemperature.confidence};
  return {
    text:clean,rawText,lines,
    product:product.value,
    date:primary?.date||null,
    expiryDate:primary?.date||null,
    dateType:primary?.type||'unknown',
    productionDate:findDateByType(dateCandidates,'production'),
    frozenDate:findDateByType(dateCandidates,'frozen'),
    thawedDate:findDateByType(dateCandidates,'thawed'),
    lot:lot.value,
    barcode:barcode.value,
    weight:weight.value,weightUnit:weight.unit,weightRaw:weight.raw,
    storageTemperature,
    dateCandidates:dateCandidates.map(({index,...x})=>x),
    fieldConfidence,warnings,
    confidence:confidenceSummary(fieldConfidence,0)
  };
}

function invoiceMoney(value=''){
  let raw=String(value).trim().replace(/\s/g,'');
  if(raw.includes(','))raw=raw.replace(/\./g,'').replace(',','.');
  else if((raw.match(/\./g)||[]).length>1){const parts=raw.split('.'),dec=parts.pop();raw=parts.join('')+'.'+dec;}
  const n=Number(raw);return Number.isFinite(n)?n:null;
}
function invoiceMoneyMatches(line=''){
  const base=[...String(line).matchAll(/([0-9]{1,6}[,.][0-9]{2})(?![\d])/g)];
  return base.map((m,index)=>{let raw=m[1],start=m.index;const before=String(line).slice(0,start),group=before.match(/(?:^|\s)([0-9]{1,3})\s$/);if(group&&(base.length===1||index===base.length-1)){raw=`${group[1]} ${raw}`;start-=group[0].length-group[0].trimStart().length+group[1].length+1;}return {raw,index:start};});
}
function invoiceDate(text=''){
  const flat=compact(text);
  const labelled=flat.match(/(?:DATE\s*(?:DE\s*)?FACTURE|DATE\s*DU\s*DOCUMENT|INVOICE\s*DATE|DATE)\s*[:#-]?\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/i);
  if(labelled)return toIso(labelled[1],labelled[2],labelled[3]);
  return null;
}
function invoiceLineItems(text=''){
  const rows=[];
  const ignored=/(?:^|\b)(FACTURE|INVOICE|AVOIR|BON\s+DE\s+LIVRAISON|TOTAL|SOUS[- ]?TOTAL|T\.T\.C|TTC|TVA|H\.T|NET\s+[ÀA]\s+PAYER|ECHEANCE|R[ÈE]GLEMENT|REMISE|PORT|FRAIS|IBAN|BIC|RIB|SIRET|SIREN|TVA\s+INTRA|CLIENT|ADRESSE|T[ÉE]L|TELEPHONE|PAGE|DATE)(?:\b|$)/i;
  const header=/(?:D[ÉE]SIGNATION|DESCRIPTION|ARTICLE|PRODUIT).*(?:QT[ÉE]|QUANTIT|PRIX|P\.U|MONTANT)/i;
  for(const raw of cleanLines(text)){
    const line=raw.replace(/[|]/g,' ').replace(/\s{2,}/g,' ').trim();
    if(line.length<5||line.length>220||ignored.test(line)||header.test(line))continue;
    const moneyMatches=invoiceMoneyMatches(line);
    if(!moneyMatches.length)continue;
    const firstMoney=moneyMatches[0];
    let prefix=line.slice(0,firstMoney.index).trim().replace(/[;:|]+$/,'').trim();
    if(prefix.length<3)continue;
    const qtyMatch=prefix.match(/(?:^|\s)(\d{1,5}(?:[,.]\d{1,3})?)\s*(?:(PCS?|PI[EÈ]CES?|UNIT[EÉ]S?|U|COLIS|CARTONS?|SACS?|BOITES?|BOUTEILLES?|KG|G|L))?\s*$/i);
    let quantity=null,orderUnit='unité';
    if(qtyMatch){quantity=Number(qtyMatch[1].replace(',','.'));if(!Number.isFinite(quantity)||quantity<=0||quantity>100000)quantity=null;const u=fold(qtyMatch[2]||'');if(/KG/.test(u))orderUnit='kg';else if(/^G$/.test(u))orderUnit='g';else if(/^L$/.test(u))orderUnit='l';else if(/COLIS/.test(u))orderUnit='colis';else if(/CARTON/.test(u))orderUnit='carton';else if(/SAC/.test(u))orderUnit='sac';else if(/BOITE/.test(u))orderUnit='boîte';else if(/BOUTEILLE/.test(u))orderUnit='bouteille';prefix=prefix.slice(0,qtyMatch.index).trim();}
    let supplierReference=null;
    const refMatch=prefix.match(/^([A-Z0-9][A-Z0-9._\/-]{2,24})\s+(.+)$/i);
    if(refMatch&&(/[0-9]/.test(refMatch[1])||/[._\/-]/.test(refMatch[1]))){supplierReference=refMatch[1].slice(0,100);prefix=refMatch[2].trim();}
    const productName=prefix.replace(/^[-–—*•]+/,'').replace(/[-–—*•]+$/,'').trim();
    const letters=(productName.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
    if(productName.length<2||letters<3||/^(?:EUR|EURO|PRIX|MONTANT)$/i.test(productName))continue;
    const amounts=moneyMatches.map(m=>invoiceMoney(m.raw)).filter(v=>v!=null);
    const lineTotal=amounts.at(-1)??null;
    const unitPrice=amounts.length>=2?amounts.at(-2):(quantity&&quantity>1&&lineTotal!=null?Math.round((lineTotal/quantity)*100)/100:lineTotal);
    const confidence=Math.min(98,58+(quantity?14:0)+(supplierReference?8:0)+(amounts.length>=2?14:5));
    rows.push({productName:productName.slice(0,160),supplierReference,invoiceQuantity:quantity||1,orderUnit,unitPriceEuros:unitPrice,lineTotalEuros:lineTotal,confidence,rawText:raw.slice(0,500)});
    if(rows.length>=120)break;
  }
  const seen=new Set();
  return rows.filter(x=>{const key=fold(`${x.supplierReference||''}|${x.productName}`).replace(/[^A-Z0-9|]/g,'');if(!key||seen.has(key))return false;seen.add(key);return true;});
}

export function extractInvoice(text=''){
  const clean=compact(text);
  const total=(clean.match(/(?:TOTAL\s*TTC|TTC\s*TOTAL|NET\s*[ÀA]\s*PAYER)\s*[:€ ]*([0-9]{1,3}(?:[ .][0-9]{3})*[,.][0-9]{2}|[0-9]+[,.][0-9]{2})/i)||[])[1]||null;
  const ht=(clean.match(/(?:TOTAL\s*HT|HT\s*TOTAL)\s*[:€ ]*([0-9]{1,3}(?:[ .][0-9]{3})*[,.][0-9]{2}|[0-9]+[,.][0-9]{2})/i)||[])[1]||null;
  const vat=(clean.match(/(?:TVA)\s*[:€ ]*([0-9]{1,3}(?:[ .][0-9]{3})*[,.][0-9]{2}|[0-9]+[,.][0-9]{2})/i)||[])[1]||null;
  const invoiceNo=(clean.match(/(?:N[°º]\s]*(?:DE\s*)?FACTURE|FACTURE\s*N[°º]?|INVOICE\s*(?:NO|NUMBER)?|FACTURE)\s*[:#-]?\s*([A-Z0-9._\/-]{3,30})/i)||[])[1]||null;
  const lines=cleanLines(text);
  const supplier=lines.find(x=>x.length>2&&x.length<90&&!/FACTURE|INVOICE|TOTAL|TVA|SIRET|SIREN|DATE|CLIENT|ADRESSE|PAGE/i.test(x))||null;
  const items=invoiceLineItems(text);
  const warnings=[];if(!items.length)warnings.push('Aucune ligne produit détectée automatiquement');if(!supplier)warnings.push('Fournisseur à sélectionner');
  return {supplier,totalTtc:invoiceMoney(total),totalHt:invoiceMoney(ht),tvaAmount:invoiceMoney(vat),invoiceNo,invoiceDate:invoiceDate(text),lines:items,lineCount:items.length,warnings};
}
