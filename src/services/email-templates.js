import { config } from '../config.js';

function esc(value=''){
  return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function header(value=''){return String(value).replace(/[\r\n]+/g,' ').trim().slice(0,180)}

function absolute(path=''){
  try{return new URL(path,config.publicSiteUrl||config.appUrl).toString()}catch{return `${config.appUrl}${path}`}
}

const brand={
  green:'#087443', green2:'#0F9A5A', ink:'#13211A', muted:'#66756C', line:'#DDE8E1', soft:'#F3FAF6'
};

function button(label,url){
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:26px 0 22px"><tr><td bgcolor="${brand.green}" style="border-radius:12px;background:${brand.green}"><a href="${esc(url)}" style="display:inline-block;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${esc(label)}&nbsp;&nbsp;→</a></td></tr></table>`;
}

function infoRows(rows=[]){
  if(!rows.length)return '';
  return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;background:#F7FAF8;border:1px solid ${brand.line};border-radius:12px">${rows.map(([label,value])=>`<tr><td style="padding:11px 14px;border-bottom:1px solid #E8EFEA;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${brand.muted};width:38%">${esc(label)}</td><td style="padding:11px 14px;border-bottom:1px solid #E8EFEA;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:${brand.ink}">${esc(value)}</td></tr>`).join('').replace(/border-bottom:1px solid #E8EFEA([^<]*<\/td><\/tr>)$/,'border-bottom:0$1')}</table>`;
}

function layout({preheader,eyebrow,title,intro,body='',ctaLabel,ctaUrl,rows=[],securityNote,expiryText}){
  const logo=absolute('/assets/logo-hygiesafe.png');
  const home=config.publicSiteUrl||config.appUrl;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F4F7F5;color:${brand.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader||intro)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F4F7F5"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid ${brand.line};border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(20,64,42,.08)">
<tr><td style="height:6px;background:${brand.green}"></td></tr>
<tr><td style="padding:26px 34px 14px"><a href="${esc(home)}" style="text-decoration:none"><img src="${esc(logo)}" width="178" alt="HygieSafe" style="display:block;width:178px;max-width:70%;height:auto;border:0"></a></td></tr>
<tr><td style="padding:8px 34px 32px">
<div style="display:inline-block;margin-bottom:13px;padding:6px 10px;border-radius:999px;background:${brand.soft};color:${brand.green};font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">${esc(eyebrow)}</div>
<h1 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:35px;letter-spacing:-.4px;color:${brand.ink}">${esc(title)}</h1>
<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#44554B">${esc(intro)}</p>
${body}
${infoRows(rows)}
${ctaLabel&&ctaUrl?button(ctaLabel,ctaUrl):''}
${expiryText?`<p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${brand.muted}">${esc(expiryText)}</p>`:''}
${ctaUrl?`<div style="margin:22px 0 0;padding:14px 16px;background:#F7FAF8;border-radius:12px;border:1px solid ${brand.line}"><p style="margin:0 0 7px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:#53635A">Le bouton ne fonctionne pas ?</p><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:${brand.muted};word-break:break-all"><a href="${esc(ctaUrl)}" style="color:${brand.green};text-decoration:underline">${esc(ctaUrl)}</a></p></div>`:''}
${securityNote?`<div style="margin:22px 0 0;padding:14px 16px;border-left:4px solid ${brand.green2};background:${brand.soft};border-radius:0 10px 10px 0"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#355344"><strong>Sécurité :</strong> ${esc(securityNote)}</p></div>`:''}
</td></tr>
<tr><td style="padding:21px 34px;background:#F7FAF8;border-top:1px solid ${brand.line}"><p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;color:#405249">HygieSafe — Hygiène · Sécurité · Traçabilité</p><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#7B8981">LIVRICI SOLUTIONS SAS · La Vraie-Croix, France<br>Cet e-mail est envoyé automatiquement dans le cadre de l'utilisation de votre compte HygieSafe.</p></td></tr>
</table>
<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;color:#8B9891">© 2026 HygieSafe. Tous droits réservés.</p>
</td></tr></table></body></html>`;
}

export function verificationEmail({name,url}){
  return {
    subject:'Confirmez votre adresse e-mail — HygieSafe',
    text:`Bonjour ${name},\n\nBienvenue sur HygieSafe. Confirmez votre adresse e-mail pour activer votre espace :\n${url}\n\nCe lien est valable pendant 24 heures.\n\nSécurité : HygieSafe ne vous demandera jamais votre mot de passe par e-mail.\n\nHygieSafe — Hygiène · Sécurité · Traçabilité`,
    html:layout({
      preheader:'Confirmez votre adresse e-mail pour activer votre espace HygieSafe.',
      eyebrow:'Activation de votre espace',
      title:`Bienvenue ${name}`,
      intro:'Votre espace HygieSafe est presque prêt. Confirmez simplement votre adresse e-mail pour terminer l’activation et accéder à vos outils HACCP.',
      ctaLabel:'Confirmer mon adresse',ctaUrl:url,
      expiryText:'Ce lien de vérification est valable pendant 24 heures. Passé ce délai, vous pourrez en demander un nouveau depuis HygieSafe.',
      securityNote:'HygieSafe ne vous demandera jamais votre mot de passe, votre clé API ou vos informations bancaires par e-mail.'
    })
  };
}

export function passwordResetEmail({name,url}){
  return {
    subject:'Réinitialisation de votre mot de passe — HygieSafe',
    text:`Bonjour ${name},\n\nUne demande de réinitialisation de mot de passe a été effectuée pour votre compte HygieSafe.\n\nChoisissez un nouveau mot de passe :\n${url}\n\nCe lien expire dans 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet e-mail.\n\nSécurité : HygieSafe ne vous demandera jamais votre mot de passe par e-mail.`,
    html:layout({
      preheader:'Utilisez ce lien sécurisé pour choisir un nouveau mot de passe HygieSafe.',
      eyebrow:'Sécurité du compte',
      title:'Réinitialiser votre mot de passe',
      intro:`Bonjour ${name}. Nous avons reçu une demande de réinitialisation pour votre compte HygieSafe.`,
      body:'<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#53635A">Si vous êtes à l’origine de cette demande, utilisez le bouton ci-dessous pour choisir un nouveau mot de passe.</p>',
      ctaLabel:'Choisir un nouveau mot de passe',ctaUrl:url,
      expiryText:'Pour votre sécurité, ce lien expire automatiquement dans 1 heure et ne peut être utilisé qu’une seule fois.',
      securityNote:'Si vous n’avez pas demandé cette réinitialisation, aucune action n’est nécessaire. Votre mot de passe actuel reste inchangé.'
    })
  };
}

export function invitationEmail({name,inviterName,organizationName,role,url}){
  const roleLabel=role==='manager'?'Responsable':'Employé';
  return {
    subject:`Invitation à rejoindre ${header(organizationName)} sur HygieSafe`,
    text:`Bonjour ${name},\n\n${inviterName} vous invite à rejoindre ${organizationName} sur HygieSafe en tant que ${roleLabel}.\n\nCréez votre accès personnel :\n${url}\n\nCette invitation est personnelle. Ne transférez pas ce lien.\n\nHygieSafe — Hygiène · Sécurité · Traçabilité`,
    html:layout({
      preheader:`${inviterName} vous invite à rejoindre ${organizationName} sur HygieSafe.`,
      eyebrow:'Invitation à votre espace',
      title:`Bienvenue dans ${organizationName}`,
      intro:`Bonjour ${name}. ${inviterName} vous a invité à rejoindre l’équipe sur HygieSafe.`,
      rows:[['Établissement',organizationName],['Votre rôle',roleLabel],['Invité par',inviterName]],
      ctaLabel:'Créer mon accès personnel',ctaUrl:url,
      expiryText:'Cette invitation est personnelle et sécurisée. Utilisez-la uniquement pour créer votre propre accès HygieSafe.',
      securityNote:'Ne transférez pas ce lien d’invitation. HygieSafe ne vous demandera jamais de communiquer votre mot de passe à votre gérant ou à un autre membre de l’équipe.'
    })
  };
}
