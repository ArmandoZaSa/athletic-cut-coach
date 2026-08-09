// Athletic Cut Coach v4.8.1 — robust IndexedDB persistence independent of importer reassignment
(function(){
  const INPUT_ID='healthFile';
  let watching=false;
  async function persistNow(){
    try{
      if(!window.CutCoachHealthStore||!window.db?.health?.stats?.records)return false;
      await window.CutCoachHealthStore.save(db.health);
      window.setImp?.(100,`Guardado persistente · ${Number(db.health.stats.records||0).toLocaleString('es-MX')} registros · IndexedDB confirmado`);
      window.__CUT_COACH_HEALTH_PERSISTED_AT=new Date().toISOString();
      window.render?.();window.renderSourceInsights?.();window.renderHealthV45?.();window.renderHealthKitDiagnostics?.();
      return true;
    }catch(err){console.error('IndexedDB health save failed',err);window.setImp?.(0,'La importación terminó, pero no pude guardar Salud de forma persistente.');window.toast?.('Error al persistir Salud');return false}
  }
  function watchImport(){
    if(watching)return;watching=true;
    const before=window.db?.health?.lastImport||null;let ticks=0;
    const timer=setInterval(async()=>{
      ticks++;
      const h=window.db?.health;
      const changed=!!h?.lastImport&&h.lastImport!==before&&(+h?.stats?.records||0)>0;
      const completedText=/Guardado completo|Listo:/i.test(document.getElementById('importStatus')?.textContent||'');
      if(changed||completedText){clearInterval(timer);watching=false;await persistNow();return}
      if(ticks>1800){clearInterval(timer);watching=false}
    },500);
  }
  function bind(){
    const input=document.getElementById(INPUT_ID);if(!input||input.__v481persist)return false;
    input.addEventListener('change',watchImport,true);input.__v481persist=true;return true;
  }
  let tries=0;const bindTimer=setInterval(()=>{tries++;if(bind()||tries>80)clearInterval(bindTimer)},100);
  window.addEventListener('cutcoach-health-hydrated',()=>{window.render?.();window.renderSourceInsights?.();window.renderHealthV45?.();window.renderHealthKitDiagnostics?.()});
  window.CutCoachPersistHealthNow=persistNow;
})();