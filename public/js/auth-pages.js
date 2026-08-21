const $=s=>document.querySelector(s);
const msg=(text,bad=false)=>{const m=$('#msg');if(!m)return;m.textContent=text;m.className='form-msg '+(bad?'err':'ok')};
function busy(button,on,label='Chargement…'){
  if(!button)return;const text=button.querySelector('[data-btn-label]');
  if(on){button.dataset.previousLabel=text?.textContent||'';button.disabled=true;button.setAttribute('aria-busy','true');button.classList.add('is-loading');if(text)text.textContent=label}
  else{button.disabled=false;button.removeAttribute('aria-busy');button.classList.remove('is-loading');if(text&&button.dataset.previousLabel)text.textContent=button.dataset.previousLabel}
}
async function post(url,body,{csrf=''}={}){
  let r;const headers={'Content-Type':'application/json'};if(csrf)headers['X-CSRF-Token']=csrf;
  try{r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)})}
  catch{throw new Error('Connexion au serveur impossible. Vérifiez votre accès Internet puis réessayez.')}
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Une erreur est survenue.');
  return d;
}
async function sessionInfo(){try{const r=await fetch('/api/auth/me',{cache:'no-store'});return r.ok?await r.json():null}catch{return null}}

if($('#loginForm'))$('#loginForm').onsubmit=async e=>{
  e.preventDefault();const button=$('#loginSubmit');msg('');busy(button,true,'Connexion…');const f=new FormData(e.currentTarget);
  try{const d=await post('/api/auth/login',{email:f.get('email'),password:f.get('password'),remember:f.has('remember')});location.href=d.next||'/app.html'}
  catch(err){msg(err.message,true);busy(button,false)}
};

if($('#registerForm')){
  const s1=$('#regStep1'),s2=$('#regStep2');
  $('#regNext').onclick=()=>{if(!eValid(s1))return;s1.classList.add('hidden');s2.classList.remove('hidden');$('#stepBar2').classList.add('on');s2.querySelector('input')?.focus()};
  $('#regBack').onclick=()=>{s2.classList.add('hidden');s1.classList.remove('hidden');$('#stepBar2').classList.remove('on')};
  $('#registerForm').onsubmit=async e=>{
    e.preventDefault();const button=$('#registerSubmit');msg('');busy(button,true,'Création…');const f=new FormData(e.currentTarget);
    try{
      const d=await post('/api/auth/register',{organizationName:f.get('organizationName'),businessType:f.get('businessType'),name:f.get('name'),email:f.get('email'),password:f.get('password')});
      sessionStorage.setItem('hpVerificationEmail',String(f.get('email')||''));location.href=d.next||'/verify-email.html';
    }catch(err){msg(err.message,true);busy(button,false)}
  }
}
function eValid(section){const req=[...section.querySelectorAll('[required]')];for(const el of req){if(!el.checkValidity()){el.reportValidity();return false}}return true}

if($('#forgotForm'))$('#forgotForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const d=await post('/api/auth/forgot-password',{email:f.get('email')});msg(d.message||'E-mail envoyé.')}catch(err){msg(err.message,true)}};
if($('#resetForm'))$('#resetForm').onsubmit=async e=>{e.preventDefault();const token=new URLSearchParams(location.search).get('token');const f=new FormData(e.currentTarget);try{await post('/api/auth/reset-password',{token,password:f.get('password')});msg('Mot de passe modifié. Redirection…');setTimeout(()=>location.href='/login.html',900)}catch(err){msg(err.message,true)}};

if($('#inviteForm')){
  const token=new URLSearchParams(location.search).get('token');
  fetch('/api/auth/invite/'+encodeURIComponent(token)).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Invitation invalide');$('#inviteInfo').textContent=`${d.name}, vous êtes invité(e) à rejoindre ${d.organization_name} comme ${d.role==='manager'?'responsable':'employé(e)'}.`;$('#inviteFields').classList.remove('hidden');$('#inviteForm [name=name]').value=d.name;}).catch(e=>msg(e.message,true));
  $('#inviteForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const d=await post('/api/auth/invite/'+encodeURIComponent(token)+'/accept',{name:f.get('name'),password:f.get('password')});location.href=d.next||'/app.html'}catch(err){msg(err.message,true)}}
}

if($('#verifyEmailPage')){
  const token=new URLSearchParams(location.search).get('token');
  const emailEl=$('#verifyEmailAddress');const stored=sessionStorage.getItem('hpVerificationEmail');if(stored)emailEl.textContent=stored;
  (async()=>{
    const me=await sessionInfo();if(me?.user?.email){emailEl.textContent=me.user.email}
    if(me?.user?.emailVerified){msg('Votre adresse e-mail est déjà vérifiée.');$('#verifyActions')?.classList.add('hidden');$('#verifyContinue')?.classList.remove('hidden');return}
    if(!token)$('#verifyNow')?.classList.add('hidden');
    if(token){
      const button=$('#verifyNow');busy(button,true,'Vérification…');
      try{const d=await post('/api/auth/email-verification/verify',{token},{csrf:me?.csrf||''});msg('Adresse e-mail vérifiée. Votre espace est prêt.');$('#verifyActions').classList.add('hidden');$('#verifyContinue').classList.remove('hidden');sessionStorage.removeItem('hpVerificationEmail');}
      catch(err){msg(err.message,true);$('#verifyActions').classList.remove('hidden')}
      finally{busy(button,false)}
    }
  })();
  $('#resendVerification')?.addEventListener('click',async()=>{
    const button=$('#resendVerification');busy(button,true,'Envoi…');msg('');
    try{const me=await sessionInfo();if(!me)throw new Error('Reconnectez-vous pour renvoyer l’e-mail.');const d=await post('/api/auth/email-verification/resend',{}, {csrf:me.csrf});msg(d.message||'E-mail renvoyé.')}
    catch(err){msg(err.message,true)}finally{busy(button,false)}
  });
}
