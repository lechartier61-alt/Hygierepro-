import { ZipArchive } from 'archiver';
import { q } from '../db.js';
import { usingS3, storedReadStream } from './storage.js';
import { backupDateParts, safeBackupName, isoFileStamp } from '../utils/backup-path.js';
import { csvCell as secureCsvCell } from '../utils/csv.js';
import { APP_VERSION } from '../version.js';

function json(value){return JSON.stringify(value,null,2)+'\n'}
function cleanUser(u){return {id:u.id,email:u.email,name:u.name,role:u.role,avatar_url:u.avatar_url,active:u.active,email_verified:u.email_verified,last_login_at:u.last_login_at,created_at:u.created_at,updated_at:u.updated_at}}
function cleanOrg(o){
  if(!o)return null;
  const {stripe_customer_id,stripe_subscription_id,...rest}=o;
  return rest;
}
function mediaRefs(payload){
  const out=new Set();
  const walk=v=>{
    if(!v)return;
    if(Array.isArray(v)){for(const x of v)walk(x);return;}
    if(typeof v!=='object')return;
    for(const [k,x] of Object.entries(v)){
      if(/mediaid$/i.test(k)&&typeof x==='string')out.add(x);
      else walk(x);
    }
  };
  walk(payload);return [...out];
}
function mimeExt(mime,name=''){
  const known=({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','application/pdf':'.pdf','video/mp4':'.mp4','video/webm':'.webm'})[mime];
  if(known)return known;
  const fromName=String(name).match(/\.[A-Za-z0-9]{1,8}$/)?.[0];
  return fromName?fromName.toLowerCase():'.bin';
}
async function addStoredFile(archive,row,target){
  try{
    const stream=await storedReadStream(row.storage_key);
    archive.append(stream,{name:target});
    return true;
  }catch(e){
    archive.append(`Fichier indisponible au moment de la sauvegarde.\nID media: ${row.id}\nNom: ${row.original_name||''}\nErreur: ${String(e.message||e).slice(0,300)}\n`,{name:`${target}.ERREUR.txt`});
    return false;
  }
}
function csv(rows,columns){return '\ufeff'+[columns.join(';'),...rows.map(r=>columns.map(c=>secureCsvCell(typeof r[c]==='object'&&r[c]!==null?JSON.stringify(r[c]):r[c])).join(';'))].join('\n')+'\n'}

export async function loadBackupData(organizationId){
  const [org,settings,users,schedules,records,media,suppliers,supplierProducts,needs,orders,orderLines,invoiceImports,invoiceLines,scanSessions,scanItems,productMemory,auditRows,payments]=await Promise.all([
    q('SELECT * FROM organizations WHERE id=$1',[organizationId]),
    q('SELECT * FROM organization_settings WHERE organization_id=$1',[organizationId]),
    q(`SELECT id,email,name,role,avatar_url,active,email_verified,last_login_at,created_at,updated_at FROM users WHERE organization_id=$1 ORDER BY created_at`,[organizationId]),
    q(`SELECT s.id,s.user_id,u.name user_name,u.email user_email,s.weekday,s.active,to_char(s.start_time,'HH24:MI') start_time,to_char(s.end_time,'HH24:MI') end_time,s.created_by,s.created_at,s.updated_at FROM employee_schedules s JOIN users u ON u.id=s.user_id WHERE s.organization_id=$1 ORDER BY u.name,s.weekday`,[organizationId]),
    q(`SELECT r.*,cu.name created_by_name,uu.name updated_by_name FROM records r LEFT JOIN users cu ON cu.id=r.created_by LEFT JOIN users uu ON uu.id=r.updated_by WHERE r.organization_id=$1 ORDER BY r.occurred_at,r.created_at`,[organizationId]),
    q(`SELECT m.*,u.name uploaded_by_name FROM media m LEFT JOIN users u ON u.id=m.uploaded_by WHERE m.organization_id=$1 ORDER BY m.created_at`,[organizationId]),
    q(`SELECT * FROM suppliers WHERE organization_id=$1 ORDER BY created_at`,[organizationId]),
    q(`SELECT sp.* FROM supplier_products sp WHERE sp.organization_id=$1 ORDER BY sp.created_at`,[organizationId]),
    q(`SELECT * FROM supplier_order_needs WHERE organization_id=$1 ORDER BY updated_at`,[organizationId]),
    q(`SELECT po.*,s.name supplier_name,u.name prepared_by_name,a.name approved_by_name FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id LEFT JOIN users u ON u.id=po.prepared_by LEFT JOIN users a ON a.id=po.approved_by WHERE po.organization_id=$1 ORDER BY po.submitted_at`,[organizationId]),
    q(`SELECT pol.* FROM purchase_order_lines pol JOIN purchase_orders po ON po.id=pol.order_id WHERE po.organization_id=$1 ORDER BY po.submitted_at,pol.created_at`,[organizationId]),
    q(`SELECT i.*,s.name supplier_name,u.name imported_by_name FROM supplier_invoice_imports i JOIN suppliers s ON s.id=i.supplier_id LEFT JOIN users u ON u.id=i.imported_by WHERE i.organization_id=$1 ORDER BY COALESCE(i.invoice_date,i.created_at::date),i.created_at`,[organizationId]),
    q(`SELECT l.* FROM supplier_invoice_import_lines l JOIN supplier_invoice_imports i ON i.id=l.import_id WHERE i.organization_id=$1 ORDER BY i.created_at,l.sort_order`,[organizationId]),
    q(`SELECT ss.*,s.name supplier_name,po.order_number,i.invoice_number,u.name created_by_name FROM scan_sessions ss LEFT JOIN suppliers s ON s.id=ss.supplier_id LEFT JOIN purchase_orders po ON po.id=ss.purchase_order_id LEFT JOIN supplier_invoice_imports i ON i.id=ss.invoice_import_id LEFT JOIN users u ON u.id=ss.created_by WHERE ss.organization_id=$1 ORDER BY ss.started_at`,[organizationId]),
    q(`SELECT si.* FROM scan_session_items si JOIN scan_sessions ss ON ss.id=si.session_id WHERE si.organization_id=$1 ORDER BY ss.started_at,si.created_at`,[organizationId]),
    q(`SELECT id,barcode,product_name,brand,category,quantity_label,image_url,source,source_url,source_license,source_data,verified_by,first_seen_at,last_seen_at,seen_count,created_at,updated_at FROM organization_product_memory WHERE organization_id=$1 ORDER BY product_name,barcode`,[organizationId]),
    q(`SELECT a.id,a.action,a.entity_type,a.entity_id,a.metadata,a.created_at,COALESCE(u.name,ad.name,'Système') actor FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id LEFT JOIN admin_users ad ON ad.id=a.actor_admin_id WHERE a.organization_id=$1 ORDER BY a.created_at`,[organizationId]),
    q(`SELECT id,stripe_invoice_id,amount_cents,currency,status,paid_at,created_at FROM payments WHERE organization_id=$1 ORDER BY created_at`,[organizationId])
  ]);
  return {organization:cleanOrg(org.rows[0]),settings:settings.rows[0]||null,users:users.rows.map(cleanUser),schedules:schedules.rows,records:records.rows,media:media.rows,suppliers:suppliers.rows,supplierProducts:supplierProducts.rows,needs:needs.rows,orders:orders.rows,orderLines:orderLines.rows,invoiceImports:invoiceImports.rows,invoiceLines:invoiceLines.rows,scanSessions:scanSessions.rows,scanItems:scanItems.rows,productMemory:productMemory.rows,audit:auditRows.rows,payments:payments.rows};
}

export async function streamOrganizationBackup(res,{organizationId,requestedBy}){
  const data=await loadBackupData(organizationId);
  const org=data.organization;if(!org)throw new Error('Entreprise introuvable.');
  const archive=new ZipArchive({zlib:{level:6}});
  const mediaById=new Map(data.media.map(m=>[m.id,m]));
  const includedMedia=new Set();
  const now=new Date();
  const backupName=`HygieSafe-sauvegarde-${safeBackupName(org.slug||org.name,'entreprise')}-${now.toISOString().slice(0,10)}.zip`;
  const stats={records:data.records.length,media:data.media.length,mediaIncluded:0,mediaMissing:0,users:data.users.length,schedules:data.schedules.length,suppliers:data.suppliers.length,orders:data.orders.length,invoices:data.invoiceImports.length,scanSessions:data.scanSessions.length,scanItems:data.scanItems.length,productMemory:data.productMemory.length};

  res.status(200);
  res.setHeader('Content-Type','application/zip');
  res.setHeader('Content-Disposition',`attachment; filename="${backupName}"`);
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  archive.on('warning',e=>console.warn('[backup-warning]',e.message));
  archive.on('error',e=>res.destroy(e));
  res.on('close',()=>{if(!res.writableEnded)archive.abort();});
  archive.pipe(res);

  const readme=`HYGIESAFE — SAUVEGARDE COMPLÈTE\n\nEtablissement : ${org.name}\nSauvegarde créée : ${now.toISOString()}\nDemandée par : ${requestedBy?.name||'Gérant'} (${requestedBy?.email||''})\n\nCette archive est une copie indépendante des données métier de l'établissement au moment du téléchargement.\nLes dossiers annees/ sont classés par année / mois / jour. Chaque journée contient les enregistrements de traçabilité et les photos/documents associés lorsque disponibles.\nLe dossier donnees-completes/ contient aussi des exports JSON/CSV globaux pour consultation ou réimport manuel.\n\nSECURITE : aucun mot de passe, jeton de session, secret 2FA, clé API ou jeton de réinitialisation n'est exporté.\nCONSERVATION : gardez cette archive dans un emplacement sécurisé et sauvegardé (disque externe chiffré, coffre documentaire, stockage cloud professionnel, etc.).\n`;
  archive.append(readme,{name:'LISEZ-MOI.txt'});
  archive.append(json({format:'HygieSafe Backup',formatVersion:1,appVersion:APP_VERSION,createdAt:now.toISOString(),organization:{id:org.id,name:org.name,slug:org.slug},storageSource:usingS3()?'s3':'volume',counts:stats}),{name:'manifest.json'});

  archive.append(json(org),{name:'donnees-completes/etablissement.json'});
  archive.append(json(data.settings),{name:'donnees-completes/parametres.json'});
  archive.append(json(data.users),{name:'donnees-completes/equipe.json'});
  archive.append(json(data.schedules),{name:'donnees-completes/horaires-equipe.json'});
  archive.append(json(data.records),{name:'donnees-completes/tracabilite.json'});
  archive.append(csv(data.records,['id','type','title','status','occurred_at','payload','created_by_name','updated_by_name','created_at','updated_at']),{name:'donnees-completes/tracabilite.csv'});
  archive.append(json(data.suppliers),{name:'donnees-completes/fournisseurs.json'});
  archive.append(json(data.supplierProducts),{name:'donnees-completes/produits-fournisseurs.json'});
  archive.append(json(data.needs),{name:'donnees-completes/besoins-commandes.json'});
  archive.append(json(data.orders),{name:'donnees-completes/commandes.json'});
  archive.append(json(data.orderLines),{name:'donnees-completes/lignes-commandes.json'});
  archive.append(json(data.invoiceImports),{name:'donnees-completes/factures-importees.json'});
  archive.append(json(data.invoiceLines),{name:'donnees-completes/lignes-factures.json'});
  archive.append(json(data.scanSessions),{name:'donnees-completes/sessions-scanner.json'});
  archive.append(json(data.scanItems),{name:'donnees-completes/lignes-scanner.json'});
  archive.append(json(data.productMemory),{name:'donnees-completes/catalogue-produits-memorises.json'});
  archive.append(json(data.audit),{name:'donnees-completes/journal-activite.json'});
  archive.append(json(data.payments),{name:'donnees-completes/facturation-resume.json'});
  archive.append(json(data.media.map(({storage_key,...m})=>m)),{name:'donnees-completes/index-photos-documents.json'});

  for(const record of data.records){
    const date=backupDateParts(record.occurred_at||record.created_at);const type=safeBackupName(record.type,'traceabilite');const stamp=isoFileStamp(record.occurred_at||record.created_at);
    const base=`${date.path}/${type}/${stamp}_${safeBackupName(record.title||record.id,'enregistrement')}_${record.id}`;
    archive.append(json(record),{name:`${base}/fiche.json`});
    for(const id of mediaRefs(record.payload)){
      const m=mediaById.get(id);if(!m)continue;
      const ext=mimeExt(m.mime_type,m.original_name);const fileName=safeBackupName(String(m.original_name||`media-${m.id}`).replace(/\.[^.]+$/,''),`media-${m.id}`)+ext;
      const wasIncluded=includedMedia.has(m.id);const ok=await addStoredFile(archive,m,`${base}/photos-documents/${fileName}`);includedMedia.add(m.id);if(!wasIncluded)stats.mediaIncluded++;if(!ok)stats.mediaMissing++;
      const {storage_key:_storageKey,...metadata}=m;archive.append(json(metadata),{name:`${base}/photos-documents/${fileName}.metadata.json`});
    }
  }

  const invoiceLinesByImport=new Map();for(const l of data.invoiceLines){if(!invoiceLinesByImport.has(l.import_id))invoiceLinesByImport.set(l.import_id,[]);invoiceLinesByImport.get(l.import_id).push(l)}
  for(const inv of data.invoiceImports){
    const date=backupDateParts(inv.invoice_date||inv.created_at);const base=`${date.path}/factures-fournisseurs/${safeBackupName(inv.supplier_name,'fournisseur')}/${safeBackupName(inv.invoice_number||inv.id,'facture')}`;
    archive.append(json({...inv,lines:invoiceLinesByImport.get(inv.id)||[]}),{name:`${base}/facture.json`});
    if(inv.source_media_id){const m=mediaById.get(inv.source_media_id);if(m){const ext=mimeExt(m.mime_type,m.original_name);const fileName=safeBackupName(String(m.original_name||`facture-${m.id}`).replace(/\.[^.]+$/,''),`facture-${m.id}`)+ext;const wasIncluded=includedMedia.has(m.id);const ok=await addStoredFile(archive,m,`${base}/${fileName}`);includedMedia.add(m.id);if(!wasIncluded)stats.mediaIncluded++;if(!ok)stats.mediaMissing++;}}
  }

  for(const m of data.media){
    if(includedMedia.has(m.id))continue;
    const date=backupDateParts(m.created_at);const ext=mimeExt(m.mime_type,m.original_name);const fileName=`${isoFileStamp(m.created_at)}_${safeBackupName(String(m.original_name||m.id).replace(/\.[^.]+$/,''),m.id)}${ext}`;
    const ok=await addStoredFile(archive,m,`${date.path}/photos-documents-non-rattaches/${safeBackupName(m.kind,'document')}/${fileName}`);includedMedia.add(m.id);stats.mediaIncluded++;if(!ok)stats.mediaMissing++;
  }

  archive.append(json({...stats,generatedAt:new Date().toISOString()}),{name:'controle-sauvegarde.json'});
  await archive.finalize();
  return {backupName,stats};
}
