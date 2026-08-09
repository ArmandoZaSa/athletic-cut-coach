// Athletic Cut Coach v4.7.7 — Safari/PWA context guard
(function(){
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  function banner(){
    if(isStandalone()){document.getElementById('v477-browser-warning')?.remove();return}
    if(document.getElementById('v477-browser-warning'))return;
    const main=document.querySelector('main'); if(!main)return;
    const d=document.createElement('div'); d.id='v477-browser-warning';
    d.style.cssText='margin:10px 0 14px;padding:14px 16px;border:1px solid #614b25;background:#211b10;border-radius:18px;color:#f5f7fa;font-size:13px;line-height:1.45';
    d.innerHTML='<b style="display:block;margin-bottom:4px;color:#ffd37b">Estás en Safari</b><span>Safari y la app instalada no comparten los datos locales. Para importar Apple Salud y conservar tu historial, cierra esta página y abre <b>Cut Coach</b> desde el icono de la pantalla de inicio.</span>';
    main.prepend(d);
  }
  function guardImport(){
    const old=window.openImport;
    if(typeof old!=='function'||old.__v477)return;
    const wrapped=function(){
      if(!isStandalone()){
        banner();
        window.toast?.('Abre Cut Coach desde el icono instalado');
        document.getElementById('v477-browser-warning')?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      return old.apply(this,arguments);
    };
    wrapped.__v477=true; window.openImport=wrapped;
  }
  function version(){const b=document.querySelector('.brand');if(b){const tag=b.querySelector('.v473-version');if(tag)tag.textContent='v4.7.7'}}
  function boot(){banner();guardImport();version();document.documentElement.dataset.cutCoachContext=isStandalone()?'standalone':'browser'}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250));else setTimeout(boot,250);
  window.addEventListener('pageshow',boot);
})();