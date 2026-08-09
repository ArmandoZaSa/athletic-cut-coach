// Athletic Cut Coach v4.5 — expanded streaming Apple Health importer
(function(){
  const CHUNK=4*1024*1024, attrRe=/([A-Za-z0-9_:.-]+)="([^"]*)"/g;
  const attrs=t=>{const o={};let m;attrRe.lastIndex=0;while((m=attrRe.exec(t)))o[m[1]]=m[2].replace(/&quot;/g,'"').replace(/&amp;/g,'&');return o};
  const dkey=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?String(s||'').slice(0,10):`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const sleepKey=(start,end)=>{const d=new Date(end||start);if(Number.isNaN(d.getTime()))return dkey(start);return dkey(d)};
  const emptyDay=()=>({weight:null,bodyfat:null,bmi:null,waist:null,steps:0,distance:0,flights:0,activeEnergy:0,restingEnergy:0,exerciseMinutes:0,standMinutes:0,heartRate:null,restingHR:null,walkingHR:null,hrv:null,oxygen:null,respiratory:null,sleep:0});
  const statShape=()=>({records:0,days:new Set(),weight:0,bodyfat:0,bmi:0,waist:0,steps:0,distance:0,flights:0,activeEnergy:0,restingEnergy:0,exerciseMinutes:0,standMinutes:0,heartRate:0,restingHR:0,walkingHR:0,hrv:0,oxygen:0,respiratory:0,sleep:0,workouts:0});
  const accNew=()=>({daily:{},sources:new Set(),sourceDaily:{},sourceStats:{},workouts:[],records:0});
  const stats=(a,s)=>(a.sourceStats[s]??=statShape());
  const sb=(a,s,d)=>(a.sourceDaily[s]??={},a.sourceDaily[s][d]??={steps:0,distance:0,flights:0,activeEnergy:0,restingEnergy:0,exerciseMinutes:0,standMinutes:0,sleep:0},a.sourceDaily[s][d]);
  const latest=(obj,key,val,t)=>{if(!obj[key]||t>obj[key].t)obj[key]={v:val,t}};
  function rec(tag,a){
    const x=attrs(tag),type=x.type||'',src=x.sourceName||'Desconocido',start=x.startDate||x.creationDate||'',end=x.endDate||start,v=parseFloat(x.value),unit=(x.unit||'').toLowerCase();if(!start)return;
    a.records++;a.sources.add(src);const day=dkey(start),d=a.daily[day]??=emptyDay(),b=sb(a,src,day),s=stats(a,src);s.records++;s.days.add(day);
    if(type.includes('BodyMass')&&!type.includes('Index')&&isFinite(v)){latest(d,'weight',unit==='lb'?v*.45359237:v,start);s.weight++}
    else if(type.includes('BodyFatPercentage')&&isFinite(v)){latest(d,'bodyfat',v<=1?v*100:v,start);s.bodyfat++}
    else if(type.includes('BodyMassIndex')&&isFinite(v)){latest(d,'bmi',v,start);s.bmi++}
    else if(type.includes('WaistCircumference')&&isFinite(v)){latest(d,'waist',unit==='m'?v*100:unit==='in'?v*2.54:v,start);s.waist++}
    else if(type.includes('StepCount')&&isFinite(v)){b.steps+=v;s.steps++}
    else if(type.includes('DistanceWalkingRunning')&&isFinite(v)){b.distance+=unit==='m'?v/1000:unit==='mi'?v*1.609344:v;s.distance++}
    else if(type.includes('FlightsClimbed')&&isFinite(v)){b.flights+=v;s.flights++}
    else if(type.includes('ActiveEnergyBurned')&&isFinite(v)){b.activeEnergy+=unit.includes('kj')?v/4.184:v;s.activeEnergy++}
    else if(type.includes('BasalEnergyBurned')&&isFinite(v)){b.restingEnergy+=unit.includes('kj')?v/4.184:v;s.restingEnergy++}
    else if(type.includes('AppleExerciseTime')&&isFinite(v)){b.exerciseMinutes+=unit.includes('hr')?v*60:unit.includes('s')?v/60:v;s.exerciseMinutes++}
    else if(type.includes('AppleStandTime')&&isFinite(v)){b.standMinutes+=unit.includes('hr')?v*60:unit.includes('s')?v/60:v;s.standMinutes++}
    else if(type.endsWith('HeartRate')&&isFinite(v)){latest(d,'heartRate',v,start);s.heartRate++}
    else if(type.includes('RestingHeartRate')&&isFinite(v)){latest(d,'restingHR',v,start);s.restingHR++}
    else if(type.includes('WalkingHeartRateAverage')&&isFinite(v)){latest(d,'walkingHR',v,start);s.walkingHR++}
    else if(type.includes('HeartRateVariabilitySDNN')&&isFinite(v)){const ms=unit==='s'?v*1000:v;d.hrv??={sum:0,n:0,t:start};d.hrv.sum+=ms;d.hrv.n++;if(start>d.hrv.t)d.hrv.t=start;s.hrv++}
    else if(type.includes('OxygenSaturation')&&isFinite(v)){latest(d,'oxygen',v<=1?v*100:v,start);s.oxygen++}
    else if(type.includes('RespiratoryRate')&&isFinite(v)){latest(d,'respiratory',v,start);s.respiratory++}
    if(type.includes('SleepAnalysis')&&end){const val=String(x.value||'').toLowerCase(),asleep=val.includes('asleep')||val.includes('core')||val.includes('deep')||val.includes('rem');if(asleep){const h=(new Date(end)-new Date(start))/36e5;if(isFinite(h)&&h>0&&h<=24){const sd=sleepKey(start,end);a.daily[sd]??=emptyDay();const bs=sb(a,src,sd);bs.sleep+=h;s.sleep++;s.days.add(sd)}}}
  }
  function work(tag,a){const x=attrs(tag),src=x.sourceName||'Desconocido',start=x.startDate||'',raw=x.workoutActivityType||'Workout';if(!start)return;a.sources.add(src);const s=stats(a,src);s.workouts++;s.days.add(dkey(start));let dur=parseFloat(x.duration)||0,du=(x.durationUnit||'min').toLowerCase();dur=du.includes('hr')?dur*60:du.includes('s')?dur/60:dur;let en=parseFloat(x.totalEnergyBurned)||0;if((x.totalEnergyBurnedUnit||'').toLowerCase().includes('kj'))en/=4.184;a.workouts.push({date:dkey(start),start,type:raw.replace(/^HKWorkoutActivityType/,'').replace(/([a-z])([A-Z])/g,'$1 $2'),source:src,duration:Math.round(dur),energy:Math.round(en)})}
  function line(t,a){let m;const rr=/<Record\b[^>]*\/?>/g;while((m=rr.exec(t)))rec(m[0],a);const wr=/<Workout\b[^>]*>/g;while((m=wr.exec(t)))work(m[0],a)}
  function finish(a){
    for(const days of Object.values(a.sourceDaily))for(const [day,b] of Object.entries(days)){const d=a.daily[day]??=emptyDay();d.steps=Math.max(d.steps,b.steps);d.distance=Math.max(d.distance,b.distance);d.flights=Math.max(d.flights,b.flights);d.activeEnergy=Math.max(d.activeEnergy,b.activeEnergy);d.restingEnergy=Math.max(d.restingEnergy,b.restingEnergy);d.exerciseMinutes=Math.max(d.exerciseMinutes,b.exerciseMinutes);d.standMinutes=Math.max(d.standMinutes,b.standMinutes);d.sleep=Math.max(d.sleep,b.sleep)}
    for(const d of Object.values(a.daily)){if(d.hrv)d.hrv={v:+(d.hrv.sum/d.hrv.n).toFixed(1),t:d.hrv.t};for(const k of ['weight','bodyfat','bmi','waist','heartRate','restingHR','walkingHR','oxygen','respiratory'])if(d[k])d[k]=+d[k].v.toFixed(k==='weight'?2:1);if(d.hrv&&d.hrv.v!=null)d.hrv=+d.hrv.v.toFixed(1);d.steps=Math.round(d.steps);d.distance=+d.distance.toFixed(2);d.flights=Math.round(d.flights);d.activeEnergy=Math.round(d.activeEnergy);d.restingEnergy=Math.round(d.restingEnergy);d.exerciseMinutes=Math.round(d.exerciseMinutes);d.standMinutes=Math.round(d.standMinutes);d.sleep=+d.sleep.toFixed(2)}
    a.workouts.sort((x,y)=>y.start.localeCompare(x.start));const ss={};for(const [src,s] of Object.entries(a.sourceStats)){ss[src]={};for(const [k,v] of Object.entries(s))ss[src][k]=v instanceof Set?v.size:v}
    return{daily:a.daily,workouts:a.workouts.slice(0,1500),sources:[...a.sources].sort(),sourceStats:ss,lastImport:new Date().toISOString(),stats:{records:a.records,days:Object.keys(a.daily).length},schema:45};
  }
  async function parse(file){const a=accNew(),dec=new TextDecoder('utf-8');let off=0,carry='';while(off<file.size){const end=Math.min(file.size,off+CHUNK),buf=await file.slice(off,end).arrayBuffer();carry+=dec.decode(buf,{stream:end<file.size});off=end;const ls=carry.split(/\r?\n/);carry=ls.pop()||'';for(const l of ls)line(l,a);if(typeof setImp==='function')setImp(8+Math.floor(off/file.size*88),`Procesando Salud… ${Math.round(off/file.size*100)}% · ${a.records.toLocaleString()} registros`);await new Promise(r=>setTimeout(r,0))}if(carry)line(carry,a);return finish(a)}
  window.handleHealthFile=async e=>{const f=e.target.files?.[0];if(!f)return;try{if(!f.name.toLowerCase().endsWith('.xml'))throw Error('Selecciona export.xml de Apple Salud.');setImp?.(5,`Leyendo ${(f.size/1024/1024/1024).toFixed(2)} GB…`);const p=await parse(f);db.health=p;mergeHealth();persist();setImp?.(100,`Listo: ${p.stats.records.toLocaleString()} registros · ${p.stats.days} días · ${p.sources.length} fuentes`);renderSourceInsights?.();renderHealthV45?.();toast?.('Apple Salud importado');e.target.value=''}catch(err){console.error(err);setImp?.(0,err.message||'No se pudo importar');toast?.('No se pudo importar Salud')}};
})();