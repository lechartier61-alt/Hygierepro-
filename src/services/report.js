import PDFDocument from 'pdfkit';
export function buildHaccpPdf({organization,records,user}){
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margin:42,info:{Title:`Rapport HygieSafe - ${organization.name}`}}); const chunks=[]; doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    doc.fontSize(22).fillColor('#0f5132').text('HygieSafe'); doc.fontSize(15).fillColor('#111').text(`Rapport d’hygiène — ${organization.name}`);doc.moveDown(.4);doc.fontSize(9).fillColor('#666').text(`Généré le ${new Date().toLocaleString('fr-FR')} par ${user.name}. Outil d’aide au suivi du PMS/HACCP : la responsabilité sanitaire reste celle du professionnel.`);doc.moveDown();
    const groups=new Map(); for(const r of records){if(!groups.has(r.type))groups.set(r.type,[]);groups.get(r.type).push(r)}
    const labels={temperature:'Températures',reception:'Réceptions',traceability:'Traçabilité',nonconformity:'Non-conformités',cleaning:'Nettoyages',oil:'Huiles',pest:'Nuisibles',allergen:'Allergènes',document:'Documents',timeclock:'Pointages'};
    for(const [type,rows] of groups){doc.moveDown(.6).fontSize(13).fillColor('#0f5132').text(labels[type]||type);doc.moveDown(.2);rows.slice(0,80).forEach(r=>{doc.fontSize(9).fillColor('#111').text(`• ${new Date(r.occurred_at).toLocaleString('fr-FR')} — ${r.title||'Enregistrement'}${r.status?` [${r.status}]`:''}`);});}
    doc.end();
  });
}
