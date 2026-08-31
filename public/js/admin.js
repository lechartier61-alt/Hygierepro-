const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const adminIcon=n=>`<img class="hs-nav-icon" src="/assets/hygiesafe-icons/${n}.png" alt="">`;
let csrf='',me=null,siteSettings=null,orgData=[],userData=[],incidentData=[],auditData=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>d?new Date(d).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'—';
const date=d=>d?new Date(d).toLocaleDateString('fr-FR'):'—';
const money=c=>(Number(c||0)/100).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const bytes=n=>{n=Number(n||0);return n<1024?n+' o':n<1048576?(n/1024).toFixed(1)+' Ko':n<1073741824?(n/1048576).toFixed(1)+' Mo':(n/1073741824).toFixed(2)+' Go'};
const ago=d=>{if(!d)return'Jamais';const ms=Date.now()-new Date(d).getTime(),m=Math.floor(ms/60000);if(m<1)return'À l’instant';if(m<60)return`Il y a ${m} min`;const h=Math.floor(m/60);if(h<24)return`Il y a ${h} h`;const j=Math.floor(h/24);return`Il y a ${j} j`};
const badge=(text,tone='')=>`<span class="badge ${tone}">${esc(text)}</span>`;
const statusTone=s=>['active','paid','verified','resolved'].includes(s)?'green':['past_due','trialing','paused','warning'].includes(s)?'amber':['suspended','unpaid','canceled','open','disabled'].includes(s)?'red':'';
const roleLabel=r=>({owner:'Gérant',manager:'Responsable',employee:'Employé'})[r]||r;
const subLabel=s=>({trialing:'Essai',active:'Abonné',past_due:'Paiement en retard',unpaid:'Impayé',canceled:'Résilié',paused:'En pause'})[s]||s;
const typeLabel=t=>({temperature:'Températures',reception:'Réceptions',inventory:'Inventaire',traceability:'Traçabilité',nonconformity:'Non-conformités',equipment:'Équipements',task:'Tâches',timeclock:'Pointage',document:'Documents',oil:'Huiles',pest:'Nuisibles',allergen:'Allergènes',cleaning:'Nettoyage',stock_article:'Articles stock',stock_operation:'Mouvements stock',opened_product:'Produits ouverts',supplier_lot:'Lots fournisseurs'})[t]||t;

async function api(path,{method='GET',body,form=false}={}){
  const o={method,headers:{}};
  if(!['GET','HEAD'].includes(method)&&csrf)o.headers['X-CSRF-Token']=csrf;
  if(body!==undefined){if(form)o.body=body;else{o.headers['Content-Type']='application/json';o.body=JSON.stringify(body)}}
  const r=await fetch(path,o),d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d.error||'Erreur');e.code=d.code;e.status=r.status;throw e}return d;
}
function modal(title,html){$('#adminModalTitle').textContent=title;$('#adminModalBody').innerHTML=html;$('#adminModal').classList.remove('hidden')}
function closeModal(){$('#adminModal').classList.add('hidden')}
$('#adminModalClose').onclick=closeModal;

