// Athletic Cut Coach v4.8.4 — hydration + recovery quality guard
(function(){
'use strict';
const VERSION='v4.8.4';
const nonzero=v=>typeof v==='number'&&isFinite(v)&&v>0;
const days=()=>Object.keys(window.db?.health?.daily||{}).sort();
function latest(k){for(const d of days().slice().reverse()){const v=db.health.daily[d]?.[k];if(nonzero(v))return{v,date:d}}return null}
function quality(){const sleep=latest('sleep'),hrv=latest('hrv'),rhr=latest('restingHR');const count=[sleep,hrv,rhr].filter(Boolean).length;return{sleep,hrv,rhr,count,valid:count>=2&&(!!sleep||!!hrv)}}
function missingText(q){const m=[];if(!q.sleep)m.push('Sueño');if(!q.hrv)m.push('HRV');if(!q.rhr)m.push('FC reposo');return m.length?`Faltan ${m.join(' y ')}`:'Datos suficientes'}
function enforceRecovery(){const root=document.getElementById('v473Home');if(!root)return;const q=quality();const hero=root.querySelector('.v473-hero');if(!hero)return;
 const note=root.querySelector('.v473-device-note');if(window.__CUT_COACH_HEALTH_HYDRATED&&note&&days().length)note.remove();
 if(!q.valid){hero.classList.remove('good','warn','bad');const score=hero.querySelector('.v473-ring strong'),title=hero.querySelector('.v473-recovery h2'),advice=hero.querySelector('.v473-recovery p'),ring=hero.querySelector('.v473-ring');if(score)score.textContent='—';if(title)title.textContent='Datos insuficientes';if(advice)advice.textContent=`${missingText(q)} para estimar recuperación con confianza.`;if(ring)ring.style.setProperty('--p','0')}
}
function targetStatus(id){return db?.health?.diagnostics?.targetIdentifiers?.[id]?.status||null}
function renderQuality(){const root=document.getElementById('v473Home');if(!root)return;let box=document.getElementById('v484DataQuality');const sleep=targetStatus('HKCategoryTypeIdentifierSleepAnalysis'),hrv=targetStatus('HKQuantityTypeIdentifierHeartRateVariabilitySDNN');const items=[];if(sleep==='absent-from-file')items.push('Sueño no está presente en este export.xml');else if(sleep==='present-but-unparsed')items.push('Sueño está presente, pero no fue procesado');if(hrv==='absent-from-file')items.push('HRV no está presente en este export.xml');else if(hrv==='present-but-unparsed')items.push('HRV está presente, pero no fue procesado');if(!items.length){box?.remove();return}if(!box){box=document.createElement('div');box.id='v484DataQuality';box.className='v473-device-note';const hero=root.querySelector('.v473-hero');hero?.after(box)}box.innerHTML=`<b>Calidad de datos</b><span>${items.join(' · ')}</span>`}
function enforce(){enforceRecovery();renderQuality();const b=document.querySelector('.brand');if(b)b.querySelector('.v473-version')?.replaceChildren(document.createTextNode(VERSION));}
async function hydrate(){try{if(window.CutCoachHealthCore?.load){const saved=await window.CutCoachHealthCore.load();if(saved){window.db.health=saved;window.mergeHealth?.()}}}catch(e){console.error('v4.8.4 hydration',e)}finally{window.__CUT_COACH_HEALTH_HYDRATED=true;window.dispatchEvent(new Event('cutcoach-health-hydrated'));window.render?.();queueMicrotask(enforce)}}
function boot(){hydrate();const mo=new MutationObserver(()=>queueMicrotask(enforce));mo.observe(document.body,{childList:true,subtree:true});setInterval(enforce,1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
