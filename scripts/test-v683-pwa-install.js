import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const version=read('../src/version.js'),pkg=JSON.parse(read('../package.json')),manifest=JSON.parse(read('../public/manifest.webmanifest')),sw=read('../public/sw.js'),pwa=read('../public/js/pwa-install.js'),app=read('../public/js/app.js'),auth=read('../public/js/auth-pages.js'),appHtml=read('../public/app.html'),registerHtml=read('../public/register.html'),indexHtml=read('../public/index.html'),appCss=read('../public/css/app.css'),mainCss=read('../public/css/main.css');
let pass=0,fail=0;function t(n,v){if(v){pass++;console.log('✓',n)}else{fail++;console.error('✗',n)}}
[
 ['version cohérente',version.includes(`APP_VERSION='${pkg.version}'`)],
 ['manifest PWA possède id et scope',manifest.id==='/app.html'&&manifest.scope==='/'&&manifest.start_url==='/app.html'],
 ['manifest standalone',manifest.display==='standalone'&&manifest.theme_color==='#087443'],
 ['icônes 192 et 512',manifest.icons?.some(i=>i.sizes==='192x192')&&manifest.icons?.some(i=>i.sizes==='512x512')],
 ['nouveau cache PWA',sw.includes(`hygiesafe-v${pkg.version}-shell`)&&sw.includes("'/js/pwa-install.js'" )],
 ['service install détecté',pwa.includes("beforeinstallprompt")&&pwa.includes('requestPwaInstall')&&pwa.includes('appinstalled')],
 ['détection standalone',pwa.includes("display-mode: standalone")&&pwa.includes('navigator.standalone===true')],
 ['instructions iPhone/iPad',pwa.includes('Sur l’écran d’accueil')&&pwa.includes('Safari')],
 ['instructions Android',pwa.includes('Installer sur Android')&&pwa.includes('Ajouter à l’écran d’accueil')],
 ['instructions PC',pwa.includes('Installer sur votre PC')&&pwa.includes('Microsoft Edge')],
 ['Paramètres contient carte installation',app.includes('pwaSettingsCardHtml')&&app.includes('<h3>Installer HygieSafe</h3>')],
 ['bouton installation Paramètres',app.includes('id="installPwaSettings"')&&app.includes('runPwaInstall')],
 ['aide installation Paramètres',app.includes('installPwaHelpSettings')&&app.includes('openPwaInstallHelp')],
 ['notification après inscription mémorisée',auth.includes("localStorage.setItem('hpInstallNudgePending'")],
 ['notification visible sur page inscription',auth.includes('renderSignupInstallNotice')&&auth.includes('HygieSafe peut aussi s’installer comme une application')],
 ['rappel dans application',app.includes('maybeShowPwaInstallNudge')&&app.includes('Installez HygieSafe sur cet appareil')],
 ['installation proposée après onboarding',app.includes("setTimeout(()=>maybeShowPwaInstallNudge(),1800)")],
 ['manifest sur application',appHtml.includes('rel="manifest" href="/manifest.webmanifest"')&&appHtml.includes('apple-touch-icon')],
 ['manifest sur inscription',registerHtml.includes('rel="manifest" href="/manifest.webmanifest"')&&registerHtml.includes(`register-sw.js?v=${pkg.version}`)],
 ['manifest sur accueil public',indexHtml.includes('rel="manifest" href="/manifest.webmanifest"')&&indexHtml.includes(`register-sw.js?v=${pkg.version}`)],
 ['styles Paramètres PWA',appCss.includes('Installation PWA')&&appCss.includes('.pwa-install-nudge')],
 ['styles notification inscription',mainCss.includes('installation PWA depuis l’inscription')&&mainCss.includes('.pwa-signup-notice')],
].forEach(([n,v])=>t(n,v));
console.log(`\n${pass}/${pass+fail} contrôles PWA v6.8.3+ réussis`);if(fail)process.exit(1);
