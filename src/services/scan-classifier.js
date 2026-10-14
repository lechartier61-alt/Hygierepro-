function fold(v=''){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function clamp(n,min=0,max=100){return Math.max(min,Math.min(max,Math.round(n)))}
export function classifyScan(ocr={}){
  const text=fold(ocr.rawText||ocr.text||'');
  const invoice=ocr.invoice||{};
  const scores={invoice:0,delivery_note:0,product_label:0,product_barcode:0,document:0,photo:0};
  const reasons=[];
  const lineCount=Number(invoice.lineCount||invoice.lines?.length||0);
  const hasInvoiceWord=/\bFACTURE\b|\bINVOICE\b/.test(text);
  const hasDelivery=/BON\s+DE\s+LIVRAISON|DELIVERY\s+NOTE|BL\s*N[°O]?/.test(text);
  const hasMoney=/\bTTC\b|\bTVA\b|\bTOTAL\s+HT\b|NET\s+A\s+PAYER/.test(text);
  const hasTrace=/\bDLC\b|\bDDM\b|USE\s*BY|BEST\s*BEFORE|\bLOT\b|\bBATCH\b|EXPIR/.test(text);
  const barcode=String(ocr.barcode||'').replace(/\D/g,'');
  const textLen=text.replace(/\s/g,'').length;

  if(hasInvoiceWord){scores.invoice+=34;reasons.push('mot-clé facture')}
  if(invoice.invoiceNo)scores.invoice+=18;
  if(invoice.totalTtc!=null||invoice.totalHt!=null)scores.invoice+=22;
  if(hasMoney)scores.invoice+=14;
  scores.invoice+=Math.min(24,lineCount*5);

  if(hasDelivery){scores.delivery_note+=48;reasons.push('bon de livraison')}
  if(hasDelivery&&lineCount)scores.delivery_note+=Math.min(28,lineCount*5);
  if(hasDelivery&&!hasMoney)scores.delivery_note+=12;

  if(hasTrace){scores.product_label+=28;reasons.push('DLC/DDM/lot')}
  if(ocr.expiryDate||ocr.date)scores.product_label+=24;
  if(ocr.lot)scores.product_label+=20;
  if(ocr.product)scores.product_label+=12;
  if(barcode.length>=8&&barcode.length<=14)scores.product_label+=12;

  if(barcode.length>=8&&barcode.length<=14){scores.product_barcode+=52;reasons.push('code-barres')}
  if(barcode&&textLen<90)scores.product_barcode+=22;
  if(barcode&&!ocr.expiryDate&&!ocr.lot)scores.product_barcode+=12;

  if(textLen>=45)scores.document+=26;
  if(textLen>=150)scores.document+=18;
  if(!hasInvoiceWord&&!hasDelivery&&!hasTrace&&textLen>=45)scores.document+=18;
  if(textLen<28&&!barcode){scores.photo=72;reasons.push('très peu de texte')}
  else if(textLen<55&&!barcode)scores.photo=45;

  // Une vraie facture doit gagner face à un simple code-barres imprimé sur la page.
  if(scores.invoice>=65)scores.product_barcode=Math.min(scores.product_barcode,45);
  if(scores.delivery_note>=65)scores.product_barcode=Math.min(scores.product_barcode,42);

  const entries=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  let [type,top]=entries[0];const second=entries[1]?.[1]||0;
  if(top<35){type=textLen<35?'photo':'document';top=scores[type]||40}
  const gap=Math.max(0,top-second);
  const confidence=clamp(Math.min(98,top*.78+gap*.55+8));
  return {type,confidence,scores:Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,clamp(v)])),reasons,requiresConfirmation:confidence<65};
}
