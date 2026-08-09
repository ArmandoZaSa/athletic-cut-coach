// Athletic Cut Coach v4.8.0 — durable Apple Health storage in IndexedDB
(function(){
  const DB_NAME='athletic-cut-coach-db', DB_VERSION=1, STORE='health', KEY='current';
  function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('No se pudo abrir IndexedDB'))})}
  async function save(health){const d=await openDb();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(health,KEY);tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=()=>{const e=tx.error;d.close();reject(e||new Error('No se pudo guardar Salud'))}})}
  async function load(){const d=await openDb();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(KEY);r.onsuccess=()=>{const v=r.result||null;d.close();resolve(v)};r.onerror=()=>{const e=r.error;d.close();reject(e||new Error('No se pudo leer Salud'))}})}
  async function clear(){const d=await openDb();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(KEY);tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=()=>{const e=tx.error;d.close();reject(e)}})}
  async function hydrate(){try{const h=await load();if(h&&window.db){db.health=h;window.mergeHealth?.();window.render?.();window.renderSourceInsights?.();window.renderHealthV45?.();window.renderHealthKitDiagnostics?.()}window.__CUT_COACH_HEALTH_HYDRATED=true;window.dispatchEvent(new CustomEvent('cutcoach-health-hydrated',{detail:{found:!!h}}));return h}catch(e){console.error('Health hydrate failed',e);window.__CUT_COACH_HEALTH_HYDRATED=true;return null}}
  window.CutCoachHealthStore={save,load,clear,hydrate};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(hydrate,0));else setTimeout(hydrate,0);
})();