function kpis(items){return items.map(x=>`<div class="kpi ${x.tone||''}"><div class="kpi-label">${x.icon?adminIcon(x.icon):''}<small>${esc(x.label)}</small></div><b>${esc(x.value)}</b>${x.note?`<em>${esc(x.note)}</em>`:''}</div>`).join('')}
function statRows(items){return items.map(x=>`<div class="admin-stat-row"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('')}
function infoRows(items){return items.map(x=>`<div class="admin-info"><small>${esc(x[0])}</small><b>${esc(x[1])}</b></div>`).join('')}
function tinyBars(rows,valueKey,labelFn){
  const max=Math.max(1,...rows.map(x=>Number(x[valueKey]||0)));
  return rows.length?rows.map(x=>`<div class="admin-bar-row"><span>${esc(labelFn(x))}</span><div class="admin-bar-track"><i style="width:${Math.max(2,Math.round(Number(x[valueKey]||0)/max*100))}%"></i></div><b>${esc(x[valueKey]||0)}</b></div>`).join(''):'<div class="empty">Aucune donnée.</div>';
}

function showApp(){
  $('#adminLogin').classList.add('hidden');$('#adminApp').classList.remove('hidden');$('#adminName').textContent=me.admin.name;
  $$('[data-admin-page]').forEach(b=>b.onclick=()=>go(b.dataset.adminPage));
  $$('[data-admin-jump]').forEach(b=>b.onclick=()=>go(b.dataset.adminJump));
  $('#adminMobileNav').onchange=e=>go(e.target.value);
  $('#adminLogout').onclick=logout;
  $('#refreshDashboard').onclick=loadDashboard;$('#refreshOrgs').onclick=loadOrganizations;$('#createDemoAccount').onclick=openDemoAccount;
  $('#refreshUsers').onclick=loadUsers;$('#refreshBilling').onclick=loadBilling;$('#refreshUsage').onclick=loadUsage;$('#refreshSystem').onclick=loadSystem;
  $('#refreshIncidents').onclick=loadIncidents;$('#refreshAudit').onclick=loadAudit;$('#newPromo').onclick=newPromo;
  $('#orgSearch').oninput=renderOrganizations;$('#orgFilter').onchange=renderOrganizations;
  $('#userSearch').oninput=renderUsers;$('#userFilter').onchange=renderUsers;
  $('#incidentSearch').oninput=renderIncidents;$('#incidentFilter').onchange=renderIncidents;
  $('#auditSearch').oninput=renderAudit;
  $('#siteForm').onsubmit=saveSite;$('#heroUploadForm').onsubmit=uploadHero;$('#legalAdminForm').onsubmit=saveLegal;
  go('dashboard');
}
function go(p){
  const labels={dashboard:'Vue globale',organizations:'Entreprises',users:'Utilisateurs',billing:'Abonnements & CA',usage:'Utilisation',promos:'Codes promo',site:'Site public',incidents:'Incidents',system:'État du système',audit:'Journal d’activité'};
  $$('#adminApp .page').forEach(x=>x.classList.toggle('on',x.id===`admin-${p}`));$$('[data-admin-page]').forEach(x=>x.classList.toggle('on',x.dataset.adminPage===p));
  if($('#adminCurrentPage'))$('#adminCurrentPage').textContent=labels[p]||'Administration';
  if($('#adminMobileNav'))$('#adminMobileNav').value=p;
  window.scrollTo({top:0,behavior:'smooth'});
  ({dashboard:loadDashboard,organizations:loadOrganizations,users:loadUsers,billing:loadBilling,usage:loadUsage,system:loadSystem,promos:loadPromos,site:loadSite,incidents:loadIncidents,audit:loadAudit}[p]||(()=>{}))().catch(err=>alert(err.message));
}
async function adminStatus(){try{return await api('/api/admin/auth/status')}catch{return null}}
function adminConfigMessage(status){
  const msg=$('#adminLoginMsg');if(!msg)return;
  if(status&&!status.initialized){msg.textContent='Aucun compte administrateur n’est encore initialisé. Ajoutez ADMIN_EMAIL et ADMIN_PASSWORD dans Railway puis redéployez : le premier admin sera créé automatiquement.';msg.className='form-msg err';return}
  if(status&&status.initialized&&!status.active){msg.textContent='Le compte administrateur existe mais il est désactivé. Réactivez-le explicitement avec npm run seed:admin.';msg.className='form-msg err';return}
  if(status&&status.initialized&&!status.twoFactorReady){msg.textContent='Compte admin détecté. Avant la première connexion, ajoutez FIELD_ENCRYPTION_KEY (32 caractères minimum) dans Railway pour activer la double authentification.';msg.className='form-msg err'}
}
async function boot(){
  const status=await adminStatus();adminConfigMessage(status);
  try{me=await api('/api/admin/me');csrf=me.csrf;if(!me.admin.totpEnabled)return await setup2fa();showApp()}catch{}
}
$('#adminLoginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),btn=e.currentTarget.querySelector('button[type="submit"],button');btn.disabled=true;try{const d=await api('/api/admin/auth/login',{method:'POST',body:{email:f.get('email'),password:f.get('password'),code:f.get('code')||undefined}});csrf=d.csrf;me=await api('/api/admin/me');if(d.needs2faSetup||!me.admin.totpEnabled)await setup2fa();else showApp()}catch(err){let text=err.message;if(err.code==='totp_required')text='Entrez le code à 6 chiffres de votre application d’authentification.';if(err.code==='field_encryption_key_missing')text='Connexion correcte, mais FIELD_ENCRYPTION_KEY manque dans Railway. Ajoutez une clé aléatoire d’au moins 32 caractères puis redéployez.';$('#adminLoginMsg').textContent=text;$('#adminLoginMsg').className='form-msg err'}finally{btn.disabled=false}};
async function setup2fa(){
  try{
    const d=await api('/api/admin/2fa/setup',{method:'POST',body:{}});$('#adminLogin').classList.add('hidden');modal('Sécuriser l’administration',`<div class="admin-note"><b>2FA obligatoire.</b> Scannez ce QR avec votre application d’authentification.</div><img src="${d.qr}" style="width:220px;display:block;margin:18px auto;max-width:100%"><div class="field"><label>Code à 6 chiffres</label><input id="totpCode" inputmode="numeric" autocomplete="one-time-code"></div><div class="form-msg" id="totpSetupMsg"></div><button class="btn primary" id="enable2fa">Activer la 2FA</button>`);
    $('#enable2fa').onclick=async()=>{try{await api('/api/admin/2fa/enable',{method:'POST',body:{code:$('#totpCode').value.trim()}});me=await api('/api/admin/me');closeModal();showApp()}catch(err){$('#totpSetupMsg').textContent=err.message;$('#totpSetupMsg').className='form-msg err'}}
  }catch(err){
    $('#adminLogin').classList.remove('hidden');const msg=$('#adminLoginMsg');msg.textContent=err.code==='field_encryption_key_missing'?'Ton identifiant et ton mot de passe sont corrects, mais la sécurité 2FA ne peut pas être initialisée : ajoute FIELD_ENCRYPTION_KEY dans Railway (32 caractères minimum), puis redéploie.':err.message;msg.className='form-msg err';throw err
  }
}
async function logout(){await api('/api/admin/auth/logout',{method:'POST',body:{}}).catch(()=>{});location.href='/admin.html'}

async function loadDashboard(){
  const d=await api('/api/admin/dashboard');
  $('#adminLiveStrip').innerHTML=`<div><span class="live-dot"></span><b>${d.sessions.online_users} utilisateur(s) actif(s) maintenant</b></div><span>${d.sessions.active_sessions} session(s) ouvertes</span><span>${d.organizations.created_7d} nouvelle(s) entreprise(s) / 7j</span><span>${d.records.last_7d} action(s) métier / 7j</span>`;
  $('#adminKpis').innerHTML=kpis([
    {icon:'inventory',label:'Entreprises',value:d.organizations.total,note:`${d.organizations.active} actives`},
    {icon:'team',label:'Utilisateurs',value:d.users.total,note:`${d.users.active} actifs`},
    {icon:'orders',label:'MRR',value:money(d.organizations.mrr),note:`${d.organizations.paid} abonnés`},
    {icon:'orders',label:'CA encaissé',value:money(d.payments.revenue),note:`${money(d.payments.revenue_month)} ce mois`},
    {icon:'profile',label:'Essais actifs',value:d.organizations.trials,note:`${d.organizations.onboarding_incomplete} configurations incomplètes`},
    {icon:'controls',label:'Incidents ouverts',value:d.incidents.open,note:`${d.incidents.last_24h} sur 24h`,tone:d.incidents.open?'warn':''}
  ]);
  const pr=[];
  if(d.incidents.open)pr.push(['controls',`${d.incidents.open} incident(s) technique(s) ouvert(s)`,'incidents']);
  if(d.organizations.past_due)pr.push(['orders',`${d.organizations.past_due} abonnement(s) en retard de paiement`,'billing']);
  if(d.organizations.billing_attention)pr.push(['orders',`${d.organizations.billing_attention} abonnement(s) impayé(s), en pause ou résilié(s)`,'billing']);
  if(d.users.unverified)pr.push(['profile',`${d.users.unverified} compte(s) e-mail non vérifié(s)`,'users']);
  if(d.organizations.inactive_14d)pr.push(['schedule',`${d.organizations.inactive_14d} entreprise(s) inactive(s) depuis plus de 14 jours`,'organizations']);
  if(d.security.active_rate_limits)pr.push(['controls',`${d.security.active_rate_limits} limitation(s) de sécurité active(s)`,'system']);
  $('#adminPriorities').innerHTML=pr.length?pr.map(([i,x,page])=>`<button class="item admin-clickable" data-priority-page="${page}"><b class="control-kind">${adminIcon(i)}${esc(x)}</b><span>Voir →</span></button>`).join(''):'<div class="empty"><b>Tout va bien</b><small>Aucune alerte importante à traiter.</small></div>';$$('[data-priority-page]').forEach(b=>b.onclick=()=>go(b.dataset.priorityPage));
  $('#adminRecent').innerHTML=d.recent.slice(0,9).map(x=>`<button class="item admin-clickable" data-dashboard-org="${x.id}"><div class="item-main"><b>${esc(x.name)}</b><small>${ago(x.last_activity_at)} · ${x.activity_7d} action(s) / 7j · ${x.users} utilisateur(s)</small></div>${badge(subLabel(x.subscription_status),statusTone(x.subscription_status))}</button>`).join('');
  $$('[data-dashboard-org]').forEach(b=>b.onclick=()=>openOrgDetail(b.dataset.dashboardOrg));
  $('#adminUserSummary').innerHTML=statRows([['Actifs',d.users.active],['E-mails vérifiés',d.users.verified],['Gérants',d.users.owners],['Responsables',d.users.managers],['Employés',d.users.employees],['Connectés sur 24 h',d.users.logged_24h],['Nouveaux sur 7 j',d.users.created_7d]]);
  $('#adminUsageSummary').innerHTML=statRows([['Aujourd’hui',d.records.today],['7 derniers jours',d.records.last_7d],['30 derniers jours',d.records.last_30d],['Températures',d.records.temperatures],['Réceptions',d.records.receptions],['Traçabilité',d.records.traceability],['Non-conformités',d.records.nonconformities]]);
  $('#adminCommerceSummary').innerHTML=statRows([['Fournisseurs actifs',d.commerce.suppliers],['Produits liés',d.commerce.supplier_products],['Commandes',d.commerce.purchase_orders],['Commandes / 30 j',d.commerce.orders_30d],['Factures importées',d.commerce.invoices],['Factures / 30 j',d.commerce.invoices_30d]]);
  $('#adminVersions').innerHTML=d.versions.map(x=>`<div class="item"><b>${esc(x.app_version)}</b><span>${x.organizations} entreprise(s)</span></div>`).join('');
  $('#adminSecuritySummary').innerHTML=statRows([['Fichiers',d.storage.files],['Images',d.storage.images],['Stockage total',bytes(d.storage.bytes)],['Sessions actives',d.sessions.active_sessions],['Utilisateurs actifs < 15 min',d.sessions.online_users],['Vérifications e-mail en attente',d.security.pending_email_verifications],['Réinitialisations mot de passe actives',d.security.active_password_resets],['Événements Stripe / 24 h',d.security.stripe_events_24h]]);
}

async function loadOrganizations(){orgData=await api('/api/admin/organizations');renderOrganizations()}
function renderOrganizations(){
  const qx=$('#orgSearch').value.trim().toLowerCase(),f=$('#orgFilter').value,now=Date.now();
  const rows=orgData.filter(o=>{
    const text=[o.name,o.owner_name,o.owner_email,o.city,o.business_type].join(' ').toLowerCase();if(qx&&!text.includes(qx))return false;
    if(f==='all')return true;if(f==='active')return o.status==='active';if(f==='trialing')return o.subscription_status==='trialing';if(f==='active-sub')return o.subscription_status==='active';if(f==='past_due')return o.subscription_status==='past_due';if(f==='suspended')return o.status==='suspended';if(f==='inactive')return now-new Date(o.last_activity_at).getTime()>14*86400000;return true;
  });
  $('#orgCount').textContent=`${rows.length} / ${orgData.length}`;
  $('#orgRows').innerHTML=rows.map(o=>`<tr><td><b>${esc(o.name)}</b><br><small>${esc(o.business_type)}${o.city?' · '+esc(o.city):''}<br>Créée le ${date(o.created_at)}</small></td><td>${esc(o.owner_name||'—')}<br><small>${esc(o.owner_email||'')}<br>${o.owner_last_login_at?'Connexion '+ago(o.owner_last_login_at):'Jamais connecté'}</small></td><td><b>${o.users_count}</b><br><small>${o.active_users_count} actifs · ${o.verified_users_count} vérifiés</small></td><td>${ago(o.last_activity_at)}<br><small>${o.records_7d} actions / 7j · ${o.records_count} total</small></td><td>${bytes(o.storage_bytes)}<br><small>${o.suppliers_count} fournisseurs · ${o.orders_count} commandes · ${o.invoices_count} factures</small></td><td>${badge(subLabel(o.subscription_status),statusTone(o.subscription_status))}<br><small>${o.subscription_status==='trialing'?'Fin essai '+date(o.trial_ends_at):money(o.monthly_amount_cents)+'/mois'}</small></td><td><b>${money(o.revenue_cents)}</b></td><td>${esc(o.app_version)}<br><small>${o.onboarding_completed?'Onboarding OK':'Onboarding '+o.onboarding_step}</small></td><td><button class="small-btn" data-org-detail="${o.id}">Voir tout</button></td></tr>`).join('');
  $$('[data-org-detail]').forEach(b=>b.onclick=()=>openOrgDetail(b.dataset.orgDetail));
}
async function openOrgDetail(id){
  modal('Chargement…','<div class="empty">Récupération des informations complètes.</div>');
  try{
    const d=await api(`/api/admin/organizations/${id}/detail`),o=d.organization;
    const paid=d.payments.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount_cents||0),0);
    modal(o.name,`<div class="admin-detail-hero"><div><b>${esc(o.name)}</b><small>${esc(o.business_type)} · ${esc(o.city||'Ville non renseignée')} · créée le ${date(o.created_at)}</small></div>${badge(subLabel(o.subscription_status),statusTone(o.subscription_status))}</div>
      <div class="admin-detail-grid">
        <div class="card"><h3>Entreprise</h3>${infoRows([['Identifiant',o.id],['Statut',o.status],['Adresse',[o.address,o.postal_code,o.city].filter(Boolean).join(' ')||'Non renseignée'],['Téléphone',o.phone||'Non renseigné'],['Fuseau',o.timezone||'Europe/Paris'],['Dernière activité',fmt(o.last_activity_at)],['Version',o.app_version],['Onboarding',o.onboarding_completed?'Terminé':`Étape ${o.onboarding_step}`]])}</div>
        <div class="card"><h3>Abonnement</h3>${infoRows([['Statut',subLabel(o.subscription_status)],['Mensualité',money(o.monthly_amount_cents)],['Début essai',date(o.trial_started_at)],['Fin essai',date(o.trial_ends_at)],['Fin période',date(o.current_period_end)],['Code promo',o.promo_code||'Aucun'],['Client Stripe',o.stripe_customer_id?'Configuré':'Non'],['Abonnement Stripe',o.stripe_subscription_id?'Configuré':'Non'],['Paiements affichés',d.payments.length],['Total encaissé (historique visible)',money(paid)]])}</div>
        <div class="card"><h3>Données & modules</h3>${infoRows([['Stockage',bytes(o.storage_bytes)],['Fichiers',o.media_count],['Fournisseurs',d.commerce.suppliers],['Produits fournisseur',d.commerce.supplier_products],['Commandes',d.commerce.orders],['Commandes / 30j',d.commerce.orders_30d],['Valeur commandes',money(d.commerce.order_value_cents)],['Factures importées',d.commerce.invoices],['Total TTC factures',money(d.commerce.invoice_total_cents)],['Employés planifiés',d.schedules.scheduled_users]])}</div>
        <div class="card"><h3>Enregistrements</h3><div class="admin-stat-list">${d.recordTypes.length?d.recordTypes.map(x=>`<div class="admin-stat-row"><span>${esc(typeLabel(x.type))}<small>${fmt(x.last_at)}</small></span><b>${x.count}</b></div>`).join(''):'<div class="empty">Aucun enregistrement.</div>'}</div></div>
      </div>
      <div class="card"><h3>Utilisateurs (${d.users.length})</h3><div class="table-wrap"><table><thead><tr><th>Nom</th><th>Rôle</th><th>E-mail</th><th>Vérifié</th><th>Dernière connexion</th><th>Dernière activité</th><th>Sessions</th></tr></thead><tbody>${d.users.map(u=>`<tr><td><b>${esc(u.name)}</b></td><td>${esc(roleLabel(u.role))}</td><td>${esc(u.email)}</td><td>${u.email_verified?badge('Oui','green'):badge('Non','amber')}</td><td>${fmt(u.last_login_at)}</td><td>${fmt(u.last_seen_at)}</td><td>${u.active_sessions}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="admin-detail-grid"><div class="card"><h3>Derniers enregistrements</h3><div class="list">${d.recentRecords.length?d.recentRecords.map(x=>`<div class="item"><div class="item-main"><b>${esc(typeLabel(x.type))}${x.title?' · '+esc(x.title):''}</b><small>${fmt(x.occurred_at)} · ${esc(x.status)}</small></div></div>`).join(''):'<div class="empty">Aucun.</div>'}</div></div><div class="card"><h3>Dernière activité audit</h3><div class="list">${d.audits.length?d.audits.slice(0,12).map(a=>`<div class="item"><div class="item-main"><b>${esc(a.action)}</b><small>${esc(a.actor)} · ${fmt(a.created_at)}</small></div></div>`).join(''):'<div class="empty">Aucune.</div>'}</div></div></div>
      <div class="admin-actions sticky-actions"><button class="btn" id="toggleOrg">${o.status==='active'?'Suspendre':'Réactiver'}</button><button class="btn danger" id="deleteOrgAdmin">Supprimer définitivement</button></div>`);
    $('#toggleOrg').onclick=async()=>{await api('/api/admin/organizations/'+o.id,{method:'PATCH',body:{status:o.status==='active'?'suspended':'active'}});closeModal();await loadOrganizations()};
    $('#deleteOrgAdmin').onclick=()=>confirmDeleteOrg(o);
  }catch(e){modal('Erreur',`<div class="admin-note">${esc(e.message)}</div>`)}
}
function confirmDeleteOrg(o){modal('Suppression définitive',`<div class="admin-note">Double confirmation requise. Cette action supprime l’entreprise et ses données.</div><form id="adminDeleteOrgForm"><div class="field"><label>Mot de passe administrateur</label><input name="adminPassword" type="password" required></div><div class="field"><label>Écrivez SUPPRIMER</label><input name="confirmation" required></div><button class="btn danger">Supprimer définitivement</button></form>`);$('#adminDeleteOrgForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await api('/api/admin/organizations/'+o.id,{method:'DELETE',body:{adminPassword:f.get('adminPassword'),confirmation:f.get('confirmation')}});closeModal();loadOrganizations()}}

async function loadUsers(){userData=await api('/api/admin/users');const total=userData.length,active=userData.filter(x=>x.active).length,verified=userData.filter(x=>x.email_verified).length,online=userData.filter(x=>x.last_seen_at&&Date.now()-new Date(x.last_seen_at).getTime()<15*60000).length;$('#userKpis').innerHTML=kpis([{label:'Comptes',value:total,icon:'team'},{label:'Actifs',value:active,icon:'profile'},{label:'E-mails vérifiés',value:verified,icon:'controls'},{label:'Actifs < 15 min',value:online,icon:'schedule'}]);renderUsers()}
function renderUsers(){
  const qx=$('#userSearch').value.trim().toLowerCase(),f=$('#userFilter').value,now=Date.now();
  const rows=userData.filter(u=>{if(qx&&![u.name,u.email,u.organization_name].join(' ').toLowerCase().includes(qx))return false;if(f==='all')return true;if(f==='online')return u.last_seen_at&&now-new Date(u.last_seen_at).getTime()<15*60000;if(f==='unverified')return !u.email_verified;if(f==='disabled')return !u.active;return u.role===f});
  $('#userCount').textContent=`${rows.length} / ${userData.length}`;
  $('#userRows').innerHTML=rows.map(u=>`<tr><td><b>${esc(u.name)}</b><br><small>${esc(u.email)}</small></td><td>${esc(u.organization_name)}<br><small>${badge(subLabel(u.subscription_status),statusTone(u.subscription_status))}</small></td><td>${esc(roleLabel(u.role))}</td><td>${u.active?badge('Actif','green'):badge('Désactivé','red')} ${u.email_verified?badge('E-mail vérifié','green'):badge('Non vérifié','amber')}</td><td>${fmt(u.last_login_at)}<br><small>${ago(u.last_login_at)}</small></td><td>${fmt(u.last_seen_at)}<br><small>${ago(u.last_seen_at)}</small></td><td><b>${u.active_sessions}</b></td><td>${u.records_created}</td></tr>`).join('');
}

async function loadBilling(){
  const d=await api('/api/admin/billing-overview'),s=d.summary;if($('#adminStandardPrice'))$('#adminStandardPrice').textContent=`${money(d.standardAmountCents)} / mois / entreprise`;
  $('#billingKpis').innerHTML=kpis([{label:'MRR',value:money(s.mrr),note:`${s.paid_orgs} abonnés`,icon:'orders'},{label:'ARR estimé',value:money(s.arr),note:'MRR × 12',icon:'inventory'},{label:'Essais',value:s.trials,icon:'schedule'},{label:'À régulariser',value:Number(s.past_due)+Number(s.attention),note:`${s.past_due} en retard`,icon:'controls'}]);
  $('#billingStatuses').innerHTML=d.statuses.map(x=>`<div class="admin-stat-row"><span>${esc(subLabel(x.subscription_status))}</span><b>${x.count}</b></div>`).join('');
  $('#billingTrend').innerHTML=tinyBars(d.trend,'revenue',x=>new Date(x.day).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})).replace(/<b>(\d+)<\/b>/g,(m,n)=>`<b>${money(n)}</b>`);
  $('#paymentRows').innerHTML=d.payments.length?d.payments.map(p=>`<tr><td>${fmt(p.paid_at||p.created_at)}</td><td><b>${esc(p.organization_name)}</b></td><td>${money(p.amount_cents)}</td><td>${badge(p.status,statusTone(p.status))}</td><td><small>${esc(p.stripe_invoice_id||'—')}</small></td></tr>`).join(''):'<tr><td colspan="5">Aucun paiement.</td></tr>';
}

async function loadUsage(){
  const d=await api('/api/admin/usage-overview'),m=d.modules,total=d.types.reduce((s,x)=>s+Number(x.count||0),0),last30=d.types.reduce((s,x)=>s+Number(x.last_30d||0),0);
  $('#usageKpis').innerHTML=kpis([{label:'Enregistrements',value:total,icon:'scanner'},{label:'Sur 30 jours',value:last30,icon:'schedule'},{label:'Commandes fournisseur',value:m.purchase_orders,icon:'orders'},{label:'Factures importées',value:m.invoice_imports,icon:'archive'},{label:'Fichiers',value:m.media_files,icon:'inventory'},{label:'Horaires actifs',value:m.active_schedules,icon:'schedule'}]);
  $('#usageTypes').innerHTML=d.types.length?d.types.map(x=>`<div class="admin-stat-row"><span>${esc(typeLabel(x.type))}<small>${x.last_30d} sur 30j · dernier ${ago(x.last_at)}</small></span><b>${x.count}</b></div>`).join(''):'<div class="empty">Aucune donnée.</div>';
  $('#usageTopOrgs').innerHTML=d.topOrganizations.map((x,i)=>`<button class="item admin-clickable" data-usage-org="${x.id}"><div class="item-main"><b>${i+1}. ${esc(x.name)}</b><small>${x.records_30d} action(s) / 30j · ${ago(x.last_record_at)}</small></div></button>`).join('');$$('[data-usage-org]').forEach(b=>b.onclick=()=>openOrgDetail(b.dataset.usageOrg));
  $('#usageDaily').innerHTML=tinyBars(d.daily,'records',x=>new Date(x.day).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}));
}

