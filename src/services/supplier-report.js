import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const LOGO_PATH=fileURLToPath(new URL('../../public/assets/icon-192.png',import.meta.url));

const euro=c=>`${(Number(c||0)/100).toFixed(2).replace('.',',')} €`;
const num=v=>Number(v||0).toLocaleString('fr-FR',{maximumFractionDigits:3});
const frDate=d=>new Date(d).toLocaleDateString('fr-FR');
const dayLabels={1:'Lundi',2:'Mardi',3:'Mercredi',4:'Jeudi',5:'Vendredi',6:'Samedi',7:'Dimanche'};

function pdfBuffer(build){
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margin:34,info:{Title:'HygieSafe - Commandes fournisseurs'}});
    const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);build(doc);doc.end();
  });
}
function header(doc,title,organization,user,sub=''){
  const y=doc.y;
  if(fs.existsSync(LOGO_PATH))doc.image(LOGO_PATH,34,y,{width:34,height:34});
  doc.fillColor('#08613A').fontSize(20).font('Helvetica-Bold').text('Hygie',76,y+2,{continued:true});
  doc.fillColor('#203044').text('Pro');
  doc.fillColor('#17221c').fontSize(16).font('Helvetica-Bold').text(title,34,y+47);doc.moveDown(.15);
  doc.font('Helvetica').fontSize(8.5).fillColor('#6a776f').text(`${organization.name} · ${new Date().toLocaleString('fr-FR')} · ${user.name}`);
  if(sub)doc.moveDown(.25).fontSize(8.5).fillColor('#6a776f').text(sub);
  doc.moveDown(.7);
}
function ensure(doc,h=28){if(doc.y+h>doc.page.height-36)doc.addPage();}
function tableHeader(doc,cols){
  ensure(doc,26);const y=doc.y;doc.roundedRect(34,y,527,22,5).fill('#eef5f1');let x=38;doc.fillColor('#4c6256').font('Helvetica-Bold').fontSize(7.6);
  for(const c of cols){doc.text(c.label,x,y+7,{width:c.w-5,ellipsis:true});x+=c.w;}doc.y=y+27;
}
function tableRow(doc,cols,row,index){
  ensure(doc,30);const y=doc.y; if(index%2===1)doc.rect(34,y,527,26).fill('#fafcfb');let x=38;doc.fillColor('#17221c').font('Helvetica').fontSize(8);
  for(const c of cols){doc.text(String(row[c.key]??'—'),x,y+7,{width:c.w-5,height:16,ellipsis:true});x+=c.w;}doc.y=y+28;
}

export function buildSupplierNeedsPdf({organization,user,rows}){
  return pdfBuffer(doc=>{
    header(doc,'Fiche des besoins fournisseurs',organization,user,'Document interne : quantités préparées par l’équipe avant validation du gérant.');
    const positive=rows.filter(r=>Number(r.need_quantity)>0);const total=positive.reduce((s,r)=>s+Number(r.need_quantity||0),0);
    doc.roundedRect(34,doc.y,527,48,8).fill('#f4fbf7');const sy=doc.y;doc.fillColor('#087443').font('Helvetica-Bold').fontSize(18).text(`${positive.length}`,46,sy+9,{width:80});doc.fontSize(8).fillColor('#5e7368').font('Helvetica').text('produits demandés',46,sy+29,{width:110});doc.fillColor('#087443').font('Helvetica-Bold').fontSize(18).text(num(total),190,sy+9,{width:100});doc.fontSize(8).fillColor('#5e7368').font('Helvetica').text('quantité totale',190,sy+29,{width:110});doc.y=sy+60;
    const cols=[{key:'product',label:'Produit',w:145},{key:'supplier',label:'Fournisseur',w:100},{key:'stock',label:'Stock',w:58},{key:'minimum',label:'Mini',w:52},{key:'recommended',label:'Conseil',w:58},{key:'need',label:'À commander',w:70},{key:'unit',label:'Unité',w:44}];tableHeader(doc,cols);
    (positive.length?positive:rows).forEach((r,i)=>tableRow(doc,cols,{product:r.product_name||r.article_title,supplier:r.supplier_name||'Non configuré',stock:num(r.current_stock),minimum:num(r.min_stock),recommended:num(r.recommended_quantity),need:num(r.need_quantity),unit:r.order_unit||r.stock_unit||'unité'},i));
    doc.moveDown(.5);doc.fontSize(8).fillColor('#6a776f').text('Les quantités restent modifiables dans HygieSafe jusqu’à la validation de la commande par le gérant.');
  });
}

