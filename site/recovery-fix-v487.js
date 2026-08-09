// Athletic Cut Coach v4.8.7 — deterministic line-based Sleep + HRV recovery pass
(function(){
'use strict';
const VERSION='v4.8.7', CHUNK=2*1024*1024;
const SLEEP='HKCategoryTypeIdentifierSleepAnalysis';
const HRV='HKQuantityTypeIdentifierHeartRateVariabilitySDNN';
function attrs(line){const o={};const re=/([A-Za-z0-9_:.-]+)="([^"]*)"/g;let m;while((m=re.exec(line)))o[m[1]]=m[2].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');return o}
function parseAppleDate(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})\s*([+-])(\d{2})(\d{2})$/);if(!m)return NaN;const[,Y,M,D,h,mi,se,sg,oh,om]=m;const offset=(Number(oh)*60+Number(om))*(sg==='+'?1:-1);return Date.UTC(+Y,+M-1,+D,+h,+mi,+se)-offset*60000}
function sleepPriority(src){const s=String(src||'').toLowerCase();if(s.includes('huawei')&&s.includes('global'))return 0;if(s.includes('huawei'))return 1;if(s.includes('watch'))return 2;if(s.includes('iphone'))return 4;return 3}
function hrvPriority(src){const s=String(src||'').toLowerCase();if(s.includes('watch'))return 0;if(s.includes('health'))return 1;if(s.includes('huawei'))return 2;return 3}
async function scan(file,onProgress){
 const dec=new TextDecoder('utf-8');let off=0,buf='';
 const sleepBySource={},sleepCount={},hrvBySource={},hrvCount={};
 function line(raw){
   if(!raw.includes('<Record'))return;
   if(raw.includes(SLEEP)){
     const x=attrs(raw),v=String(x.value||'').toLowerCase();
     if(v.includes('awake')||v.includes('inbed'))return;
     if(!(v.includes('asleep')||v.includes('core')||v.includes('deep')||v.includes('rem')))return;
     const st=parseAppleDate(x.startDate),en=parseAppleDate(x.endDate);if(!Number.isFinite(st)||!Number.isFinite(en)||en<=st)return;
     const h=(en-st)/36e5;if(!(h>0&&h<=24))return;
     const day=String(x.endDate||x.startDate||'').slice(0,10),src=x.sourceName||'Desconocido';if(!day)return;
     (sleepBySource[src]??={})[day]=((sleepBySource[src]||{})[day]||0)+h;sleepCount[src]=(sleepCount[src]||0)+1;
   } else if(raw.includes(HRV)){
     const x=attrs(raw),v=Number(x.value);if(!Number.isFinite(v)||v<=0)return;
     const day=String(x.startDate||x.creationDate||'').slice(0,10),src=x.sourceName||'Desconocido';if(!day)return;
     const unit=String(x.unit||'').toLowerCase(),ms=unit==='s'?v*1000:v;
     const b=(hrvBySource[src]??={})[day]??={sum:0,n:0};b.sum+=ms;b.n++;hrvBySource[src][day]=b;hrvCount[src]=(hrvCount[src]||0)+1;
   }
 }
 while(off<file.size){const end=Math.min(file.size,off+CHUNK);buf+=dec.decode(await file.slice(off,end).arrayBuffer(),{stream:end<file.size});off=end;const rows=buf.split(/\r?\n/);buf=rows.pop()||'';for(const r of rows)line(r);onProgress?.(Math.round(off/file.size*100),sleepCount,hrvCount);await new Promise(r=>setTimeout(r,0))}
 buf+=dec.decode();if(buf)line(buf);
 function chooseSleep(){const out={},days=new Set();Object.values(sleepBySource).forEach(ds=>Object.keys(ds).forEach(d=>days.add(d)));for(const d of days){const a=[];for(const[src,ds]of Object.entries(sleepBySource)){const v=ds[d]||0;if(v>0)a.push({src,v,p:sleepPriority(src)})}a.sort((x,y)=>x.p-y.p||y.v-x.v);if(a[0])out[d]=a[0]}return out}
 function chooseHrv(){const out={},days=new Set();Object.values(hrvBySource).forEach(ds=>Object.keys(ds).forEach(d=>days.add(d)));for(const d of days){const a=[];for(const[src,ds]of Object.entries(hrvBySource)){const b=ds[d];if(b?.n)a.push({src,v:b.sum/b.n,p:hrvPriority(src),n:b.n})}a.sort((x,y)=>x.p-y.p||y.n-x.n);if(a[0])out[d]=a[0]}return out}
 return{sleep:chooseSleep(),hrv:chooseHrv(),sleepCount,hrvCount};
}
async function repair(file){
 const st=document.getElementById('importStatus'),bar=document.getElementById('importProgress');const set=(p,m)=>{if(bar)bar.style.width=p+'%';if(st)st.textContent=m};
 set(1,'Validando Sueño + HRV con lector iOS…');
 const r=await scan(file,(p,sc,hc)=>set(Math.min(99,p),`Recuperando Sueño + HRV ${p}% · sueño ${Object.values(sc).reduce((a,b)=>a+b,0).toLocaleString('es-MX')} · HRV ${Object.values(hc).reduce((a,b)=>a+b,0).toLocaleString('es-MX')}`));
 db.health??={};db.health.daily??={};db.health.provenance??={};db.health.sourceStats??={};db.health.diagnostics??={};
 for(const[d,x]of Object.entries(r.sleep)){db.health.daily[d]??={};db.health.daily[d].sleep=+x.v.toFixed(2);db.health.provenance[d]??={};db.health.provenance[d].sleep={source:x.src,policy:'v4.8.7 line-based recovery'}}
 for(const[d,x]of Object.entries(r.hrv)){db.health.daily[d]??={};db.health.daily[d].hrv=+x.v.toFixed(1);db.health.provenance[d]??={};db.health.provenance[d].hrv={source:x.src,policy:'v4.8.7 line-based recovery',samples:x.n}}
 for(const[src,n]of Object.entries(r.sleepCount)){db.health.sourceStats[src]??={};db.health.sourceStats[src].sleep=n}
 for(const[src,n]of Object.entries(r.hrvCount)){db.health.sourceStats[src]??={};db.health.sourceStats[src].hrv=n}
 db.health.diagnostics.recoveryRepair={version:VERSION,sleepDays:Object.keys(r.sleep).length,hrvDays:Object.keys(r.hrv).length,sleepRecords:Object.values(r.sleepCount).reduce((a,b)=>a+b,0),hrvRecords:Object.values(r.hrvCount).reduce((a,b)=>a+b,0),completedAt:new Date().toISOString()};
 if(window.CutCoachHealthCore?.save)await window.CutCoachHealthCore.save(db.health);
 window.mergeHealth?.();window.render?.();window.renderSourceInsights?.();window.dispatchEvent(new Event('cutcoach-health-hydrated'));
 const sd=Object.keys(r.sleep).sort().at(-1),hd=Object.keys(r.hrv).sort().at(-1),sv=sd?r.sleep[sd]:null,hv=hd?r.hrv[hd]:null;
 const sm=sv?`${Math.floor(sv.v)} h ${Math.round((sv.v%1)*60)} min (${sd})`:'sin sueño';const hm=hv?`${hv.v.toFixed(1)} ms (${hd})`:'sin HRV';
 set(100,`Recuperación integrada · Sueño ${sm} · HRV ${hm}`);
}
function install(){const old=window.handleHealthFile;if(typeof old!=='function'||old.__recovery487)return setTimeout(install,250);const wrapped=async function(e){const file=e?.target?.files?.[0];await old.call(this,e);if(file)try{await repair(file)}catch(err){console.error('recovery repair',err);const st=document.getElementById('importStatus');if(st)st.textContent='Error al recuperar Sueño/HRV: '+(err?.message||err)}};wrapped.__recovery487=true;window.handleHealthFile=wrapped}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,500));else setTimeout(install,500);
})();