async function loadSystem(){
  const d=await api('/api/admin/system-overview'),r=d.runtime;
  $('#systemKpis').innerHTML=kpis([{label:'Version',value:r.version,icon:'controls'},{label:'Uptime',value:Math.floor(r.uptimeSeconds/3600)+' h',note:`${Math.floor(r.uptimeSeconds/86400)} j`,icon:'schedule'},{label:'Base PostgreSQL',value:bytes(d.database.database_bytes),icon:'inventory'},{label:'Mémoire serveur',value:bytes(r.rssBytes),note:`Heap ${bytes(r.heapUsedBytes)}`,icon:'controls'},{label:'Sessions clients',value:d.sessions.active,note:`${d.sessions.online_15m} actives <15 min`,icon:'team'},{label:'Incidents ouverts',value:d.incidents.open,note:`${d.incidents.last_24h} / 24 h`,icon:'temperature'}]);
  $('#runtimeInfo').innerHTML=infoRows([['Version HygieSafe',r.version],['Node.js',r.node],['Environnement',r.environment],['Plateforme',`${r.platform} / ${r.arch}`],['Heure base de données',fmt(d.database.server_time)],['Base',d.database.database_name],['Stockage',d.storage.driver],['Stockage configuré',d.storage.configured?'Oui':'Non']]);
  $('#integrationInfo').innerHTML=statRows([['E-mail',d.integrations.email],['Resend',d.integrations.resend?'Configuré':'Non configuré'],['Stripe',d.integrations.stripe?'Configuré':'Non configuré'],['Chiffrement 2FA',d.integrations.fieldEncryption?'Configuré':'Non configuré'],['Cookies sécurisés',d.network.secureCookies?'Oui':'Non']]);
  $('#securityInfo').innerHTML=statRows([['Utilisateurs non vérifiés',d.security.unverified_users],['Vérifications en attente',d.security.pending_verifications],['Réinitialisations actives',d.security.active_resets],['Rate limits actifs',d.security.active_rate_limits],['Verrous de paiement',d.security.billing_locks],['Réservations promo',d.security.promo_reservations],['Sessions admin',d.adminSessions.active]]);
  $('#adminAccounts').innerHTML=d.admins.map(a=>`<div class="item"><div class="item-main"><b>${esc(a.name)}</b><small>${esc(a.email)} · dernière connexion ${fmt(a.last_login_at)}</small></div>${a.totp_enabled?badge('2FA actif','green'):badge('2FA inactif','red')}</div>`).join('');
  $('#networkInfo').innerHTML=infoRows([['APP_URL',d.network.appUrl],['PUBLIC_SITE_URL',d.network.publicSiteUrl],['Origines supplémentaires',d.network.allowedOrigins.length?d.network.allowedOrigins.join(', '):'Aucune'],['Dernière session client observée',fmt(d.sessions.last_seen_at)],['Dernière session admin observée',fmt(d.adminSessions.last_seen_at)],['Dernier incident',fmt(d.incidents.last_incident_at)]]);
}

