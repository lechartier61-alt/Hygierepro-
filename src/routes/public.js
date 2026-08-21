import { Router } from 'express';
import { q } from '../db.js';
import { config } from '../config.js';
import { asyncRoute } from '../utils/http.js';
const r=Router();
r.get('/settings',asyncRoute(async(req,res)=>{
  const s=(await q('SELECT * FROM site_settings WHERE id=1')).rows[0]||{};
  const legalDefaults={
    companyName:'LIVRICI SOLUTIONS SAS',
    form:'SAS — société par actions simplifiée',
    capital:'2,00 €',
    siren:'100 815 471',
    siret:'100 815 471 00014',
    rcs:'100 815 471 RCS Vannes',
    rne:'SIREN 100 815 471',
    vat:'FR37100815471',
    naf:'6201Z — Programmation informatique',
    address:'5 Rue des Tulipiers — Lot 4 ZAC des Hameaux Verts — 56250 La Vraie-Croix, France',
    publisher:'Emerick Lechartier, Président',
    hostName:'Railway Corporation',
    hostAddress:'548 Market St PMB 68956, San Francisco, California 94104, États-Unis',
    hostPhone:'+1 415 707 7675',
    email:'',phone:'',privacyEmail:''
  };
  const envLegal={
    companyName:process.env.LEGAL_COMPANY_NAME||'',form:process.env.LEGAL_FORM||'',capital:process.env.LEGAL_CAPITAL||'',
    siren:process.env.LEGAL_SIREN||'',siret:process.env.LEGAL_SIRET||'',rcs:process.env.LEGAL_RCS||'',rne:process.env.LEGAL_RNE||'',
    vat:process.env.LEGAL_VAT||'',naf:process.env.LEGAL_NAF||'',address:process.env.LEGAL_ADDRESS||'',
    email:process.env.LEGAL_EMAIL||'',phone:process.env.LEGAL_PHONE||'',publisher:process.env.LEGAL_PUBLISHER||'',
    hostName:process.env.LEGAL_HOST_NAME||'',hostAddress:process.env.LEGAL_HOST_ADDRESS||'',hostPhone:process.env.LEGAL_HOST_PHONE||'',
    privacyEmail:process.env.LEGAL_PRIVACY_EMAIL||''
  };
  const compact=Object.fromEntries(Object.entries(envLegal).filter(([,v])=>v));
  const legal={...legalDefaults,...compact,...(s.legal||{})};
  if(!legal.email && s.support_email) legal.email=s.support_email;
  if(!legal.privacyEmail) legal.privacyEmail=legal.email||s.support_email||'';
  res.json({brand:'HygieSafe',price:{amountCents:config.stripe.amountCents,currency:config.stripe.currency,trialDays:14},hero:{title:s.hero_title,subtitle:s.hero_subtitle,videoUrl:s.hero_video_url,fallbackUrl:s.hero_fallback_url},supportEmail:s.support_email||legal.email||'',legal});
}));
export default r;
