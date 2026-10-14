let deferredPrompt=null;
const subscribers=new Set();
const displayMode=window.matchMedia?.('(display-mode: standalone)');

function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function isAndroid(){return /android/i.test(navigator.userAgent)}
function isStandalone(){return Boolean(displayMode?.matches||navigator.standalone===true)}
function platform(){if(isIos())return 'ios';if(isAndroid())return 'android';if(/windows/i.test(navigator.userAgent))return 'windows';if(/macintosh|mac os x/i.test(navigator.userAgent))return 'mac';return 'desktop'}
function notify(){const state=getPwaInstallState();subscribers.forEach(fn=>{try{fn(state)}catch{}});window.dispatchEvent(new CustomEvent('hygiesafe:pwa-state',{detail:state}))}

window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;notify()});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;try{localStorage.setItem('hpPwaInstalledAt',new Date().toISOString());localStorage.removeItem('hpInstallNudgePending')}catch{}notify()});
displayMode?.addEventListener?.('change',notify);

export function getPwaInstallState(){
  return {installed:isStandalone(),canPrompt:!!deferredPrompt,platform:platform(),ios:isIos(),android:isAndroid()};
}

export function getManualInstallInstructions(){
  const p=platform();
  if(p==='ios')return {title:'Installer sur iPhone ou iPad',steps:['Ouvrez HygieSafe dans Safari.','Touchez le bouton Partager.','Choisissez « Sur l’écran d’accueil ».','Touchez « Ajouter ».']};
  if(p==='android')return {title:'Installer sur Android',steps:['Ouvrez HygieSafe dans Chrome.','Ouvrez le menu ⋮ du navigateur.','Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».','Confirmez l’installation.']};
  if(p==='windows')return {title:'Installer sur votre PC',steps:['Ouvrez HygieSafe dans Chrome ou Microsoft Edge.','Utilisez l’icône d’installation dans la barre d’adresse ou le menu du navigateur.','Choisissez « Installer HygieSafe ».']};
  if(p==='mac')return {title:'Installer sur votre Mac',steps:['Dans Chrome ou Edge, utilisez l’icône d’installation dans la barre d’adresse.','Dans Safari récent, utilisez Fichier → Ajouter au Dock si cette option est proposée.','Confirmez pour créer l’application HygieSafe.']};
  return {title:'Installer HygieSafe',steps:['Ouvrez le menu de votre navigateur.','Cherchez « Installer l’application », « Ajouter à l’écran d’accueil » ou « Créer un raccourci ».','Confirmez l’ajout de HygieSafe.']};
}

export async function requestPwaInstall(){
  if(isStandalone())return {status:'installed'};
  if(!deferredPrompt)return {status:'manual',...getManualInstallInstructions()};
  const prompt=deferredPrompt;deferredPrompt=null;
  await prompt.prompt();
  const choice=await prompt.userChoice.catch(()=>({outcome:'dismissed'}));
  if(choice?.outcome==='accepted'){try{localStorage.removeItem('hpInstallNudgePending')}catch{};return {status:'accepted'}}
  notify();return {status:'dismissed'};
}

export function subscribePwaInstall(fn){subscribers.add(fn);return()=>subscribers.delete(fn)}
