async function sessionTarget(){
  try{
    const r=await fetch('/api/auth/me',{cache:'no-store',credentials:'same-origin'});
    return r.ok?'/app.html':null;
  }catch{return null}
}

async function initBrand(){
  const brand=document.querySelector('#homeBrand');
  if(!brand)return;
  const sessionPromise=sessionTarget();
  let dashboard=null;
  sessionPromise.then(target=>{
    dashboard=target;
    if(target){
      brand.href=target;
      brand.setAttribute('aria-label','Ouvrir le tableau de bord HygieSafe');
      brand.title='Tableau de bord';
    }
  });
  brand.addEventListener('click',async e=>{
    e.preventDefault();
    const target=dashboard||await sessionPromise;
    if(target){location.href=target;return}
    brand.href='#hero';
    brand.setAttribute('aria-label','Retour en haut de la page');
    brand.title='Retour en haut';
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  });
}

async function init(){try{const s=await fetch('/api/public/settings').then(r=>r.json());if(s.hero?.title)document.querySelector('#heroTitle').textContent=s.hero.title;if(s.hero?.subtitle)document.querySelector('#heroSubtitle').textContent=s.hero.subtitle;if(s.hero?.fallbackUrl)document.querySelector('#hero').style.backgroundImage=`url('${String(s.hero.fallbackUrl).replace(/'/g,'')}')`;if(s.hero?.videoUrl){const v=document.querySelector('#heroVideo');v.src=s.hero.videoUrl;v.classList.remove('hidden');document.querySelector('#hero').classList.remove('no-video');v.play().catch(()=>{});}}catch(e){console.warn('Public settings',e)}}
initBrand();
init();


function initLandingTabs(){
  const buttons=[...document.querySelectorAll('[data-landing-tab]')];
  const panels=[...document.querySelectorAll('[data-landing-panel]')];
  if(!buttons.length)return;
  const activate=name=>{
    buttons.forEach(b=>{const on=b.dataset.landingTab===name;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;});
    panels.forEach(p=>{const on=p.dataset.landingPanel===name;p.hidden=!on;p.classList.toggle('on',on)});
  };
  buttons.forEach((b,i)=>{b.addEventListener('click',()=>activate(b.dataset.landingTab));b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const dir=e.key==='ArrowRight'?1:-1;const next=buttons[(i+dir+buttons.length)%buttons.length];activate(next.dataset.landingTab);next.focus();});});
  document.querySelectorAll('[data-tab-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();activate(a.dataset.tabLink);document.querySelector('#decouvrir')?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}));
}
initLandingTabs();
