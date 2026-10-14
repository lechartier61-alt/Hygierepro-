/**
 * HygieSafe UX2 — Parcours métier actionnables (amélioration progressive).
 * Aucun appel API, aucune donnée métier persistée : les validations, droits,
 * montants, DLC et enregistrements restent exclusivement dans les modules natifs.
 */
const admin = !!document.querySelector('#adminApp');
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const sectionPrefix=admin?'admin-':'page-';
const pageAttr=admin?'data-admin-page':'data-page';
const sections=$$(admin?'#adminApp .page':'main.main .page');
const modalRoot=$(admin?'#adminModal':'#modal');
const modalBody=$(admin?'#adminModalBody':'#modalBody');
const modalClose=$(admin?'#adminModalClose':'#modalClose');
let currentPage='';
let enhancedForm=null;
let fieldsSnapshot='';
let formIsDirty=false;
let lastOpener=null;
const adminJobs=[
  {id:'incidents',label:'Examiner les incidents',detail:'Identifier et traiter les alertes techniques.',page:'incidents',icon:'⚑'},
  {id:'orgs',label:'Retrouver une entreprise',detail:'Consulter un établissement et ses accès.',page:'organizations',icon:'▦'},
  {id:'users',label:'Contrôler un utilisateur',detail:'Vérifier le rôle et le statut d’un compte.',page:'users',icon:'♙'},
  {id:'billing',label:'Suivre les abonnements',detail:'Examiner les paiements et les essais.',page:'billing',icon:'€'}
];
const jobs=[
  {id:'control',label:'Faire un contrôle',detail:'Voir les relevés et tâches HACCP à effectuer.',page:'controls',icon:'✓'},
  {id:'scan',label:'Scanner une DLC',detail:'Photographier une étiquette puis vérifier la date et le lot.',page:'scanner',icon:'▣'},
  {id:'receive',label:'Réceptionner une livraison',detail:'Saisir le fournisseur, le lot et les vérifications.',page:'reception',action:'[data-new="reception"]',icon:'↧'},
  {id:'incident',label:'Signaler un problème',detail:'Tracer une anomalie et son action corrective.',page:'nonconformity',action:'[data-new="nonconformity"]',icon:'!'},
  {id:'label',label:'Créer une étiquette',detail:'Utiliser les règles DLC de l’établissement.',page:'labels',action:'#newLabelBtn',icon:'▤'},
  {id:'supplies',label:'Préparer une commande',detail:'Mettre à jour les besoins des fournisseurs.',page:'suppliers',icon:'▥'},
  {id:'task',label:'Prévoir un nettoyage',detail:'Créer une tâche ou retrouver le suivi de nettoyage.',page:'tasks',action:'[data-new="task"]',icon:'✧'},
  {id:'evidence',label:'Retrouver une preuve',detail:'Rechercher un contrôle ou un produit dans l’historique.',page:'history',icon:'⌕'}
];
// Each step is a real navigation or a real, existing button; no "done" status is invented.
const flows={
  controls:[['À réaliser','controls','[data-filter="pending"]'],['Relevé manuel','controls','[data-action="new-temperature"]'],['Signaler un écart','nonconformity','[data-new="nonconformity"]']],
  scanner:[['Prendre une photo','scanner','#autoScanCamera'],['Revoir les DLC','traceability',null],['Voir les alertes','actions',null]],
  traceability:[['Ajouter un produit','traceability','[data-action="new-traceability"]'],['Scanner un produit','scanner',null],['Consulter les preuves','history',null]],
  reception:[['Nouvelle réception','reception','[data-new="reception"]'],['Scanner le lot','scanner',null],['Vérifier les stocks','inventory',null]],
  inventory:[['Ajouter un article','inventory','[data-new="stock_article"]'],['Comparer les besoins','suppliers',null],['Contrôler une livraison','reception',null]],
  suppliers:[['Comparer les besoins','suppliers','[data-supplier-tab="needs"]'],['Configurer les fournisseurs','suppliers','[data-supplier-tab="suppliers"]'],['Vérifier les commandes','suppliers','[data-supplier-tab="orders"]']],
  nonconformity:[['Signaler une anomalie','nonconformity','[data-new="nonconformity"]'],['Voir les actions en cours','actions',null],['Retrouver la preuve','history',null]],
  actions:[['Actions ouvertes','actions','[data-action-filter="open"]'],['Signaler un écart','nonconformity','[data-new="nonconformity"]'],['Suivi des actions','actions','[data-action-filter="resolved"]']],
  production:[['Nouvelle fabrication','production','#newProductionBatch'],['Consulter les recettes','recipes',null],['Créer une étiquette','labels','#newLabelBtn']],
  recipes:[['Nouvelle recette','recipes','#newRecipeBtn'],['Déclarer la fabrication','production','#newProductionBatch'],['Vérifier les allergènes','allergens',null]],
  labels:[['Créer une étiquette','labels','#newLabelBtn'],['Vérifier les produits','traceability',null],['Retrouver les preuves','history',null]],
  equipment:[['Ajouter un équipement','equipment','#newEquipmentBtn'],['Voir les contrôles','controls',null],['Consulter les incidents','nonconformity',null]],
  sensors:[['Ajouter un capteur','sensors','#newSensorBtn'],['Voir les alertes','actions',null],['Vérifier les équipements','equipment',null]],
  tasks:[['Nouvelle tâche','tasks','[data-new="task"]'],['Planifier un service','workdays','#newWorkdayPlan'],['Consulter les contrôles','controls',null]],
  workdays:[['Planifier un service','workdays','#newWorkdayPlan'],['Voir les tâches','tasks',null],['Consulter l’équipe','team',null]],
  team:[['Inviter un membre','team','#inviteBtn'],['Planifier une journée','workdays','#newWorkdayPlan'],['Vérifier les accès','audit',null]],
  documents:[['Ajouter un justificatif','documents','[data-new="document"]'],['Consulter l’historique','history',null],['Préparer un rapport','reports',null]],
  oils:[['Enregistrer un test','oils','[data-new="oil"]'],['Signaler un écart','nonconformity','[data-new="nonconformity"]'],['Consulter l’historique','history',null]],
  pests:[['Créer un signalement','pests','[data-new="pest"]'],['Déclarer une correction','nonconformity','[data-new="nonconformity"]'],['Retrouver les preuves','history',null]],
  allergens:[['Déclarer un allergène','allergens','[data-new="allergen"]'],['Relire les recettes','recipes',null],['Contrôler la production','production',null]],
  history:[['Rechercher les contrôles','history','#historySearch'],['Préparer un rapport','reports',null],['Voir le journal','audit',null]],
  audit:[['Rechercher une action','audit','#auditSearch'],['Consulter les preuves','history',null],['Préparer un rapport','reports',null]],
  reports:[['Contrôler l’historique','history',null],['Vérifier les analyses','analytics',null],['Conserver un justificatif','documents',null]],
  analytics:[['Consulter les priorités','actions',null],['Vérifier les contrôles','controls',null],['Préparer le rapport','reports',null]],
  network:[['Ajouter un établissement','network','#newNetworkSiteBtn'],['Voir les équipes','team',null],['Vérifier les réglages','establishment',null]],
  myday:[['Consulter ma journée','myday',null],['Voir les contrôles','controls',null],['Scanner une DLC','scanner',null]],
  today:[['Contrôles à effectuer','controls',null],['Scanner une DLC','scanner',null],['Suivre les alertes','actions',null]],
  dashboard:[['Ouvrir les incidents','incidents',null],['Vérifier les utilisateurs','users',null],['Suivre la facturation','billing',null]],
  organizations:[['Retrouver une entreprise','organizations','#orgSearch'],['Consulter ses utilisateurs','users',null],['Vérifier les abonnements','billing',null]],
  users:[['Rechercher un utilisateur','users','#userSearch'],['Voir son entreprise','organizations',null],['Consulter le journal','audit',null]],
  billing:[['Consulter les abonnements','billing',null],['Vérifier les entreprises','organizations',null],['Codes promotionnels','promos',null]],
  incidents:[['Voir les incidents ouverts','incidents','#incidentFilter'],['État du système','system',null],['Consulter le journal','audit',null]],
  system:[['Contrôler le système','system',null],['Traiter les incidents','incidents',null],['Voir le journal','audit',null]],
  promos:[['Créer un code','promos','#newPromo'],['Consulter les abonnements','billing',null],['Vérifier les entreprises','organizations',null]],
  site:[['Modifier la page publique','site','#siteForm [name="heroTitle"]'],['Relire les informations légales','site','#legalAdminForm'],['Consulter le journal','audit',null]],
  usage:[['Examiner l’utilisation','usage',null],['Voir les entreprises','organizations',null],['Consulter le système','system',null]],
  timeclock:[['Pointer mon arrivée ou départ','timeclock','#clockBtn'],['Consulter ma journée','myday',null],['Voir le planning','workdays',null]],
  subscription:[['Voir les informations établissement','establishment',null],['Vérifier les préférences','settings',null],['Consulter les rapports','reports',null]],
  establishment:[['Consulter l’abonnement','subscription',null],['Vérifier la traçabilité','traceability',null],['Ouvrir les réglages','settings',null]],
  profile:[['Consulter mon profil','profile',null],['Modifier les préférences','settings',null],['Demander de l’aide','help',null]],
  settings:[['Voir mon profil','profile',null],['Consulter l’aide','help',null],['Revenir à l’accueil','today',null]],
  help:[['Revenir aux priorités','today',null],['Voir les contrôles','controls',null],['Utiliser le scanner','scanner',null]],
  menu:[['Revenir à l’accueil','today',null],['Voir les contrôles','controls',null],['Retrouver les DLC','traceability',null]]
};
function accessAllowed(element){
  if(!element || element.classList.contains('hidden') || element.disabled) return false;
  if(admin) return true;
  const role=document.body.dataset.role||'employee';
  if ((element.classList.contains('owner')||element.classList.contains('owner-only')) && role!=='owner') return false;
  if ((element.classList.contains('manager')||element.classList.contains('manager-only')) && !['owner','manager'].includes(role)) return false;
  if (element.classList.contains('employee-only') && role!=='employee') return false;
  return true;
}
function canVisit(page){
  return $$(`[${pageAttr}="${page}"]`).some(accessAllowed);
}
function currentSection(page){return $(`#${sectionPrefix}${page}`)}
function permittedAction(page,selector){
  const section=currentSection(page); if(!section||!selector)return null;
  const el=$(selector,section); if(!el || !accessAllowed(el))return null;
  // Hidden role-specific parent, e.g. "Fournisseurs" when logged in as employee.
  const hidden=el.closest('.owner-only.hidden,.manager-only.hidden,.owner.hidden,.manager.hidden');
  return hidden ? null : el;
}
function navigateTo(page,selector){
  if(!canVisit(page)) return;
  const wasCurrent=currentPage===page;
  const target=currentSection(page);
  if(!target)return;
  if (!target.classList.contains('on')) {
    const nav=$$(`[${pageAttr}="${page}"]`).find(el=>el.matches('.nav-btn')&&accessAllowed(el)) || $$(`[${pageAttr}="${page}"]`).find(accessAllowed);
    if (!nav)return;
    nav.click();
  }
  if(!selector)return;
  // Navigating to Scanner from the app already opens the native camera.
  if(!admin && page==='scanner' && !wasCurrent)return;
  setTimeout(()=>{
    const action=permittedAction(page,selector);
    if(!action)return;
    if(action.matches('input,select,textarea')) action.focus();
    else if(action.matches('button')) action.click();
    else if(action.matches('form')) action.querySelector('input,select,textarea')?.focus();
  },110);
}
function element(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el}
function makeButton(text,label,callback,cls=''){
  const button=element('button',cls,text);button.type='button';button.setAttribute('aria-label',label||text);button.addEventListener('click',callback);return button;
}
function renderJobs(){
  const page=admin?'dashboard':'today',section=currentSection(page);
  if(!section)return;
  let wrap=$('.ux2-jobs',section);
  if(!wrap){
    wrap=element('section','ux2-jobs');wrap.setAttribute('aria-labelledby','ux2JobsTitle');
    const heading=$('.page-head,.dashboard-pro-head,.admin-exec-head',section);
    if(heading)heading.insertAdjacentElement('afterend',wrap);else section.prepend(wrap);
  }
  wrap.replaceChildren();const head=element('div','ux2-jobs-head');
  head.append(element('span','ux2-eyebrow','ACCÈS PAR BESOIN'));
  const title=element('h2','',admin?'Quelle action souhaitez-vous effectuer ?':'Qu’avez-vous à faire maintenant ?');
  title.id='ux2JobsTitle';head.append(title);
  head.append(element('p','',admin?'Accédez directement au bon écran.':'Une seule action pour ouvrir le bon écran, puis le bon formulaire.'));
  wrap.append(head);
  const grid=element('div','ux2-jobs-grid');wrap.append(grid);
  const allowed=(admin?adminJobs:jobs).filter(job=>canVisit(job.page) && (!job.action || permittedAction(job.page,job.action)));
  function jobButton(job,container){
    const btn=makeButton('',job.label,()=>navigateTo(job.page,job.action),'ux2-job');
    btn.append(element('span','ux2-job-icon',job.icon));const body=element('span','ux2-job-copy');
    body.append(element('b','',job.label));body.append(element('small','',job.detail));btn.append(body);btn.append(element('span','ux2-job-arrow','↗'));
    container.append(btn);
  }
  allowed.slice(0,4).forEach(job=>jobButton(job,grid));
  if(allowed.length>4){
    const more=element('details','ux2-more');const summary=element('summary','','Voir les autres actions');
    more.append(summary);const rest=element('div','ux2-jobs-grid');
    allowed.slice(4).forEach(job=>jobButton(job,rest));more.append(rest);wrap.append(more);
  }
  wrap.hidden=!allowed.length;
}
function renderFlow(section,page){
  const steps=flows[page];if(!steps)return;
  let wrap=$('.ux2-flow',section);
  if(!wrap){wrap=element('nav','ux2-flow');wrap.setAttribute('aria-label','Étapes et raccourcis métier');const after=$('.ux-context',section)||$('.page-head,.dashboard-pro-head,.admin-exec-head',section);if(after)after.insertAdjacentElement('afterend',wrap);else section.prepend(wrap)}
  wrap.replaceChildren();
  const caption=element('span','ux2-flow-label','PARCOURS RAPIDE');wrap.append(caption);
  const links=element('div','ux2-flow-links');wrap.append(links);
  steps.filter(([label,target,selector])=>canVisit(target)&&(!selector||permittedAction(target,selector))).forEach(([label,target,selector])=>{
    const same=target===page;
    const btn=makeButton(label,`${label}${same?'':' — aller à '+target}`,()=>navigateTo(target,selector),'ux2-flow-step');
    if(same)btn.classList.add('ux2-flow-primary');
    btn.prepend(element('span','ux2-step-dot',String(links.children.length+1)));links.append(btn);
  });
  wrap.hidden=!links.children.length;
}
function setActive(){
  if(admin && $('#adminApp')?.classList.contains('hidden')) return;
  const active=sections.find(el=>el.classList.contains('on'));if(!active)return;
  currentPage=active.id.slice(sectionPrefix.length);
  if(currentPage===(admin?'dashboard':'today'))renderJobs();
  renderFlow(active,currentPage);
}
// Modal form assist: labels, required-field progress and non-persistent unsaved guard.
function serializeFields(form){
  return $$('input:not([type="password"]):not([type="hidden"]),select,textarea',form)
    .filter(el=>!el.disabled && !['file','submit','button'].includes(el.type))
    .map(el=>[el.name||el.id,el.type,el.type==='checkbox'||el.type==='radio'?el.checked:el.value]);
}
const tips={
  tempForm:'Indiquez la valeur réellement mesurée. Un écart par rapport aux seuils doit être traité.',
  recordForm:'Enregistrez uniquement des informations constatées. Les champs laissés vides ne sont pas des contrôles réalisés.',
  equipmentForm:'Vérifiez l’emplacement, les seuils et l’état avant d’ajouter l’équipement.',
  supplierForm:'Choisissez les jours et conditions réels de commande du fournisseur.',
  assignSupplierForm:'Vérifiez le conditionnement et les unités pour éviter une erreur de quantité.',
  inviteForm:'Attribuez seulement les accès nécessaires au collaborateur.',
  legalAdminForm:'Relisez les informations juridiques avant publication.'
};
function enhanceForm(){
  if(!modalRoot || !modalBody || modalRoot.classList.contains('hidden'))return;
  const form=$('form',modalBody);
  if(!form || form===enhancedForm)return;
  enhancedForm=form;formIsDirty=false;fieldsSnapshot=JSON.stringify(serializeFields(form));
  let lastSubmit=0;
  modalRoot.setAttribute('role','dialog');modalRoot.setAttribute('aria-modal','true');
  modalRoot.setAttribute('aria-labelledby',admin?'adminModalTitle':'modalTitle');
  // Connect adjacent labels, without changing names/values or replacing inputs.
  $$('input,select,textarea',form).forEach((field,i)=>{
    if (field.labels?.length || field.getAttribute('aria-label'))return;
    const fieldWrapper=field.closest('.field');const label=fieldWrapper?.querySelector('label');
    if(label && !label.contains(field)){
      if(!field.id)field.id=`ux2-${admin?'a':'m'}-${i}`;
      if(!label.htmlFor)label.htmlFor=field.id;
    }
  });
  const intro=element('div','ux2-form-status');intro.setAttribute('role','status');
  intro.setAttribute('aria-live','polite');
  const title=element('strong','ux2-form-title','1. Renseignez · 2. Vérifiez · 3. Enregistrez');
  const modalHeading=$(admin?'#adminModalTitle':'#modalTitle')?.textContent||'';
  const recordHints=[
    [/réception/i,'Contrôlez le produit, la température réellement mesurée et la date lue sur l’étiquette. Ne devinez pas un numéro de lot.'],
    [/non-conformit/i,'Décrivez le constat et l’action corrective réellement engagée. La clôture se fait séparément.'],
    [/traçabilit/i,'Vérifiez le produit, le lot et sa date réelle avant de valider.'],
    [/huile/i,'Renseignez la valeur relevée selon votre procédure interne et signalez tout écart.'],
    [/tâche/i,'Donnez une instruction simple et indiquez la fréquence réellement prévue.']
  ];
  const specificHint=form.id==='recordForm'?recordHints.find(([pattern])=>pattern.test(modalHeading))?.[1]:null;
  const help=element('p','ux2-form-help',specificHint||tips[form.id]||'Les informations ne sont pas enregistrées avant validation du formulaire.');
  const progress=element('span','ux2-form-progress');intro.append(title,help,progress);form.prepend(intro);
  function refresh(){
    const mandatory=$$('[required]',form).filter(f=>!f.disabled && (f.offsetParent!==null || !form.isConnected));
    const completed=mandatory.filter(f=>f.checkValidity()).length;
    progress.textContent=`${mandatory.length?`${completed}/${mandatory.length} champ${mandatory.length>1?'s':''} obligatoire${mandatory.length>1?'s':''} prêt${mandatory.length>1?'s':''}`:'Vérifiez les informations avant d’enregistrer'}${formIsDirty?' · Non enregistré':''}`;
    intro.classList.toggle('ux2-dirty',formIsDirty);
  }
  refresh();
  function changed(){formIsDirty=JSON.stringify(serializeFields(form))!==fieldsSnapshot;refresh()}
  form.addEventListener('input',changed);form.addEventListener('change',changed);
  form.addEventListener('invalid',e=>{
    intro.classList.add('ux2-form-error');
    const label=e.target.labels?.[0]?.textContent?.trim()||'Un champ';
    help.textContent=`${label} : la valeur doit être vérifiée avant l’enregistrement.`;
  },true);
  form.addEventListener('submit',event=>{
    const now=Date.now();
    if(now-lastSubmit<1000){event.preventDefault();event.stopImmediatePropagation();return}
    lastSubmit=now;
    intro.classList.remove('ux2-form-error');
    help.textContent='Vérification et enregistrement par HygieSafe…';
  },true);
  if(window.matchMedia('(min-width: 768px)').matches){
    requestAnimationFrame(()=>{
      if(form===enhancedForm && form.isConnected && !modalRoot.classList.contains('hidden')){
        const first=$$('input:not([type="hidden"]):not([type="file"]),select,textarea',form)
          .find(el=>!el.disabled && el.getClientRects().length);
        first?.focus({preventScroll:true});
      }
    });
  }
}
function closeGuard(e){
  if(!enhancedForm || !modalRoot || modalRoot.classList.contains('hidden'))return;
  if(!formIsDirty || !enhancedForm.isConnected)return;
  if(!window.confirm('Votre saisie n’est pas enregistrée. Fermer sans conserver les modifications ?')){
    e.preventDefault();e.stopImmediatePropagation();
  }
}
function mountModalEnhancements(){
  if(!modalRoot || !modalBody)return;
  modalClose?.addEventListener('click',closeGuard,true);
  document.addEventListener('click',event=>{
    if(!modalRoot.classList.contains('hidden')||modalRoot.contains(event.target))return;
    const trigger=event.target.closest?.('button,a');
    if(trigger)lastOpener=trigger;
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Tab' || modalRoot.classList.contains('hidden'))return;
    const focusable=$$('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',modalRoot)
      .filter(el=>!el.classList.contains('hidden') && el.getClientRects().length);
    if(!focusable.length)return;
    if(event.shiftKey && document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1).focus()}
    else if(!event.shiftKey && document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0].focus()}
  },true);
  const modalObserver=new MutationObserver(()=>{if(modalRoot.classList.contains('hidden')){const wasOpen=!!enhancedForm;enhancedForm=null;formIsDirty=false;if(wasOpen&&lastOpener?.isConnected)lastOpener.focus({preventScroll:true});return;}enhanceForm()});
  modalObserver.observe(modalBody,{childList:true});
  modalObserver.observe(modalRoot,{attributes:true,attributeFilter:['class']});
  enhanceForm();
}
function mountSearchHelpers(){
  $$('main.main .pro-toolbar input,main.admin-main .admin-toolbar input').forEach(input=>{
    if(input.dataset.ux2Search || !['search','text'].includes(input.type))return;
    input.dataset.ux2Search='1';
    // Native search handlers stay in charge of filtering; this only clears their input.
    const holder=input.closest('.pro-search,.admin-toolbar');if(!holder)return;
    const btn=makeButton('×','Effacer la recherche',()=>{
      input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus();
    },'ux2-clear-search');
    btn.hidden=true;input.addEventListener('input',()=>{btn.hidden=!input.value});
    input.insertAdjacentElement('afterend',btn);
  });
}
function start(){
  mountModalEnhancements();mountSearchHelpers();
  const router=new MutationObserver(changes=>{
    if(changes.some(c=>c.target.classList?.contains('page') || c.target===document.body))setActive();
  });
  sections.forEach(section=>router.observe(section,{attributes:true,attributeFilter:['class']}));
  if(!admin){router.observe(document.body,{attributes:true,attributeFilter:['data-role']});}
  else if($('#adminApp'))router.observe($('#adminApp'),{attributes:true,attributeFilter:['class']});
  setActive();
  if(!admin)setTimeout(setActive,400); // wait for the native role initialization
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});else start();
