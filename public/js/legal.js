async function init(){
  try{
    const d=await fetch('/api/public/settings').then(r=>r.json()),l=d.legal||{};
    document.querySelectorAll('[data-legal]').forEach(el=>{const v=l[el.dataset.legal];el.textContent=v||'À compléter';el.classList.toggle('missing',!v)});
    document.querySelectorAll('[data-price]').forEach(el=>el.textContent=(d.price.amountCents/100).toFixed(2).replace('.',',')+' € HT');
    const n=document.querySelector('#legalMissingNotice');if(n)n.hidden=!!d.legalReady;
  }catch{}
}
init();
