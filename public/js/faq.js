const search=document.getElementById('faqSearch');
const items=[...document.querySelectorAll('[data-faq]')];
const groups=[...document.querySelectorAll('[data-faq-group]')];
const count=document.getElementById('faqCount');
function normalize(v){return (v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function update(){const q=normalize(search?.value);let visible=0;for(const item of items){const ok=!q||normalize(item.textContent).includes(q);item.hidden=!ok;if(ok)visible++;}for(const group of groups){group.hidden=!group.querySelector('[data-faq]:not([hidden])');}if(count)count.textContent=q?`${visible} réponse${visible>1?'s':''} trouvée${visible>1?'s':''}`:'';}
search?.addEventListener('input',update);