export function buildSupplierPreviewPdf({organization,user,supplier,rows}){
  return pdfBuffer(doc=>{
    const days=(supplier.allowed_order_days||[]).map(d=>dayLabels[d]).join(', ')||'Aucun';
    header(doc,`Préparation de commande - ${supplier.name}`,organization,user,`Jours autorisés : ${days}${supplier.cutoff_time?` · heure limite ${String(supplier.cutoff_time).slice(0,5)}`:''}. Ce document n’est pas encore une commande validée.`);
    const cols=[{key:'product',label:'Produit',w:182},{key:'reference',label:'Référence',w:82},{key:'quantity',label:'Qté',w:60},{key:'unit',label:'Unité',w:68},{key:'price',label:'PU estimé',w:68},{key:'total',label:'Total',w:67}];tableHeader(doc,cols);
    let total=0;rows.forEach((r,i)=>{const line=Number(r.need_quantity||0)*Number(r.unit_price_cents||0);total+=line;tableRow(doc,cols,{product:r.product_name||r.article_title,reference:r.supplier_reference||'—',quantity:num(r.need_quantity),unit:r.order_unit||'unité',price:r.unit_price_cents==null?'—':euro(r.unit_price_cents),total:r.unit_price_cents==null?'—':euro(line)},i)});
    doc.moveDown(.5).font('Helvetica-Bold').fontSize(11).fillColor('#17221c').text(`Total estimé : ${euro(total)}`,{align:'right'});
    if(supplier.minimum_order_cents>0)doc.font('Helvetica').fontSize(8.5).fillColor(total>=supplier.minimum_order_cents?'#127143':'#a92f2f').text(`Minimum fournisseur : ${euro(supplier.minimum_order_cents)} ${total>=supplier.minimum_order_cents?'(atteint)':'(non atteint)'}`,{align:'right'});
  });
}

export function buildPurchaseOrderPdf({organization,user,order,supplier,lines}){
  return pdfBuffer(doc=>{
    header(doc,`Bon de commande ${order.order_number}`,organization,user,`Fournisseur : ${supplier.name} · Commande validée le ${frDate(order.submitted_at)}${order.expected_delivery_date?` · Livraison estimée ${frDate(order.expected_delivery_date)}`:''}`);
    if(supplier.email||supplier.phone||supplier.account_number){doc.roundedRect(34,doc.y,527,44,7).fill('#f7faf8');const y=doc.y;doc.font('Helvetica-Bold').fontSize(9).fillColor('#17221c').text(supplier.name,45,y+8);doc.font('Helvetica').fontSize(8).fillColor('#6a776f').text([supplier.email,supplier.phone,supplier.account_number?`Compte : ${supplier.account_number}`:null].filter(Boolean).join(' · '),45,y+24,{width:500});doc.y=y+55;}
    const cols=[{key:'product',label:'Produit',w:170},{key:'reference',label:'Référence',w:80},{key:'quantity',label:'Qté',w:58},{key:'unit',label:'Unité',w:68},{key:'price',label:'PU',w:68},{key:'total',label:'Total',w:83}];tableHeader(doc,cols);
    lines.forEach((l,i)=>tableRow(doc,cols,{product:l.product_name,reference:l.supplier_reference||'—',quantity:num(l.quantity),unit:l.order_unit,price:l.unit_price_cents==null?'—':euro(l.unit_price_cents),total:l.unit_price_cents==null?'—':euro(Number(l.quantity)*Number(l.unit_price_cents))},i));
    doc.moveDown(.5).font('Helvetica-Bold').fontSize(12).fillColor('#087443').text(`Total estimé : ${euro(order.total_estimated_cents)}`,{align:'right'});
    doc.moveDown(.6).font('Helvetica').fontSize(8).fillColor('#6a776f').text('Bon généré par HygieSafe. Vérifiez les quantités, conditionnements et tarifs convenus avec le fournisseur avant envoi.');
  });
}
