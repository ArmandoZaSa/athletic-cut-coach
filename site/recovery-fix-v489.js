// Athletic Cut Coach v4.8.9 — verified Sleep + HRV ingestion and file identity diagnostics
(function(){
'use strict';
const VERSION='v4.8.9', CHUNK=4*1024*1024;
const SLEEP='HKCategoryTypeIdentifierSleepAnalysis';
const HRV='HKQuantityTypeIdentifierHeartRateVariabilitySDNN';
const VALID_SLEEP=['HKCategoryValueSleepAnalysisAsleep','HKCategoryValueSleepAnalysisAsleepUnspecified','HKCategoryValueSleepAnalysisAsleepCore','HKCategoryValueSleepAnalysisAsleepDeep','HKCategoryValueSleepAnalysisAsleepREM'];
function attrs(tag){const o={};const re=/([A-Za-z0-9_:.-]+)="([^"]*)"/g;let m;while((m=re.exec(tag)))o[m[1]]=m[2].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');return o}
function parseAppleDate(s){const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})\s*([+-])(\d{2})(\d{2})$/);if(!m)return NaN;const[,Y,M,D,h,mi,se,sg,oh,om]=m;const z=(Number(oh)*60+Number(om))*(sg==='+'?1:-1);return Date.UTC(+Y,+M-1,+D,+h,+mi,+se)-z*60000}
function total(o){return Object.values(o).reduce((a,b)=>a+b,0)}
function sleepPriority(src){const s=String(src||'').toLowerCase();if(s.includes('huawei')&&s.includes('global'))return 0;if(s.includes('huawei'))return 1;if(s.includes('watch'))return 2;if(s.includes('iphone'))return 4;return 3}
function hrvPriority(src){const s=String(src||'').toLowerCase();if(s.includes('watch'))return 0;if(s.includes('huawei'))return 2;return 1}
function countLiteral(text,needle){let n=0,p=0;while((p=text.indexOf(needle,p))!==-1){n++;p+=needle.length}return n}
async function scan(file,onProgress){
 const dec=new TextDecoder('utf-8');let off=0,carry='';
 const sleepBySource={},sleepParsed={},hrvBySource={},hrvParsed={};
 let sleepLiteral=0,hrvLiteral=0;
 function processRecord(tag){
  const x=attrs(tag),type=x.type||'',src=x.sourceName||'Desconocido';
  if(type===SLEEP){
   const val=String(x.value||'');if(!VALID_SLEEP.some(v=>val===v||val.startsWith(v)))return;
   const st=parseAppleDate(x.startDate),en=parseAppleDate(x.endDate);if(!Number.isFinite(st)||!Number.isFinite(en)||en<=st)return;
   const hours=(en-st)/36e5;if(!(hours>0&&hours<=24))return;
   const day=String(x.endDate||x.startDate||'').slice(0,10);if(!day)return;
   sleepBySource[src]??={};sleepBySource[src][day]=(sleepBySource[src][day]||0)+hours;sleepParsed[src]=(sleepParsed[src]||0)+1;
  } else if(type===HRV){
   const v=Number(x.value);if(!Number.isFinite(v)||v<=0)return;
   const day=String(x.startDate||x.creationDate||'').slice(0,10);if(!day)return;
   const ms=String(x.unit||'').toLowerCase()==='s'?v*1000:v;
   hrvBySource[src]??={};const b=hrvBySource[src][day]||{sum:0,n:0};b.sum+=ms;b.n++;hrvBySource[src][day]=b;hrvParsed[src]=(hrvParsed[src]||0)+1;
  }
 }
 function consume(final=false){
  let pos=0,lastSafe=0;
  while(true){
   const a=carry.indexOf('<Record',pos);if(a<0)break;
   const z=carry.indexOf('>',a);if(z<0){lastSafe=a;break}
   processRecord(carry.slice(a,z+1));pos=z+1;lastSafe=pos;
  }
  if(final){carry='';return}
  if(lastSafe>0)carry=carry.slice(lastSafe);
  else if(carry.length>CHUNK*2)carry=carry.slice(-1024);
 }
 let literalTail='';
 while(off<file.size){
  const end=Math.min(file.size,off+CHUNK),part=dec.decode(await file.slice(off,end).arrayBuffer(),{stream:end<file.size});
  const lit=literalTail+part;sleepLiteral+=countLiteral(lit,SLEEP);hrvLiteral+=countLiteral(lit,HRV);literalTail=lit.slice(-Math.max(SLEEP.length,HRV.length)+1);
  carry+=part;consume(false);off=end;
  onProgress?.(Math.round(off/file.size*100),{sleepLiteral,hrvLiteral,sleepParsed:total(sleepParsed),hrvParsed:total(hrvParsed)});
  await new Promise(r=>setTimeout(r,0));
 }
 carry+=dec.decode();consume(true);
 function chooseSleep(){const out={},days=new Set();Object.values(sleepBySource).forEach(ds=>Object.keys(ds).forEach(d=>days.add(d)));for(const d of days){const a=[];for(const[src,ds]of Object.entries(sleepBySource)){const v=ds[d]||0;if(v>0)a.push({src,v,p:sleepPriority(src)})}a.sort((x,y)=>x.p-y.p||y.v-x.v);if(a[0])out[d]=a[0]}return out}
 function chooseHrv(){const out={},days=new Set();Object.values(hrvBySource).forEach(ds=>Object.keys(ds).forEach(d=>days.add(d)));for(const d of days){const a=[];for(const[src,ds]of Object.entries(hrvBySource)){const b=ds[d];if(b?.n)a.push({src,v:b.sum/b.n,p:hrvPriority(src),n:b.n})}a.sort((x,y)=>x.p-y.p||y.n-x.n);if(a[0])out[d]=a[0]}return out}
 return{sleep:chooseSleep(),hrv:chooseHrv(),sleepParsed,hrvParsed,sleepLiteral,hrvLiteral};
}
async function merge(r,file){
 window.db??={};db.health??={};db.health.daily??={};db.health.provenance??={};db.health.sourceStats??={};db.health.diagnostics??={};
 for(const[d,x]of Object.entries(r.sleep)){db.health.daily[d]??={};db.health.daily[d].sleep=+x.v.toFixed(2);db.health.provenance[d]??={};db.health.provenance[d].sleep={source:x.src,policy:'v4.8.9 verified XML ingestion'}}
 for(const[d,x]of Object.entries(r.hrv)){db.health.daily[d]??={};db.health.daily[d].hrv=+x.v.toFixed(1);db.health.provenance[d]??={};db.health.provenance[d].hrv={source:x.src,policy:'v4.8.9 verified XML ingestion',samples:x.n}}
 for(const[src,n]of Object.entries(r.sleepParsed)){db.health.sourceStats[src]??={};db.health.sourceStats[src].sleep=n}
 for(const[src,n]of Object.entries(r.hrvParsed)){db.health.sourceStats[src]??={};db.health.sourceStats[src].hrv=n}
 db.health.diagnostics.recoveryRepair={version:VERSION,fileName:file.name,fileSize:file.size,sleepLiteral:r.sleepLiteral,hrvLiteral:r.hrvLiteral,sleepParsed:total(r.sleepParsed),hrvParsed:total(r.hrvParsed),sleepDays:Object.keys(r.sleep).length,hrvDays:Object.keys(r.hrv).length,completedAt:new Date().toISOString()};
 if(window.CutCoachHealthCore?.save)await window.CutCoachHealthCore.save(db.health);
 window.mergeHealth?.();window.render?.();window.renderSourceInsights?.();window.dispatchEvent(new Event('cutcoach-health-hydrated'));
}
function install(){
 const old=window.handleHealthFile;if(typeof old!=='function'||old.__recovery489)return setTimeout(install,100);
 const wrapped=async function(e){
  const file=e?.target?.files?.[0],st=document.getElementById('importStatus'),bar=document.getElementById('importProgress');
  const set=(p,m)=>{if(bar)bar.style.width=p+'%';if(st)st.textContent=m};if(!file)return old.call(this,e);
  const mb=(file.size/1024/1024).toFixed(1);let r;
  try{r=await scan(file,(p,c)=>set(Math.min(49,Math.round(p/2)),`${file.name} · ${mb} MB · lectura ${p}% · IDs Sueño ${c.sleepLiteral} / HRV ${c.hrvLiteral} · procesados ${c.sleepParsed}/${c.hrvParsed}`));}
  catch(err){console.error('v489 scan',err);set(0,`Error preanálisis ${file.name}: ${err?.message||err}`);return}
  await old.call(this,e);
  await merge(r,file);
  const sd=Object.keys(r.sleep).sort().at(-1),hd=Object.keys(r.hrv).sort().at(-1),sv=sd?r.sleep[sd]:null,hv=hd?r.hrv[hd]:null;
  const sm=sv?`${Math.floor(sv.v)} h ${Math.round((sv.v%1)*60)} min (${sd})`:'sin sueño';const hm=hv?`${hv.v.toFixed(1)} ms (${hd})`:'sin HRV';
  if(r.sleepLiteral===0&&r.hrvLiteral===0)set(100,`${file.name} · ${mb} MB · ESTE XML no contiene SleepAnalysis ni HRV SDNN. Verifica que sea el mismo exportar.xml analizado en PC.`);
  else set(100,`v4.8.9 · ${file.name} · IDs Sueño ${r.sleepLiteral.toLocaleString('es-MX')} / HRV ${r.hrvLiteral.toLocaleString('es-MX')} · procesados ${total(r.sleepParsed).toLocaleString('es-MX')}/${total(r.hrvParsed).toLocaleString('es-MX')} · Sueño ${sm} · HRV ${hm}`);
 };
 wrapped.__recovery489=true;window.handleHealthFile=wrapped;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,100));else setTimeout(install,100);
})();
