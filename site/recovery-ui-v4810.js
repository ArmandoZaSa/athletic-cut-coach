// Athletic Cut Coach v4.8.10 — recovery state synchronization
(function(){
'use strict';
const VERSION='v4.8.10';
const nz=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const D=()=>window.db?.health?.daily||{};
const days=()=>Object.keys(D()).sort();
function latest(k){for(let i=days().length-1;i>=0;i--){const d=days()[i],v=D()[d]?.[k];if(nz(v))return{v,date:d}}return null}
function avg(k,n=28){const a=[];for(let i=days().length-1;i>=0&&a.length<n;i--){const v=D()[days()[i]]?.[k];if(nz(v))a.push(v)}return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
function calc(){const sl=latest('sleep'),hv=latest('hrv'),rh=latest('restingHR');let sum=0,w=0;if(sl){sum+=clamp(sl.v/8*100)*.4;w+=.4}if(hv){const b=avg('hrv')||hv.v;sum+=clamp(75+(hv.v-b)/Math.max(b,1)*100)*.3;w+=.3}if(rh){const b=avg('restingHR')||rh.v;sum+=clamp(80-(rh.v-b)*4)*.3;w+=.3}return{score:w?Math.round(sum/w):null,sl,hv,rh,count:[sl,hv,rh].filter(Boolean).length}}
function state(s){if(s==null)return['Sin línea base','Importa Apple Salud para calcular recuperación','neutral'];if(s>=80)return['Óptima','Puedes mantener o progresar','good'];if(s>=60)return['Buena','Mantén la sesión prevista','good'];if(s>=40)return['Moderada','Controla el volumen','warn'];return['Baja','Prioriza recuperación','bad']}
function clearLoading(){const root=document.getElementById('v473Home');if(!root)return;if(window.__CUT_COACH_HEALTH_HYDRATED||days().length||window.db?.health?.lastImport){root.querySelectorAll('.v473-device-note').forEach(n=>{if(/Cargando Salud/i.test(n.textContent||''))n.remove()})}}
function syncRecovery(){const root=document.getElementById('v473Home');if(!root)return;const x=calc(),hero=root.querySelector('.v473-hero');if(!hero)return;const valid=x.count>=2&&(x.sl||x.hv);if(!valid)return;const [name,advice,tone]=state(x.score);hero.classList.remove('neutral','good','warn','bad');hero.classList.add(tone);const score=hero.querySelector('.v473-ring strong'),ring=hero.querySelector('.v473-ring'),title=hero.querySelector('.v473-recovery h2'),p=hero.querySelector('.v473-recovery p');if(score)score.textContent=String(x.score);if(ring)ring.style.setProperty('--p',String(x.score));if(title)title.textContent=name;if(p)p.textContent=advice}
function stamp(){document.querySelectorAll('.v473-version').forEach(e=>e.textContent=VERSION);window.__CUT_COACH_UI_VERSION=VERSION}
function apply(){try{stamp();clearLoading();syncRecovery()}catch(e){console.error('v4.8.10 recovery sync',e)}}
function boot(){apply();const old=window.render;if(typeof old==='function'&&!old.__v4810){const w=function(){const r=old.apply(this,arguments);queueMicrotask(apply);return r};w.__v4810=true;window.render=w}window.addEventListener('cutcoach-health-hydrated',()=>queueMicrotask(apply));setTimeout(apply,500);setTimeout(apply,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250));else setTimeout(boot,250);
})();
