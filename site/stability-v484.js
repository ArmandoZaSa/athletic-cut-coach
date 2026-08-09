// Athletic Cut Coach v4.8.5 — isolated UI/recovery fix; no parser or persistence changes
(function(){
'use strict';
const VERSION='v4.8.5';
const nz=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
function daily(){return window.db?.health?.daily||{}}
function orderedDays(){return Object.keys(daily()).sort().reverse()}
function latest(k){for(const d of orderedDays()){const v=daily()[d]?.[k];if(nz(v))return{v,date:d}}return null}
function diagnostics(){return window.db?.health?.diagnostics?.targetIdentifiers||{}}
function status(id){return diagnostics()[id]?.status||null}
function labelStatus(s){if(s==='present-and-parsed')return'Presente y procesada';if(s==='present-but-unparsed')return'Presente, pero no procesada';if(s==='absent-from-file')return'Ausente del export.xml';return'Sin diagnóstico disponible'}
function stamp(){const el=document.querySelector('.brand .v473-version');if(el)el.textContent=VERSION}
function clearFalseLoading(){const root=document.getElementById('v473Home');if(!root)return;if(orderedDays().length||window.db?.health?.lastImport){const note=root.querySelector('.v473-device-note');if(note&&/Cargando Salud/i.test(note.textContent||''))note.remove()}}
function recoveryGuard(){const root=document.getElementById('v473Home');if(!root)return;const sl=latest('sleep'),hv=latest('hrv'),rh=latest('restingHR');const count=[sl,hv,rh].filter(Boolean).length;const valid=count>=2&&(!!sl||!!hv);if(valid)return;const hero=root.querySelector('.v473-hero');if(!hero)return;hero.classList.remove('good','warn','bad');const score=hero.querySelector('.v473-ring strong');const ring=hero.querySelector('.v473-ring');const title=hero.querySelector('.v473-recovery h2');const advice=hero.querySelector('.v473-recovery p');const missing=[];if(!sl)missing.push('Sueño');if(!hv)missing.push('HRV');if(!rh)missing.push('FC reposo');if(score)score.textContent='—';if(ring)ring.style.setProperty('--p','0');if(title)title.textContent='Datos insuficientes';if(advice)advice.textContent=`Faltan ${missing.join(', ')} para estimar recuperación con confianza.`}
function renderDiagnosticCard(){const sec=document.getElementById('salud');if(!sec)return;let box=document.getElementById('v485CriticalDiagnostics');const sleep=status('HKCategoryTypeIdentifierSleepAnalysis');const hrv=status('HKQuantityTypeIdentifierHeartRateVariabilitySDNN');const rhr=status('HKQuantityTypeIdentifierRestingHeartRate');if(!box){box=document.createElement('div');box.id='v485CriticalDiagnostics';box.className='card';const visual=document.getElementById('v473Health');if(visual)visual.after(box);else sec.prepend(box)}box.innerHTML=`<h2>Integridad de recuperación</h2><div class="small" style="margin-bottom:10px">Diagnóstico del export.xml ya almacenado. No requiere volver a importar.</div><div class="trend"><div><b>Sueño</b><div class="tiny">SleepAnalysis</div></div><div class="trendValue"><b>${labelStatus(sleep)}</b></div></div><div class="trend"><div><b>HRV</b><div class="tiny">HeartRateVariabilitySDNN</div></div><div class="trendValue"><b>${labelStatus(hrv)}</b></div></div><div class="trend"><div><b>FC reposo</b><div class="tiny">RestingHeartRate</div></div><div class="trendValue"><b>${labelStatus(rhr)}</b></div></div>`}
function apply(){try{stamp();clearFalseLoading();recoveryGuard();renderDiagnosticCard()}catch(e){console.error('v4.8.5 UI fix',e)}}
function boot(){apply();const old=window.render;if(typeof old==='function'&&!old.__v485fix){const wrapped=function(){const r=old.apply(this,arguments);queueMicrotask(apply);return r};wrapped.__v485fix=true;window.render=wrapped}window.addEventListener('cutcoach-health-hydrated',apply)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250));else setTimeout(boot,250);
})();
