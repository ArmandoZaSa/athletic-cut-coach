// Athletic Cut Coach v4.8.6 — Safari-safe sleep repair pass
(function(){
'use strict';
const VERSION='v4.8.6', CHUNK=2*1024*1024;
function attrs(tag){const o={};const re=/([A-Za-z0-9_:.-]+)="([^"]*)"/g;let m;while((m=re.exec(tag)))o[m[1]]=m[2];return o}
function parseAppleDate(s){
  const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})\s*([+-])(\d{2})(\d{2})$/);
  if(!m)return NaN;
  const [,Y,M,D,h,mi,se,sg,oh,om]=m;
  const offset=(Number(oh)*60+Number(om))*(sg==='+'?1:-1);
  return Date.UTC(+Y,+M-1,+D,+h,+mi,+se)-offset*60000;
}
function dayKey(s){return String(s||'').slice(0,10)}
function priority(src){
  src=String(src||'').toLowerCase();
  if(src.includes('huawei')) return 0;
  if(src.includes('watch')) return 1;
  if(src.includes('iphone')) return 3;
  return 2;
}
async function parseSleep(file,onProgress){
  const dec=new TextDecoder('utf-8'), bySource={}, sourceCount={};
  let off=0,carry='';
  const consume=(txt)=>{
    let m,last=0;
    const re=/<Record\b[^>]*type="HKCategoryTypeIdentifierSleepAnalysis"[^>]*>/g;
    while((m=re.exec(txt))){
      last=re.lastIndex;
      const x=attrs(m[0]), raw=String(x.value||''), low=raw.toLowerCase();
      if(low.includes('inbed')||low.includes('awake')) continue;
      const asleep=low.includes('asleep')||low.includes('core')||low.includes('deep')||low.includes('rem');
      if(!asleep) continue;
      const st=parseAppleDate(x.startDate), en=parseAppleDate(x.endDate);
      if(!Number.isFinite(st)||!Number.isFinite(en)||en<=st) continue;
      const hours=(en-st)/36e5;
      if(hours<=0||hours>24) continue;
      const day=dayKey(x.endDate||x.startDate), src=x.sourceName||'Desconocido';
      bySource[src]??={}; bySource[src][day]=(bySource[src][day]||0)+hours;
      sourceCount[src]=(sourceCount[src]||0)+1;
    }
    return txt.slice(last);
  };
  while(off<file.size){
    const end=Math.min(file.size,off+CHUNK);
    const txt=dec.decode(await file.slice(off,end).arrayBuffer(),{stream:end<file.size});
    carry+=txt; off=end; carry=consume(carry);
    if(carry.length>CHUNK*4)carry=carry.slice(-CHUNK);
    onProgress?.(Math.round(off/file.size*100));
    await new Promise(r=>setTimeout(r,0));
  }
  if(carry)consume(carry);
  const chosen={};
  const allDays=new Set();
  Object.values(bySource).forEach(ds=>Object.keys(ds).forEach(d=>allDays.add(d)));
  for(const day of allDays){
    const opts=[];
    for(const [src,ds] of Object.entries(bySource)){
      const v=ds[day]||0;
      if(v>0)opts.push({src,v,p:priority(src)});
    }
    opts.sort((a,b)=>a.p-b.p||b.v-a.v);
    if(opts[0]) chosen[day]=opts[0];
  }
  return {chosen,bySource,sourceCount};
}
async function repair(file){
  const st=document.getElementById('importStatus'), bar=document.getElementById('importProgress');
  const set=(p,m)=>{if(bar)bar.style.width=p+'%';if(st)st.textContent=m};
  set(2,'Verificando sueño para Safari/iOS…');
  const sleep=await parseSleep(file,p=>set(Math.min(99,p),`Reparando sueño ${p}%…`));
  let n=0;
  db.health.daily??={}; db.health.provenance??={}; db.health.sourceStats??={};
  for(const [day,x] of Object.entries(sleep.chosen)){
    db.health.daily[day]??={};
    db.health.daily[day].sleep=+x.v.toFixed(2);
    db.health.provenance[day]??={};
    db.health.provenance[day].sleep={source:x.src,policy:'Safari-safe sleep repair'};
    n++;
  }
  for(const [src,c] of Object.entries(sleep.sourceCount)){
    db.health.sourceStats[src]??={};
    db.health.sourceStats[src].sleep=c;
  }
  db.health.diagnostics??={};
  db.health.diagnostics.sleepRepair={version:VERSION,days:n,sources:Object.keys(sleep.sourceCount),completedAt:new Date().toISOString()};
  if(window.CutCoachHealthCore?.save) await window.CutCoachHealthCore.save(db.health);
  window.mergeHealth?.(); window.render?.();
  window.dispatchEvent(new Event('cutcoach-health-hydrated'));
  const latest=Object.keys(sleep.chosen).sort().at(-1), val=latest?sleep.chosen[latest]:null;
  set(100,val?`Sueño reparado · ${n} días · último ${latest}: ${Math.floor(val.v)} h ${Math.round((val.v%1)*60)} min · ${val.src}`:`No se encontraron segmentos de sueño utilizables`);
}
function install(){
  const old=window.handleHealthFile;
  if(typeof old!=='function'||old.__sleep486)return setTimeout(install,250);
  const wrapped=async function(e){
    const file=e?.target?.files?.[0];
    await old.call(this,e);
    if(file)try{await repair(file)}catch(err){console.error('sleep repair',err)}
  };
  wrapped.__sleep486=true; window.handleHealthFile=wrapped;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,500));else setTimeout(install,500);
})();