async function loadIncidents(){incidentData=await api('/api/admin/incidents');renderIncidents()}
function renderIncidents(){const qx=$('#incidentSearch').value.trim().toLowerCase(),f=$('#incidentFilter').value;const rows=incidentData.filter(i=>{if(qx&&![i.message,i.method,i.route,i.organization_name,i.severity].join(' ').toLowerCase().includes(qx))return false;if(f==='open')return !i.resolved_at;if(f==='resolved')return !!i.resolved_at;return true});$('#incidentCount').textContent=`${rows.length} / ${incidentData.length}`;$('#incidentList').innerHTML=rows.length?rows.map(i=>`<div class="item"><div class="item-main"><b>${esc(i.message)}</b><small>${esc(i.organization_name||'Sans entreprise')} · ${esc(i.method||'')} ${esc(i.route||'')} · ${fmt(i.created_at)} · hash ${esc(i.stack_hash||'—')}</small></div><button class="small-btn" data-incident="${i.id}">${i.resolved_at?'Rouvrir':'Marquer résolu'}</button></div>`).join(''):'<div class="empty">Aucun incident.</div>';$$('[data-incident]').forEach(b=>b.onclick=async()=>{const row=incidentData.find(x=>String(x.id)===b.dataset.incident);await api('/api/admin/incidents/'+b.dataset.incident,{method:'PATCH',body:{resolved:!row.resolved_at}});loadIncidents()})}

