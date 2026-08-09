// Athletic Cut Coach v4.8.11 — recovery state synchronization
(function(){
'use strict';
const VERSION='v4.8.11';
const nz=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const D=()=>window.db?.health?.daily||{};
const days=()=>Object.keys(D()).sort();
function latest(k){for(let i=days().length-1;i>=0;i--){const d=days()[i],v=D()[d]?.[k];if(nz(v))return{v,date:d}}return null}
function avg(k,n=28){const a=[];for(let i=days().length-1;i>=0&&a.length<n;i--){const v=D()[days()[i]]?.[k];if(nz(v))a.push(v)}return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
function domFactors(){const a=[...document.querySelectorAll('#v473Home .v473-factors > div b')].map(e=>e.textContent.trim());const num=s=>{const m=String(s||'').replace(',','.').match(/\d+(?:\.\d+)?/);return m?Number(m[0]):0};const sleep=a[0]?(()=>{const h=Number((a[0].match(/(\d+)\s*h/)||[])[1]||0),m=Number((a[0].match(/(\d+)\s*min/)||[])[1]||0);return h+m/60})():0;return{sleep,hrv:num(a[1]),restingHR:num(a[2])}}
function calc(){let sl=latest('sleep'),hv=latest('hrv'),rh=latest('restingHR');const f=domFactors();if(!sl&&nz(f.sleep))sl={v:f.sleep,date:'ui'};if(!hv&&nz(f.hrv))hv={v:f.hrv,date:'ui'};if(!rh&&nz(f.restingHR))rh={v:f.restingHR,date:'ui'};let sum=0,w=0;if(sl){sum+=clamp(sl.v/8*100)*.4;w+=.4}if(hv){const b=avg('hrv')||hv.v;sum+=clamp(75+(hv.v-b)/Math.max(b,1)*100)*.3;w+=.3}if(rh){const b=avg('restingHR')||rh.v;sum+=clamp(80-(rh.v-b)*4)*.3;w+=.3}return{score:w?Math.round(sum/w):null,sl,hv,rh,count:[sl,hv,rh].filter(Boolean).length}}
function state(s){if(s==null)return['Sin línea base','Importa Apple Salud para calcular recuperación','neutral'];if(s>=80)return['Óptima','Puedes mantener o progresar','good'];if(s>=60)return['Buena','Mantén la sesión prevista','good'];if(s>=40)return['Moderada','Controla el volumen','warn'];return['Baja','Prioriza recuperación','bad']}
function sync(){const root=document.getElementById('v473Home');if(!root)return;const x=calc(),hero=root.querySelector('.v473-hero');if(!hero)return;const valid=x.count>=2&&(x.sl||x.hv);const note=root.querySelector('.v473-device-note');if(valid||days().length||window.db?.health?.lastImport){if(note&&/Cargando Salud/i.test(note.textContent||''))note.remove()}if(!valid)return;window.__CUT_COACH_HEALTH_HYDRATED=true;const [name,advice,tone]=state(x.score);hero.classList.remove('neutral','good','warn','bad');hero.classList.add(tone);const score=hero.querySelector('.v473-ring strong'),ring=hero.querySelector('.v473-ring'),title=hero.querySelector('.v473-recovery h2'),p=hero.querySelector('.v473-recovery p');if(score)score.textContent=String(x.score);if(ring)ring.style.setProperty('--p',String(x.score));if(title)title.textContent=name;if(p)p.textContent=advice}
function stamp(){document.querySelectorAll('.v473-version').forEach(e=>e.textContent=VERSION);window.__CUT_COACH_UI_VERSION=VERSION}
function apply(){try{stamp();sync()}catch(e){console.error('v4.8.11 recovery sync',e)}}
function boot(){apply();const old=window.render;if(typeof old==='function'&&!old.__v4811){const w=function(){const r=old.apply(this,arguments);queueMicrotask(apply);return r};w.__v4811=true;window.render=w}window.addEventListener('cutcoach-health-hydrated',()=>queueMicrotask(apply));[250,750,1500,3000].forEach(t=>setTimeout(apply,t));const mo=new MutationObserver(()=>queueMicrotask(apply));const home=document.getElementById('inicio');if(home)mo.observe(home,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250));else setTimeout(boot,250);
})();
