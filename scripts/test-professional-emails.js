import { verificationEmail,passwordResetEmail,invitationEmail } from '../src/services/email-templates.js';

const url='https://www.hygiesafe.com/verify-email.html?token=test-token-long-value';
const mails=[
  verificationEmail({name:'Marie Dupont',url}),
  passwordResetEmail({name:'Marie Dupont',url:url.replace('verify-email','reset')}),
  invitationEmail({name:'Lucas Martin',inviterName:'Marie Dupont',organizationName:'Restaurant Démo',role:'manager',url:url.replace('verify-email','invite')})
];
let ok=0;
for(const [i,m] of mails.entries()){
  const checks=[m.subject.length>8,m.text.includes('HygieSafe'),m.html.includes('<!doctype html>'),m.html.includes('logo-hygiesafe.png'),m.html.includes('Sécurité'),m.html.includes('LIVRICI SOLUTIONS SAS'),m.html.includes('href="https://www.hygiesafe.com/')];
  if(checks.every(Boolean)){console.log(`email ${i+1}: OK`);ok++}else{console.error(`email ${i+1}: ECHEC`,checks);process.exitCode=1}
}
console.log(`E-mails professionnels: ${ok}/${mails.length}`);
