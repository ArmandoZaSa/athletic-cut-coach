// Athletic Cut Coach v4.3 — streaming Apple Health importer
// Designed for very large export.xml files without loading the whole XML into memory.
(function(){
  const CHUNK=4*1024*1024;
  const attrRe=/([A-Za-z0-9_:.-]+)="([^"]*)"/g;
  const attrs=(tag)=>{const o={};let m;attrRe.lastIndex=0;while((m=attrRe.exec(tag)))o[m[1]]=m[2].replace(/&quot;/g,'"').replace(/&amp;/g,'&');return o};
  const dayKey=(s)=>{const d=new Date(s);if(Number.isNaN(d.getTime()))return String(s||'').slice(0,10);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const emptyDay=()=>({weight:null,bodyfat:null,waist:null,steps:0,activeEnergy:0,restingHR:null,hrv:null,sleep:0});

  function makeAccumulator(){
    return {daily:{},sources:new Set(),sourceDaily:{},workouts:[],records:0};
  }
  function sourceBucket(acc,src,day){acc.sourceDaily[src]??={};acc.sourceDaily[src][day]??={steps:0,energy:0,sleep:0};return acc.sourceDaily[src][day]}
  function consumeRecord(tag,acc){
    const a=attrs(tag),type=a.type||'',src=a.sourceName||'Desconocido',start=a.startDate||a.creationDate||'',end=a.endDate||start,v=parseFloat(a.value),unit=a.unit||'';
    if(!start)return;acc.records++;acc.sources.add(src);const day=dayKey(start);acc.daily[day]??=emptyDay();const d=acc.daily[day],b=sourceBucket(acc,src,day);
    if(type.includes('BodyMass')&&!type.includes('Index')&&isFinite(v)){const kg=unit==='lb'?v*.45359237:v;if(!d.weight||start>d.weight.t)d.weight={v:kg,t:start}}
    else if(type.includes('BodyFatPercentage')&&isFinite(v)){const pct=v<=1?v*100:v;if(!d.bodyfat||start>d.bodyfat.t)d.bodyfat={v:pct,t:start}}
    else if(type.includes('WaistCircumference')&&isFinite(v)){const cm=unit==='m'?v*100:unit==='in'?v*2.54:v;if(!d.waist||start>d.waist.t)d.waist={v:cm,t:start}}
    else if(type.includes('StepCount')&&isFinite(v))b.steps+=v;
    else if(type.includes('ActiveEnergyBurned')&&isFinite(v))b.energy+=unit.toLowerCase().includes('kj')?v/4.184:v;
    else if(type.includes('RestingHeartRate')&&isFinite(v)){if(!d.restingHR||start>d.restingHR.t)d.restingHR={v,t:start}}
    else if(type.includes('HeartRateVariabilitySDNN')&&isFinite(v)){const ms=unit==='s'?v*1000:v;d.hrv??={sum:0,n:0};d.hrv.sum+=ms;d.hrv.n++}
    if(type.includes('SleepAnalysis')&&String(a.value||'').toLowerCase().includes('asleep')&&end){const h=Math.max(0,(new Date(end)-new Date(start))/36e5);if(isFinite(h))b.sleep+=h}
  }
  function consumeWorkout(tag,acc){
    const a=attrs(tag),src=a.sourceName||'Desconocido',start=a.startDate||'',raw=a.workoutActivityType||'Workout';if(!start)return;acc.sources.add(src);
    let duration=parseFloat(a.duration)||0;const du=a.durationUnit||'min';duration=du==='hr'?duration*60:du==='s'?duration/60:duration;
    let energy=parseFloat(a.totalEnergyBurned)||0;const eu=(a.totalEnergyBurnedUnit||'').toLowerCase();if(eu.includes('kj'))energy/=4.184;
    acc.workouts.push({date:dayKey(start),start,type:raw.replace(/^HKWorkoutActivityType/,'').replace(/([a-z])([A-Z])/g,'$1 $2'),source:src,duration:Math.round(duration),energy:Math.round(energy)})
  }
  function consumeLine(line,acc){
    let m;const rr=/<Record\b[^>]*\/>/g;while((m=rr.exec(line)))consumeRecord(m[0],acc);
    const wr=/<Workout\b[^>]*>/g;while((m=wr.exec(line)))consumeWorkout(m[0],acc);
  }
  function finalize(acc){
    for(const days of Object.values(acc.sourceDaily))for(const [day,b] of Object.entries(days)){const d=acc.daily[day]||=emptyDay();d.steps=Math.max(d.steps,b.steps);d.activeEnergy=Math.max(d.activeEnergy,b.energy);d.sleep=Math.max(d.sleep,b.sleep)}
    for(const d of Object.values(acc.daily)){if(d.hrv)d.hrv=+(d.hrv.sum/d.hrv.n).toFixed(1);if(d.weight)d.weight=+d.weight.v.toFixed(2);if(d.bodyfat)d.bodyfat=+d.bodyfat.v.toFixed(1);if(d.waist)d.waist=+d.waist.v.toFixed(1);if(d.restingHR)d.restingHR=+d.restingHR.v.toFixed(0);d.steps=Math.round(d.steps);d.activeEnergy=Math.round(d.activeEnergy);d.sleep=+d.sleep.toFixed(2)}
    acc.workouts.sort((a,b)=>b.start.localeCompare(a.start));
    return {daily:acc.daily,workouts:acc.workouts.slice(0,1000),sources:[...acc.sources].sort(),lastImport:new Date().toISOString(),stats:{records:acc.records,days:Object.keys(acc.daily).length}};
  }
  async function parseLargeXml(file){
    const acc=makeAccumulator(),decoder=new TextDecoder('utf-8');let offset=0,carry='';
    while(offset<file.size){
      const end=Math.min(file.size,offset+CHUNK),buf=await file.slice(offset,end).arrayBuffer();let text=decoder.decode(buf,{stream:end<file.size});offset=end;carry+=text;
      const lines=carry.split(/\r?\n/);carry=lines.pop()||'';for(const line of lines)consumeLine(line,acc);
      const pct=10+Math.floor((offset/file.size)*82);if(typeof setImp==='function')setImp(pct,`Procesando Salud… ${Math.round(offset/file.size*100)}% · ${acc.records.toLocaleString()} registros`);
      await new Promise(r=>setTimeout(r,0));
    }
    if(carry)consumeLine(carry,acc);return finalize(acc)
  }

  window.handleHealthFile=async function(e){
    const f=e.target.files&&e.target.files[0];if(!f)return;
    try{
      if(typeof setImp==='function')setImp(4,`Preparando ${f.name}…`);
      const lower=f.name.toLowerCase();
      if(lower.endsWith('.zip')){
        const mb=f.size/1024/1024;
        throw new Error(`Tu ZIP (${mb.toFixed(0)} MB) contiene un export.xml muy grande. Para evitar que el iPhone se quede sin memoria, extrae export.xml del ZIP y selecciónalo directamente. La v4.3 lo procesa por fragmentos.`);
      }
      if(!lower.endsWith('.xml')&&!String(f.type||'').includes('xml'))throw new Error('Selecciona directamente el archivo export.xml de Apple Salud.');
      if(typeof setImp==='function')setImp(8,`Leyendo ${(f.size/1024/1024/1024).toFixed(2)} GB por streaming…`);
      const parsed=await parseLargeXml(f);db.health=parsed;mergeHealth();persist();if(typeof setImp==='function')setImp(100,`Listo: ${parsed.stats.records.toLocaleString()} registros · ${parsed.stats.days} días · ${parsed.sources.length} fuentes`);if(typeof toast==='function')toast('Apple Salud importado correctamente');
      e.target.value='';
    }catch(err){console.error(err);if(typeof setImp==='function')setImp(0,err.message||'No se pudo importar Salud');if(typeof toast==='function')toast('No se pudo importar Salud')}
  };
})();