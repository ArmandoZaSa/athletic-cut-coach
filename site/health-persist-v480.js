// Athletic Cut Coach v4.8.0 — persist imported health safely to IndexedDB
(function(){
  function install(){
    const old=window.handleHealthFile;
    if(typeof old!=='function'||old.__v480persist)return false;
    const wrapped=async function(e){
      await old.call(this,e);
      try{
        if(window.db?.health?.stats?.records>0&&window.CutCoachHealthStore){
          await window.CutCoachHealthStore.save(db.health);
          window.setImp?.(100,`Guardado persistente · ${Number(db.health.stats.records||0).toLocaleString('es-MX')} registros · IndexedDB confirmado`);
          window.render?.();
        }
      }catch(err){console.error('IndexedDB health save failed',err);window.setImp?.(0,'La importación terminó, pero no pude guardar Salud de forma persistente.');window.toast?.('Error al persistir Salud')}
    };
    wrapped.__v480persist=true;
    window.handleHealthFile=wrapped;
    return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer)},100);
  window.addEventListener('cutcoach-health-hydrated',()=>window.render?.());
})();
