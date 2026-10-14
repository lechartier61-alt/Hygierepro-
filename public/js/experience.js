/**
 * HygieSafe · Expérience unifiée UX (édition de refonte)
 * Amélioration progressive de l'interface uniquement : routes, API, droits et
 * formulaires métier restent gérés par le code historique de HygieSafe.
 */
const isAdmin = Boolean(document.querySelector('#adminApp'));
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// A deliberate short, task-first route map: the user learns what to do next,
// rather than navigating a collection of unfamiliar technical modules.
const clientPages = {
  today: {group:'Ma journée',title:'Aujourd’hui',what:'Voir en un coup d’œil ce qui nécessite votre attention et commencer par l’essentiel.',steps:['Consultez vos priorités','Traitez les contrôles ou alertes urgents','Vérifiez que la journée est à jour'],related:['actions','controls','scanner'],action:'#startDayBtn'},
  myday:{group:'Ma journée',title:'Ma journée',what:'Suivre votre service dans l’ordre, avec les bonnes consignes au bon moment.',steps:['Démarrez le service prévu','Effectuez les étapes demandées','Validez les preuves et terminez le service'],related:['controls','scanner','help']},
  workdays:{group:'Équipe',title:'Journées équipe',what:'Préparer des services faciles à suivre pour chaque membre de l’équipe.',steps:['Planifiez la journée type','Attribuez les étapes et les horaires','Suivez les réalisations et les écarts'],related:['team','myday','controls'],action:'#newWorkdayPlan'},
  actions:{group:'Ma journée',title:'À traiter',what:'Retrouver au même endroit les actions qui ne doivent pas être oubliées.',steps:['Commencez par les actions les plus urgentes','Ouvrez le détail et appliquez la correction','Marquez l’action résolue avec son suivi'],related:['nonconformity','controls','history'],action:'#newCorrectiveAction'},
  controls:{group:'Contrôles HACCP',title:'Contrôles',what:'Enregistrer les contrôles du quotidien et conserver les résultats.',steps:['Consultez les contrôles à faire','Renseignez une mesure fidèle à la réalité','Validez la saisie et vérifiez le statut'],related:['scanner','equipment','history'],action:'.page-head button'},
  scanner:{group:'Contrôles HACCP',title:'Scanner',what:'Photographier une étiquette pour relier le produit à sa date, sans ressaisie inutile.',steps:['Prenez une photo nette et complète','Vérifiez le produit et la date détectés','Enregistrez la preuve ou corrigez les champs'],related:['traceability','reception','labels'],action:'#autoScanCamera'},
  traceability:{group:'Produits & stocks',title:'Traçabilité',what:'Savoir ce qui a été reçu, ouvert, utilisé et ce qui arrive à échéance.',steps:['Retrouvez le produit ou le lot concerné','Contrôlez son état et sa DLC','Ajoutez une preuve ou corrigez la traçabilité'],related:['scanner','labels','production'],action:'.page-head button'},
  reception:{group:'Produits & stocks',title:'Réceptions',what:'Contrôler une livraison à l’arrivée, avant sa mise en stock.',steps:['Ouvrez une nouvelle réception','Contrôlez le produit, sa température et son état','Conservez le résultat et les justificatifs'],related:['scanner','inventory','suppliers'],action:'.page-head button'},
  inventory:{group:'Produits & stocks',title:'Inventaire',what:'Visualiser vos stocks et anticiper les produits manquants.',steps:['Recherchez une référence','Mettez à jour la quantité réelle','Préparez les besoins fournisseurs'],related:['suppliers','reception','traceability'],action:'.page-head button'},
  suppliers:{group:'Produits & stocks',title:'Commandes fournisseurs',what:'Transformer les besoins réels en commandes claires et vérifiables.',steps:['Complétez les fournisseurs et les références','Vérifiez les quantités proposées','Validez les besoins puis passez commande'],related:['inventory','reception','documents'],action:'#scanSupplierInvoiceBtn'},
  production:{group:'Fabrication',title:'Production & lots',what:'Retrouver facilement ce qui a été fabriqué et les ingrédients utilisés.',steps:['Déclarez la fabrication','Associez les lots de matières premières','Enregistrez la production et conservez sa traçabilité'],related:['recipes','traceability','labels'],action:'#newProductionBatch'},
  recipes:{group:'Fabrication',title:'Recettes',what:'Centraliser vos fabrications, ingrédients et allergènes.',steps:['Créez ou ouvrez une recette','Vérifiez les quantités et les allergènes','Utilisez-la lors d’une production'],related:['production','allergens','labels'],action:'#newRecipeBtn'},
  labels:{group:'Fabrication',title:'DLC & étiquettes',what:'Calculer et imprimer des étiquettes internes à partir de règles définies.',steps:['Sélectionnez la règle appropriée','Vérifiez les informations et les dates','Imprimez puis posez l’étiquette'],related:['traceability','scanner','production'],action:'#newLabelBtn'},
  nonconformity:{group:'Contrôles HACCP',title:'Non-conformités',what:'Signaler un problème et garder la preuve de sa résolution.',steps:['Décrivez précisément l’anomalie','Appliquez et documentez l’action corrective','Vérifiez sa clôture'],related:['actions','controls','history'],action:'.page-head button'},
  equipment:{group:'Contrôles HACCP',title:'Équipements',what:'Suivre les équipements, leurs relevés et leurs interventions.',steps:['Sélectionnez ou créez un équipement','Vérifiez les relevés et seuils pertinents','Documentez les anomalies et la maintenance'],related:['controls','sensors','nonconformity'],action:'#newEquipmentBtn'},
  sensors:{group:'Contrôles HACCP',title:'Capteurs',what:'Consulter les mesures automatiques et réagir aux alertes.',steps:['Ajoutez ou sélectionnez un capteur','Vérifiez les mesures et seuils','Traitez les anomalies dans À traiter'],related:['equipment','actions','analytics'],action:'#newSensorBtn'},
  tasks:{group:'Organisation',title:'Tâches',what:'Organiser les actions récurrentes sans perdre les suivis.',steps:['Créez une tâche explicite','Précisez le responsable et l’échéance','Suivez la réalisation'],related:['workdays','controls','team'],action:'.page-head button'},
  team:{group:'Organisation',title:'Équipe',what:'Inviter des collaborateurs et définir des rôles adaptés.',steps:['Invitez un membre','Attribuez uniquement les accès nécessaires','Planifiez ses journées et vérifiez les invitations'],related:['workdays','timeclock','settings'],action:'#inviteBtn'},
  timeclock:{group:'Organisation',title:'Pointeuse',what:'Pointer le début et la fin du service simplement.',steps:['Vérifiez le statut de pointage','Pointez à l’heure réelle','Consultez votre historique'],related:['myday','workdays','profile'],action:'#clockBtn'},
  documents:{group:'Organisation',title:'Documents',what:'Centraliser les justificatifs utiles et les retrouver au besoin.',steps:['Ajoutez la pièce au bon emplacement','Renseignez un nom clair','Vérifiez qu’elle peut être consultée'],related:['reports','history','audit'],action:'.page-head button'},
  oils:{group:'Contrôles HACCP',title:'Huiles',what:'Suivre les contrôles et changements d’huiles de friture.',steps:['Renseignez le contrôle réalisé','Enregistrez le résultat réel','Décidez et documentez les actions nécessaires'],related:['controls','nonconformity','history'],action:'.page-head button'},
  pests:{group:'Contrôles HACCP',title:'Nuisibles',what:'Tracer les inspections, signalements et actions correctives.',steps:['Enregistrez le lieu et le constat','Ajoutez les informations utiles','Effectuez le suivi jusqu’à résolution'],related:['nonconformity','documents','history'],action:'.page-head button'},
  allergens:{group:'Fabrication',title:'Allergènes',what:'Retrouver les informations d’allergènes enregistrées pour vos produits.',steps:['Consultez le produit concerné','Vérifiez la source des ingrédients','Maintenez les informations à jour'],related:['recipes','production','traceability'],action:'.page-head button'},
  history:{group:'Suivi & preuves',title:'Historique',what:'Retrouver une saisie et son contexte sans parcourir toutes les pages.',steps:['Recherchez un produit ou une opération','Ouvrez le résultat correspondant','Vérifiez les dates et preuves enregistrées'],related:['audit','reports','traceability']},
  audit:{group:'Suivi & preuves',title:'Journal d’activité',what:'Identifier les opérations enregistrées et leurs auteurs.',steps:['Recherchez une action ou un utilisateur','Vérifiez la date et l’opération','Conservez l’historique pour la traçabilité'],related:['history','reports','team']},
  analytics:{group:'Suivi & preuves',title:'Analyses',what:'Identifier les tendances et prioriser les corrections.',steps:['Observez les indicateurs et leur période','Repérez les variations importantes','Agissez puis suivez leur évolution'],related:['actions','reports','equipment']},
  reports:{group:'Suivi & preuves',title:'Rapports',what:'Exporter les justificatifs disponibles pour une revue ou un contrôle.',steps:['Choisissez le rapport adapté','Téléchargez-le et vérifiez les informations','Conservez-le dans votre procédure interne'],related:['history','analytics','documents']},
  subscription:{group:'Mon entreprise',title:'Abonnement',what:'Consulter les conditions de votre abonnement et les factures.',steps:['Vérifiez le statut de l’offre','Consultez la facturation disponible','Mettez à jour les informations si nécessaire'],related:['establishment','settings','reports']},
  establishment:{group:'Mon entreprise',title:'Établissement',what:'Mettre à jour les informations de votre site et sa configuration.',steps:['Vérifiez les coordonnées','Corrigez les paramètres métier nécessaires','Enregistrez puis contrôlez les modifications'],related:['team','network','settings']},
  network:{group:'Mon entreprise',title:'Réseau & multisite',what:'Gérer plusieurs établissements en conservant des accès séparés.',steps:['Créez ou sélectionnez le site','Vérifiez les membres et leurs rôles','Basculez de site pour suivre ses données'],related:['establishment','team','analytics'],action:'#newNetworkSiteBtn'},
  profile:{group:'Mon compte',title:'Mon profil',what:'Tenir à jour vos informations personnelles et votre sécurité.',steps:['Contrôlez les informations affichées','Mettez à jour les champs nécessaires','Enregistrez puis vérifiez votre accès'],related:['settings','help']},
  settings:{group:'Mon compte',title:'Paramètres',what:'Choisir un affichage et un fonctionnement adaptés à votre métier.',steps:['Choisissez votre page d’accueil','Activez uniquement les options utiles','Enregistrez vos préférences'],related:['profile','help','today']},
  help:{group:'Mon compte',title:'Aide & tutoriels',what:'Découvrir pas à pas les fonctionnalités adaptées à votre rôle.',steps:['Choisissez le sujet rencontré','Suivez le guide correspondant','Reprenez la tâche dans son module'],related:['today','scanner','controls'],action:'#replayMyTutorial'},
  menu:{group:'Navigation',title:'Toutes les fonctions',what:'Accéder aux modules correspondant à votre rôle et à votre besoin.',steps:['Recherchez une fonction par son nom','Choisissez un module','Revenez ici pour une autre tâche'],related:['today','controls','settings']}
};

