const GS='\u001d';
const fixedLengths={
  '00':18,'01':14,'02':14,'11':6,'12':6,'13':6,'15':6,'16':6,'17':6,'20':2,
  '410':13,'411':13,'412':13,'413':13,'414':13,'415':13,'416':13,'417':13
};
const variableMax={10:20,21:20,22:29,30:8,37:8,240:30,241:30,242:6,243:20,250:30,251:30,400:30,401:30,403:30,420:20,421:15};
function isoGs1Date(v=''){
  if(!/^\d{6}$/.test(v))return null;
  const yy=Number(v.slice(0,2)),m=Number(v.slice(2,4)),d=Number(v.slice(4,6)),y=2000+yy;
  if(m<1||m>12||d<1||d>31)return null;
  const dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function cleanRaw(raw=''){
  return String(raw).trim().replace(/\u001d/g,GS).replace(/^]d2/i,'').replace(/^]C1/i,'');
}
function parseParenthesized(raw){
  const fields=[];const re=/\((\d{2,4})\)([^()]*)/g;let m;
  while((m=re.exec(raw)))fields.push({ai:m[1],value:m[2].trim()});
  return fields;
}
function knownAiAt(s,pos){
  const tries=[4,3,2];
  for(const len of tries){const ai=s.slice(pos,pos+len);if(fixedLengths[ai]!=null||variableMax[ai]!=null||/^310\d$/.test(ai)||/^320\d$/.test(ai))return ai;}
  return null;
}
function parseCompact(raw){
  const s=cleanRaw(raw);const fields=[];let i=0;
  while(i<s.length){if(s[i]===GS){i++;continue}const ai=knownAiAt(s,i);if(!ai)break;i+=ai.length;
    let value='';
    if(/^31[02]\d$/.test(ai)){value=s.slice(i,i+6);i+=value.length;}
    else if(fixedLengths[ai]!=null){value=s.slice(i,i+fixedLengths[ai]);i+=value.length;}
    else{
      const max=variableMax[ai]||30;let end=s.indexOf(GS,i);
      if(end<0){end=Math.min(s.length,i+max);for(let p=i+1;p<Math.min(s.length,i+max);p++){if(knownAiAt(s,p)){end=p;break}}}
      value=s.slice(i,end);i=end;
    }
    if(value)fields.push({ai,value});
  }
  return fields;
}
function normalizeGtin(v=''){const d=String(v).replace(/\D/g,'');return d.length===14?d:d.padStart(14,'0')}
export function parseGs1(raw=''){
  const original=String(raw).trim();const value=cleanRaw(raw);if(!value)return {isGs1:false,raw:value,fields:[]};
  if(/^\d{8}$|^\d{12,14}$/.test(original))return {isGs1:false,raw:value,fields:[]};
  const fields=value.includes('(')?parseParenthesized(value):parseCompact(value);
  if(!fields.length)return {isGs1:false,raw:value,fields:[]};
  const by=Object.fromEntries(fields.map(x=>[x.ai,x.value]));
  const gtin=by['01']?normalizeGtin(by['01']):null;
  const expiryDate=isoGs1Date(by['17']||by['15']||'');
  const productionDate=isoGs1Date(by['11']||'');
  const lot=by['10']||null;
  const serial=by['21']||null;
  const quantity=by['30']||by['37']?Number(by['30']||by['37']):null;
  let weightKg=null;
  for(const {ai,value:v} of fields){if(/^310\d$/.test(ai)&&/^\d{6}$/.test(v)){const decimals=Number(ai.at(-1));weightKg=Number(v)/(10**decimals);break}}
  const dateType=by['17']?'dlc':by['15']?'ddm':expiryDate?'expiry':'unknown';
  return {isGs1:!!(gtin||lot||expiryDate||serial),raw:value,fields,gtin,barcode:gtin,lot,expiryDate,dateType,productionDate,serial,quantity:Number.isFinite(quantity)&&quantity>0?quantity:null,weightKg};
}
export { isoGs1Date };
