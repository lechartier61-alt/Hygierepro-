import { createWorker, PSM } from 'tesseract.js';
import { extractTraceability, extractInvoice } from './ocr-parser.js';

let workerPromise=null;
let recognitionQueue=Promise.resolve();
async function getWorker(){
  if(!workerPromise) workerPromise=(async()=>{
    const w=await createWorker(['fra','eng']);
    await w.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1'});
    return w;
  })();
  return workerPromise;
}
function fold(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘`]/g,"'").toUpperCase();}
function cleanLines(text=''){return String(text).replace(/\r/g,'').split(/\n+/).map(x=>x.replace(/[ \t]+/g,' ').trim()).filter(Boolean);}
function mergeText(a='',b=''){const seen=new Set();const rows=[];for(const line of [...cleanLines(a),...cleanLines(b)]){const key=fold(line).replace(/\W/g,'');if(!key||seen.has(key))continue;seen.add(key);rows.push(line);}return rows.join('\n');}
function scannerConfidence(trace,ocrConfidence=0){const vals=Object.values(trace.fieldConfidence||{}).filter(v=>Number(v)>0).map(Number);const fieldAvg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;return Math.round(Math.max(0,Math.min(100,fieldAvg*.75+Number(ocrConfidence||0)*.25)));}
async function recognizeInternal(buffer,{mode='dlc'}={}){
  const w=await getWorker();
  await w.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1'});
  const first=(await w.recognize(buffer,{rotateAuto:true})).data;
  let text=first.text||'';let passes=1;let trace=extractTraceability(text);let invoice=extractInvoice(text);
  const shouldRetry=mode==='invoice' ? (Number(first.confidence||0)<62||(!invoice.totalTtc&&!invoice.invoiceNo)||Number(invoice.lines?.length||0)<2) : (Number(first.confidence||0)<62||!trace.expiryDate||!trace.lot||!trace.product);
  if(shouldRetry){
    await w.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,preserve_interword_spaces:'1'});
    const second=(await w.recognize(buffer,{rotateAuto:true})).data;passes=2;text=mergeText(text,second.text||'');trace=extractTraceability(text);invoice=extractInvoice(text);
    first.confidence=Math.max(Number(first.confidence||0),Number(second.confidence||0));
  }
  const ocrConfidence=Math.round(Number(first.confidence||0));trace.confidence=scannerConfidence(trace,ocrConfidence);
  return {...trace,ocrConfidence,confidence:trace.confidence,invoice,ocrPasses:passes};
}
export function recognize(buffer,options={}){const run=()=>recognizeInternal(buffer,options);const job=recognitionQueue.then(run,run);recognitionQueue=job.catch(()=>{});return job;}
export { extractTraceability, extractInvoice } from './ocr-parser.js';