// User search intentions used in both navigation and the Ctrl+K command palette.
// These are navigation hints, not automated compliance decisions.
const searchSynonyms = {
  today:'accueil commencer tableau de bord urgence priorités',
  myday:'service planning employé travail étape',
  actions:'alertes urgent corrections problème anomalies',
  controls:'température chambre froide frigo congélateur relever hygiène nettoyage contrôles haccp',
  scanner:'photo étiquette lot code barre dates dlc ddm ouvrir caméra',
  traceability:'date péremption dlc ddm produits ouverts stock lot preuve rappel alimentaire',
  reception:'livraison entrée marchandises facture camion contrôle',
  inventory:'quantité rupture stock produits inventaire comptage',
  suppliers:'commander achats approvisionnement fournisseur facture besoins',
  production:'fabrication pâtisserie recette lot rappel produit',
  recipes:'ingrédients allergènes composition grammage fabrication',
  labels:'imprimer étiquette dlc ouverture décongélation date limite',
  nonconformity:'erreur anomalie incident correction action non conformité',
  equipment:'frigo froid congélateur relevé température maintenance panne',
  sensors:'sonde connecté bluetooth wifi humidité froid température',
  tasks:'nettoyage entretien tâche routine planification ménage',
  team:'employés salarié compte invitation autorisation utilisateur',
  timeclock:'horaires pointage heure arrivée sortie pause',
  documents:'preuve attestation document justificatif',
  oils:'friteuse huile friture usagée contrôle',
  pests:'nuisible rat souris insectes piège',
  allergens:'gluten œufs lait fruits coque arachide allergène',
  history:'archives sauvegarde historique passé recherche',
  audit:'audit activité historique qui a modifié',
  analytics:'statistiques score indicateurs graphique',
  reports:'pdf csv rapport contrôle audit inspection export sauvegarde',
  workdays:'service planning horaires journées équipe',
  subscription:'paiement stripe facture abonnement tarif',
  establishment:'établissement adresse société téléphone modifier',
  network:'multisite établissements succursale réseau',
  profile:'identité mot passe profil information',
  settings:'préférences affichage accessibilité réglage',
  help:'aide assistance tutoriel comprendre fonctionnement',
  menu:'toutes fonctions fonctionnalités trouver menu',
  dashboard:'admin pilotage activité',
  organizations:'entreprises clients sociétés',
  users:'utilisateurs salariés comptes accès',
  billing:'stripe paiements facturation chiffre affaire',
  usage:'activités statistiques usage métriques',
  promos:'réduction codes promotionnels remise',
  site:'site vitrine contenu page accueil textes',
  incidents:'incident alerte erreur technique panne',
  system:'base postgresql intégration déploiement état serveur sécurité'
};
function normalizeQuery(s){return String(s||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function matchesQuery(id,raw){
  const terms=normalizeQuery(raw).split(/\s+/).filter(Boolean);
  const meta=pages[id]||{};
  const haystack=normalizeQuery([meta.title,meta.group,meta.what,...(meta.steps||[]),searchSynonyms[id]||''].join(' '));
  return terms.every(word=>haystack.includes(word));
}
const adminPages = {
  dashboard:{group:'Pilotage',title:'Vue globale',what:'Voir les informations critiques avant d’ouvrir une fiche.',steps:['Contrôlez les indicateurs','Traitez les incidents signalés','Ouvrez la rubrique concernée'],related:['organizations','incidents','billing'],action:'#refreshDashboard'},
  organizations:{group:'Clients',title:'Entreprises',what:'Retrouver rapidement un établissement et son état.',steps:['Recherchez l’entreprise','Ouvrez sa fiche et ses détails','Appliquez uniquement la modification nécessaire'],related:['users','billing','usage'],action:'#refreshOrgs'},
  users:{group:'Clients',title:'Utilisateurs',what:'Vérifier les comptes, leur statut et leurs accès.',steps:['Recherchez un utilisateur','Contrôlez son rôle et son activité','Effectuez l’action autorisée'],related:['organizations','audit','system'],action:'#refreshUsers'},
  billing:{group:'Commercial',title:'Abonnements & CA',what:'Suivre les paiements, les essais et les abonnements.',steps:['Consultez les indicateurs et statuts','Isolez les paiements nécessitant un suivi','Ouvrez l’établissement concerné'],related:['organizations','promos','dashboard'],action:'#refreshBilling'},
  usage:{group:'Pilotage',title:'Utilisation',what:'Comprendre l’utilisation réelle de HygieSafe.',steps:['Consultez la période','Repérez les modules peu utilisés','Priorisez les besoins d’accompagnement'],related:['organizations','dashboard','system'],action:'#refreshUsage'},
  promos:{group:'Commercial',title:'Codes promo',what:'Créer et vérifier des remises commerciales.',steps:['Choisissez les paramètres de remise','Contrôlez leur durée et leur portée','Vérifiez ensuite les utilisations'],related:['billing','organizations'],action:'#newPromo'},
  site:{group:'Configuration',title:'Site public',what:'Gérer le contenu visible et les informations légales.',steps:['Ouvrez la rubrique à modifier','Vérifiez le texte et le média','Enregistrez puis relisez sur le site public'],related:['system','audit']},
  incidents:{group:'Sécurité',title:'Incidents techniques',what:'Identifier, prioriser et résoudre les incidents.',steps:['Filtrez les incidents ouverts','Vérifiez leur contexte','Documentez leur résolution'],related:['system','audit','dashboard'],action:'#refreshIncidents'},
  system:{group:'Sécurité',title:'État du système',what:'Vérifier les signaux de santé et les intégrations.',steps:['Actualisez les indicateurs','Identifiez un défaut d’intégration','Consultez l’incident lié'],related:['incidents','audit','dashboard'],action:'#refreshSystem'},
  audit:{group:'Sécurité',title:'Journal d’activité',what:'Retrouver les opérations administratives sensibles.',steps:['Recherchez l’action ou l’acteur','Vérifiez l’horodatage et le contexte','Conservez les preuves nécessaires'],related:['users','incidents','system'],action:'#refreshAudit'}
};
const pages = isAdmin ? adminPages : clientPages;
const attr = isAdmin ? 'data-admin-page' : 'data-page';
const prefix = isAdmin ? 'admin-' : 'page-';
const pageSelector = isAdmin ? '#adminApp .page' : 'main.main .page';
const sectionSelector = isAdmin ? '.admin-main' : 'main.main';
const sidebarSelector = isAdmin ? '.admin-sidebar' : '#sidebar';
const userRole = () => document.body.dataset.role || 'employee';
const safeStore = {
  get(key, fall = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fall; } catch { return fall; } },
  set(key, value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch {} }
};
let currentPage = null;
let lastFocus = null;
let lastPage = null;
let paletteOpen = false;
let activeIndex = 0;
let paletteEntries = [];
const appRoot = isAdmin ? $('#adminApp') : document.body;
const favoriteKey = () => `hygiesafe-ux-favorites-${isAdmin ? 'admin' : userRole()}`;
const historyKey = () => `hygiesafe-ux-recent-${isAdmin ? 'admin' : userRole()}`;

function getTitle(id) { return pages[id]?.title || id; }
function pathAvailable(id){
  if (!pages[id]) return false;
  const elements = $$(`[${attr}="${CSS.escape(id)}"]`);
  if (!elements.length) return false;
  if (isAdmin) return true;
  const role = userRole();
  // Ignore advanced-menu collapsed state; still enforce server-side and client-side roles.
  const allowed = el => !el.classList.contains('hidden') &&
    !(el.classList.contains('owner') && role !== 'owner') &&
    !(el.classList.contains('owner-only') && role !== 'owner') &&
    !(el.classList.contains('manager') && !['owner','manager'].includes(role)) &&
    !(el.classList.contains('manager-only') && !['owner','manager'].includes(role)) &&
    !(el.classList.contains('employee-only') && role !== 'employee');
  return elements.some(allowed);
}
function visiblePages(){ return Object.keys(pages).filter(pathAvailable); }
function navButton(id) { return $$(`[${attr}="${CSS.escape(id)}"]`).find(b => b.matches('.nav-btn') && !b.classList.contains('hidden')) || $(`[${attr}="${CSS.escape(id)}"]`); }
function openPage(id){ if (!pathAvailable(id)) return; const btn = navButton(id); if (btn) btn.click(); else if (isAdmin) $(`#adminMobileNav`)?.dispatchEvent(new Event('change')); closePalette(); }
function rememberPage(id){
  const recent=safeStore.get(historyKey(),[]).filter(v=>v!==id&&pages[v]); recent.unshift(id);
  safeStore.set(historyKey(),recent.slice(0,6));
}
function favorites() { return safeStore.get(favoriteKey(),[]).filter(v=>pages[v]); }
function toggleFavorite(id){
  const arr = favorites(); const next=arr.includes(id)?arr.filter(x=>x!==id):[id,...arr].slice(0,8);
  safeStore.set(favoriteKey(),next);
  drawFavorites(); updateFavoriteButton();
}
function addElement(parent, tag, cls, text){ const el=document.createElement(tag); if (cls)el.className=cls; if (text!=null)el.textContent=text; parent.append(el);return el; }
function makeButton(parent,cls,label,handler) { const b=addElement(parent,'button',cls,label); b.type='button';b.addEventListener('click',handler);return b; }

function createShell(){
  if (!appRoot || $(sectionSelector)===null) return;
  document.body.classList.add('hsx');
  const main=$(sectionSelector);
  const top = document.createElement('div'); top.className='ux-workspace-bar';top.id='uxWorkspaceBar';
  top.innerHTML = `<div class="ux-crumb"><span class="ux-crumb-label">${isAdmin?'Administration':'Espace de travail'}</span><span aria-hidden="true">/</span><span id="uxCrumbGroup">Pilotage</span><span aria-hidden="true">/</span><strong id="uxCrumbCurrent">Aujourd’hui</strong></div><div class="ux-workspace-tools"><span class="ux-live" title="Espace de travail disponible"><i></i><span>Espace de travail</span></span></div>`;
  main.prepend(top);
  const tools=$('.ux-workspace-tools',top);
  makeButton(tools,'ux-icon-button ux-back-button','←',()=>{const hist=safeStore.get(historyKey(),[]);const previous=lastPage&&pathAvailable(lastPage)?lastPage:hist.find(p=>p!==currentPage&&pathAvailable(p)); if(previous)openPage(previous);}).setAttribute('aria-label','Revenir à la page précédente');
  const search=makeButton(tools,'ux-search-launch','⌕  Rechercher une fonction',()=>openPalette());search.setAttribute('aria-keyshortcuts','Control+K Meta+K');search.setAttribute('aria-haspopup','dialog');search.setAttribute('aria-expanded','false');
  const searchHint=addElement(search,'kbd','ux-keycap','Ctrl K');searchHint.setAttribute('aria-hidden','true');
  const nav=$(sidebarSelector);
  if(nav){
    const div=document.createElement('div');div.className='ux-sidebar-search';div.innerHTML='<label for="uxNavSearch">Accès rapide</label><div><span aria-hidden="true">⌕</span><input id="uxNavSearch" autocomplete="off" type="search" placeholder="Une fonction, un besoin…" aria-label="Filtrer les rubriques"><kbd>/</kbd></div>';
    nav.prepend(div);
    const input=$('#uxNavSearch'); input.addEventListener('input',()=>filterSidebar(input.value));
    const favBox=addElement(nav,'div','ux-favorites');favBox.id='uxFavorites';
    const navigationLabel = isAdmin? 'Pilotage HygieSafe':'Toutes les fonctions';
    nav.setAttribute('aria-label',navigationLabel);
    drawFavorites();
  }
  // One modal search palette shared by management and employee accounts.
  const overlay=addElement(document.body,'div','ux-palette-wrap hidden');overlay.id='uxPaletteWrap';
  overlay.innerHTML='<div class="ux-palette-backdrop" data-palette-close="true"></div><section class="ux-palette" role="dialog" aria-modal="true" aria-labelledby="uxPaletteTitle"><div class="ux-palette-search"><span aria-hidden="true">⌕</span><label class="sr-only" for="uxPaletteInput" id="uxPaletteTitle">Chercher une fonction</label><input id="uxPaletteInput" type="search" autocomplete="off" placeholder="Que souhaitez-vous faire ?"><kbd>Échap</kbd></div><div class="ux-palette-results" id="uxPaletteResults" role="listbox" aria-label="Rubriques disponibles"></div><div class="ux-palette-footer">↑ ↓ Parcourir <span>↵ Ouvrir</span><span>Échap Fermer</span></div></section>';
  $('#uxPaletteWrap').addEventListener('click',e=>{if(e.target.dataset.paletteClose)closePalette()});
  $('#uxPaletteInput').addEventListener('input',e=>renderPalette(e.target.value));
  $('#uxPaletteInput').addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault();activeIndex=(activeIndex+(e.key==='ArrowDown'?1:-1)+paletteEntries.length)%Math.max(1,paletteEntries.length);highlightResult(); }
    if(e.key==='Enter'){ e.preventDefault(); if(paletteEntries[activeIndex])openPage(paletteEntries[activeIndex]); }
  });
  // A single accessible status region, never includes private or medical data.
  const live=addElement(document.body,'div','sr-only');live.id='uxLive';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();paletteOpen?closePalette():openPalette();return}
    if(e.key==='Escape'&&paletteOpen){closePalette();return}
    if(e.key==='Tab'&&paletteOpen){
      const focusables=$$('input,button,[tabindex]:not([tabindex="-1"])',$('#uxPaletteWrap')).filter(el=>!el.disabled&&el.getClientRects().length);
      if(focusables.length){const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
      return;
    }
    if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.repeat&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.activeElement.isContentEditable&&!paletteOpen){e.preventDefault();const navInput=$('#uxNavSearch');if(navInput&&getComputedStyle(navInput).display!=='none'&&navInput.getClientRects().length)navInput.focus();else openPalette();return}
    if(e.key==='Escape'){
      const modal = isAdmin ? $('#adminModal') : $('#modal');
      const close = isAdmin ? $('#adminModalClose') : $('#modalClose');
      if(modal && !modal.classList.contains('hidden') && close && !close.classList.contains('hidden')) close.click();
    }
  });
  // Meaningful field labels, keyboard focus and contextual validation in modal forms.
  document.addEventListener('invalid',e=>{
    const field=e.target; if(!field.matches('input,textarea,select'))return;
    field.classList.add('ux-invalid');
    const label=field.labels?.[0]?.textContent?.trim() || field.getAttribute('aria-label') || 'Ce champ';
    $('#uxLive').textContent=`${label} : veuillez vérifier la saisie.`;
  },true);
  document.addEventListener('input',e=>{if(e.target.classList.contains('ux-invalid')&&e.target.validity.valid)e.target.classList.remove('ux-invalid')});
  document.addEventListener('click',e=>{
    const o=e.target.closest('[data-ux-open]');if(o){e.preventDefault();openPage(o.dataset.uxOpen)}
    const favorite=e.target.closest('[data-ux-favorite]');if(favorite){e.preventDefault();toggleFavorite(favorite.dataset.uxFavorite)}
    const action=e.target.closest('[data-ux-action]');if(action){e.preventDefault();const section=$(`#${prefix}${CSS.escape(action.dataset.uxAction)}`);const sel=pages[action.dataset.uxAction]?.action;const original=sel?$(sel,section):null;if(original && !original.disabled && !original.classList.contains('hidden') && getComputedStyle(original).display!=='none'){original.click()}else{const details=$('.ux-flow',section);if(details){details.open=true;details.focus()}}}
  });
  // Do not remount existing forms or interfere with the native backend-driven UI.
  observeRouting();
  setTimeout(()=>{const initial=$$(pageSelector).find(p=>p.classList.contains('on'));if(initial)activate(initial.id.slice(prefix.length))},200);
}

