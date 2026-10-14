import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter=null;
function getTransport(){
  if(!config.smtp.host)return null;
  if(!transporter)transporter=nodemailer.createTransport({host:config.smtp.host,port:config.smtp.port,secure:config.smtp.secure,auth:config.smtp.user?{user:config.smtp.user,pass:config.smtp.pass}:undefined});
  return transporter;
}
export function emailProviderConfigured(){return !!((config.resend.apiKey&&config.resend.from)||config.smtp.host)}

async function sendWithResend({to,subject,text,html}){
  const payload={from:config.resend.from,to:[to],subject};
  if(text)payload.text=text;
  if(html)payload.html=html;
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${config.resend.apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(15000)
  });
  let body={};try{body=await response.json()}catch{}
  if(!response.ok)throw new Error(`Resend ${response.status}: ${String(body?.message||body?.name||'envoi refusé').slice(0,240)}`);
  return {provider:'resend',id:body.id||null};
}

export async function sendMail({to,subject,text,html}){
  if(config.resend.apiKey&&config.resend.from)return sendWithResend({to,subject,text,html});
  const t=getTransport();
  if(t)return t.sendMail({from:config.smtp.from,to,subject,text,html});
  if(config.env==='production')console.warn(`[mail] Aucun fournisseur e-mail configuré — e-mail non envoyé to=${to} subject=${subject}`);
  else console.log(`[mail-dev] to=${to} subject=${subject}\n${text||''}`);
  return {dev:true,provider:'none'};
}