async function loadAudit(){auditData=await api('/api/admin/audit');renderAudit()}
function renderAudit(){const qx=$('#auditSearch').value.trim().toLowerCase();const rows=auditData.filter(a=>!qx||[a.action,a.actor,a.organization_name,a.entity_type,a.entity_id].join(' ').toLowerCase().includes(qx));$('#auditCount').textContent=`${rows.length} / ${auditData.length}`;$('#adminAuditList').innerHTML=rows.map(a=>`<div class="item"><div class="item-main"><b>${esc(a.action)}</b><small>${esc(a.actor||'Système')} · ${esc(a.organization_name||'Global')} · ${esc(a.entity_type||'—')} ${esc(a.entity_id||'')} · ${fmt(a.created_at)}</small></div></div>`).join('')}

async function loadPromos(){const rows=await api('/api/admin/promos');$('#promoList').innerHTML=rows.length?rows.map(p=>`<div class="item"><div class="item-main"><b>${esc(p.code)} · -${p.percent_off}%</b><small>${p.redemptions} utilisation(s)${p.max_redemptions?' / '+p.max_redemptions:''}${p.ends_at?' · fin '+date(p.ends_at):''}</small></div><span class="badge ${p.active?'green':'red'}">${p.active?'Actif':'Désactivé'}</span></div>`).join(''):'<div class="empty">Aucun code promo.</div>'}
function newPromo(){modal('Nouveau code promo',`<form id="promoForm"><div class="field"><label>Code</label><input name="code" required></div><div class="field"><label>Remise %</label><input name="percentOff" type="number" min="1" max="90" required></div><div class="field"><label>Utilisations max (facultatif)</label><input name="maxRedemptions" type="number" min="1"></div><button class="btn primary">Créer</button></form>`);$('#promoForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await api('/api/admin/promos',{method:'POST',body:{code:f.get('code'),percentOff:Number(f.get('percentOff')),maxRedemptions:f.get('maxRedemptions')?Number(f.get('maxRedemptions')):null}});closeModal();loadPromos()}}

function openDemoAccount(){modal('Créer un compte test client',`<div class="admin-note"><b>Compte de démonstration sécurisé.</b> L’adresse est considérée comme vérifiée et le mot de passe sera généré aléatoirement puis affiché une seule fois.</div><form id="demoAccountForm"><div class="field"><label>Nom de l’établissement</label><input name="organizationName" placeholder="Restaurant Démo HygieSafe"></div><div class="field"><label>Nom du gérant test</label><input name="name" placeholder="Gérant Test"></div><div class="field"><label>E-mail de test (facultatif)</label><input name="email" type="email" placeholder="Généré automatiquement si vide"></div><button class="btn primary">Créer le compte test</button></form>`);$('#demoAccountForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),btn=e.currentTarget.querySelector('button');btn.disabled=true;btn.textContent='Création…';try{const d=await api('/api/admin/demo-account',{method:'POST',body:{organizationName:f.get('organizationName')?.trim()||undefined,name:f.get('name')?.trim()||undefined,email:f.get('email')?.trim()||undefined}});modal('Compte test créé',`<div class="admin-note"><b>Copiez ces accès maintenant.</b> Le mot de passe ne sera pas récupérable depuis l’admin après fermeture.</div><div class="card"><div class="field"><label>Établissement</label><input value="${esc(d.organization.name)}" readonly></div><div class="field"><label>E-mail</label><input id="demoEmail" value="${esc(d.credentials.email)}" readonly></div><div class="field"><label>Mot de passe</label><input id="demoPassword" value="${esc(d.credentials.password)}" readonly></div><div class="admin-actions"><button class="btn" type="button" id="copyDemo">Copier les accès</button><a class="btn primary" href="${esc(d.loginUrl)}" target="_blank" rel="noopener">Ouvrir la connexion client</a></div></div>`);$('#copyDemo').onclick=()=>navigator.clipboard?.writeText(`E-mail: ${d.credentials.email}\nMot de passe: ${d.credentials.password}`).catch(()=>{});loadOrganizations().catch(()=>{})}catch(err){alert(err.message);btn.disabled=false;btn.textContent='Créer le compte test'}}}

async function loadSite(){siteSettings=await api('/api/admin/site-settings');for(const [n,k] of [['heroTitle','hero_title'],['heroSubtitle','hero_subtitle'],['heroVideoUrl','hero_video_url'],['heroFallbackUrl','hero_fallback_url'],['supportEmail','support_email']])$('#siteForm [name='+n+']').value=siteSettings[k]||'';const l=siteSettings.legal||{};for(const n of ['companyName','form','capital','rcs','rne','vat','publisher','address','email','phone'])$('#legalAdminForm [name='+n+']').value=l[n]||''}
async function saveSite(e){e.preventDefault();const f=new FormData(e.currentTarget);siteSettings=await api('/api/admin/site-settings',{method:'PATCH',body:{heroTitle:f.get('heroTitle'),heroSubtitle:f.get('heroSubtitle'),heroVideoUrl:f.get('heroVideoUrl')||null,heroFallbackUrl:f.get('heroFallbackUrl')||null,supportEmail:f.get('supportEmail')||null}});alert('Accueil enregistré')}
async function uploadHero(e){e.preventDefault();const fd=new FormData(e.currentTarget);const d=await api('/api/admin/site-media',{method:'POST',body:fd,form:true});alert(d.kind==='hero-video'?'Vidéo mise à jour':'Image mise à jour');loadSite()}
async function saveLegal(e){e.preventDefault();const f=new FormData(e.currentTarget),legal={...(siteSettings?.legal||{})};for(const n of ['companyName','form','capital','rcs','rne','vat','publisher','address','email','phone'])legal[n]=String(f.get(n)||'').trim();siteSettings=await api('/api/admin/site-settings',{method:'PATCH',body:{legal}});alert('Informations juridiques enregistrées')}

boot();