function filterSidebar(query){
  const nav=$(sidebarSelector); if(!nav)return;
  const norm=s=>s.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const q=norm(query.trim()); nav.classList.toggle('ux-nav-searching',!!q);
  $$('.nav-btn',nav).forEach(btn=>{
    if (!btn.dataset[isAdmin?'adminPage':'page'])return;
    btn.classList.toggle('ux-not-matched',!!q && !matchesQuery(btn.dataset[isAdmin?'adminPage':'page'],q));
  });
  $$('.nav-group',nav).forEach(group=>group.classList.toggle('ux-group-empty',!!q && !$$('.nav-btn:not(.ux-not-matched):not(.hidden)',group).length));
}
function drawFavorites(){
  const box=$('#uxFavorites'); if(!box)return;
  const allowed=favorites().filter(pathAvailable);
  box.replaceChildren();
  if (!allowed.length) {box.hidden=true;return;}
  box.hidden=false;
  addElement(box,'span','ux-sidebar-heading','Mes favoris');
  allowed.forEach(id=>makeButton(box,'ux-favorite-link',`★  ${getTitle(id)}`,()=>openPage(id)));
}
function updateFavoriteButton(){
  const b=$(`#${prefix}${CSS.escape(currentPage || '')} .ux-fav-toggle`);if(!b||!currentPage)return;
  const on=favorites().includes(currentPage);
  b.textContent=on?'★':'☆'; b.classList.toggle('is-favorite',on);
  b.setAttribute('aria-label',on?'Retirer des favoris':'Ajouter aux favoris');
  b.title=on?'Retirer des favoris':'Ajouter aux favoris';
}
function drawContext(section,id){
  const m=pages[id]; if(!m || !section)return;
  let context=$('.ux-context',section);
  if (!context){
    context=document.createElement('div');context.className='ux-context';
    const anchor=$('.page-head, .dashboard-pro-head, .admin-exec-head',section);
    if(anchor)anchor.insertAdjacentElement('afterend',context);else section.prepend(context);
  }
  context.replaceChildren();
  const intro=addElement(context,'div','ux-context-info');
  addElement(intro,'span','ux-kicker','VOTRE OBJECTIF');
  addElement(intro,'p','ux-context-desc',m.what);
  const helpers=addElement(context,'div','ux-context-actions');
  const actionNode=m.action?$(m.action,section):null;
  const ready=actionNode && !actionNode.disabled && !actionNode.classList.contains('hidden') && actionNode.getClientRects().length>0;
  if(ready && id!=='today' && !actionNode.closest('.page-head, .dashboard-pro-head, .admin-exec-head')){
    const label=actionNode.textContent.trim().replace(/^\+\s*/,'').replace(/\s+/g,' ').slice(0,34);
    const b=makeButton(helpers,'ux-context-primary',`${label || 'Commencer'}  ↗`,()=>actionNode.click());b.setAttribute('aria-label',`Commencer : ${label}`);
  }
  const flow=addElement(helpers,'details','ux-flow');flow.setAttribute('tabindex','0');
  const sum=addElement(flow,'summary','','Comment procéder ?');
  const guideBody=addElement(flow,'div','ux-flow-content');const ol=addElement(guideBody,'ol','ux-flow-steps');m.steps.forEach(s=>addElement(ol,'li','',s));
  if(m.related?.length){
    const links=addElement(guideBody,'div','ux-related');addElement(links,'span','','À voir aussi');
    m.related.filter(pathAvailable).forEach(target=>makeButton(links,'ux-related-link',`${getTitle(target)} ↗`,()=>openPage(target)));
  }
  // Favoriting is simple and private to this browser, and doesn't modify database permissions.
  const fb=makeButton(helpers,'ux-fav-toggle','☆',()=>toggleFavorite(id));fb.dataset.uxFavoriteControl=id;
  updateFavoriteButton();
  // Users who prefer compact displays have a guide available on demand, not a long mandatory tutorial.
}
function activate(id){
  if(!pages[id])return;
  const changed=currentPage!==id;
  if(changed){lastPage=currentPage;currentPage=id;rememberPage(id)}
  const section=$(`#${prefix}${CSS.escape(id)}`); if(!section)return;
  const group=$('#uxCrumbGroup');const cur=$('#uxCrumbCurrent');
  if(group)group.textContent=pages[id].group;
  if(cur)cur.textContent=getTitle(id);
  document.title=`${getTitle(id)} — ${isAdmin?'Administration · ':''}HygieSafe`;
  const top=$('#uxWorkspaceBar');if(top)top.classList.toggle('ux-guided',id==='myday');
  if (changed || !$('.ux-context',section))drawContext(section,id);
  // Highlight current position for assistive technologies.
  $$(`[${attr}]`).forEach(el=>{
    if(el.dataset[isAdmin?'adminPage':'page']===id)el.setAttribute('aria-current','page');
    else el.removeAttribute('aria-current');
  });
}
function observeRouting(){
  const observer=new MutationObserver(changes=>{
    for(const change of changes){if(change.attributeName==='class'&&change.target.classList.contains('on') && change.target.id.startsWith(prefix)) {activate(change.target.id.slice(prefix.length));break}}
  });
  $$(pageSelector).forEach(node=>observer.observe(node,{attributes:true,attributeFilter:['class']}));
  const all=$$(pageSelector);const initial=all.find(el=>el.classList.contains('on'));if(initial)activate(initial.id.slice(prefix.length));
}
function openPalette(){
  if(!$('#uxPaletteWrap'))return;
  lastFocus=document.activeElement;paletteOpen=true;
  $('#uxPaletteWrap').classList.remove('hidden');document.body.classList.add('ux-search-open');$('.ux-search-launch')?.setAttribute('aria-expanded','true');
  $('#uxPaletteInput').value='';activeIndex=0;renderPalette('');
  $('#uxPaletteInput').focus();
}
function closePalette(){
  if(!paletteOpen)return;
  paletteOpen=false;$('#uxPaletteWrap').classList.add('hidden');document.body.classList.remove('ux-search-open');$('.ux-search-launch')?.setAttribute('aria-expanded','false');
  if(lastFocus?.isConnected)lastFocus.focus();
}
function renderPalette(query){
  const box=$('#uxPaletteResults');if(!box)return;
  const norm=s=>s.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');const q=norm(query.trim());
  const candidates=visiblePages();
  paletteEntries=candidates.filter(id=>!q || matchesQuery(id,q));
  if(!q){const fav=favorites().filter(id=>paletteEntries.includes(id));const recent=safeStore.get(historyKey(),[]).filter(id=>paletteEntries.includes(id));paletteEntries=[...new Set([...fav,...recent,...paletteEntries])];}
  activeIndex=0;box.replaceChildren();
  if(!paletteEntries.length){const none=addElement(box,'div','ux-palette-empty','Aucune fonction correspondante. Essayez un autre mot.');none.setAttribute('role','status');return;}
  paletteEntries.forEach((id,i)=>{
    const row=makeButton(box,'ux-palette-result','',()=>openPage(id));row.dataset.entry=id;row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===0));
    addElement(row,'span','ux-result-glyph',id===currentPage?'●':'↗');
    const copy=addElement(row,'span','ux-result-copy');addElement(copy,'strong','',getTitle(id));addElement(copy,'small','',pages[id].what);
    addElement(row,'span','ux-result-group',pages[id].group);
  });
  highlightResult();
}
function highlightResult(){
  $$('.ux-palette-result').forEach((row,index)=>{row.classList.toggle('on',index===activeIndex);row.setAttribute('aria-selected',String(index===activeIndex))});
  $$('.ux-palette-result')[activeIndex]?.scrollIntoView({block:'nearest'});
}

// For login and public pages, the shared experience CSS enhances the existing
// semantics; no active JS or privacy-invasive tracking is added.
if(appRoot && $(sectionSelector)){
  // On the admin login page, do not expose internal navigation before authentication.
  if(isAdmin && appRoot.classList.contains('hidden')){
    const readyObserver=new MutationObserver(()=>{if(!appRoot.classList.contains('hidden')){readyObserver.disconnect();createShell()}});
    readyObserver.observe(appRoot,{attributes:true,attributeFilter:['class']});
  } else createShell();
}
