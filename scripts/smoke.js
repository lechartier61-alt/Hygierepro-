const base=process.env.SMOKE_URL||'http://127.0.0.1:3000';
const email=`smoke-${Date.now()}@example.test`;
async function req(path,{method='GET',body,cookie,csrf}={}){const headers={};if(body!==undefined)headers['content-type']='application/json';if(cookie)headers.cookie=cookie;if(csrf)headers['x-csrf-token']=csrf;const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});const txt=await r.text();let data;try{data=JSON.parse(txt)}catch{data=txt}if(!r.ok)throw new Error(`${method} ${path} -> ${r.status} ${txt}`);return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
let x=await req('/health');if(!x.data.ok)throw new Error('health');
x=await req('/api/auth/register',{method:'POST',body:{organizationName:'Smoke Restaurant',businessType:'restaurant',name:'Gérant Smoke',email,password:'SmokePassword!2026'}});const cookie=x.cookie,csrf=x.data.csrf;if(!x.data.organization?.trialEndsAt)throw new Error('trial missing');
if(!x.data.verificationToken)throw new Error('verification token missing in test mode');
await req('/api/auth/email-verification/verify',{method:'POST',body:{token:x.data.verificationToken},cookie,csrf});
const me=await req('/api/auth/me',{cookie});if(me.data.organization.onboarding_completed)throw new Error('onboarding should be incomplete');
for(const [step,body] of [[1,{name:'Smoke Restaurant',businessType:'restaurant'}],[2,{fridges:2,freezers:1,coldRoomsPositive:0,coldRoomsNegative:0,displayFridges:0,fryers:1}],[3,{temperaturePerDay:2,cleaning:true,dlc:true,handwash:true,oil:true,closingTime:'22:00'}],[4,{}],[5,{}]])await req(`/api/onboarding/step/${step}`,{method:'PUT',body,cookie,csrf});
const actions=await req('/api/records/today-actions',{cookie});if(!Array.isArray(actions.data)||actions.data.length<1)throw new Error('today actions missing');
const dash=await req('/api/records/dashboard',{cookie});if(typeof dash.data.pending!=='number')throw new Error('dashboard');
const pinSearch=await fetch(base+'/login.html').then(r=>r.text());if(/\bPIN\b|code entreprise/i.test(pinSearch))throw new Error('PIN/code entreprise found in login');
console.log('SMOKE OK', {email,actions:actions.data.length,pending:dash.data.pending});
