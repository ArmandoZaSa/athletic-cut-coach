// Athletic Cut Coach v4.4 — source diagnostics UI
(function(){
  const metricLabels={weight:'Peso',bodyfat:'Grasa',waist:'Cintura',steps:'Pasos',activeEnergy:'Energía activa',restingHR:'FC reposo',hrv:'HRV',sleep:'Sueño',workouts:'Entrenamientos'};
  function compactName(n){return n.replace(/^com\./,'').replace(/^Health$/,'Apple Salud')}
  window.renderSourceInsights=function(){
    const list=document.querySelector('.sourceList');if(!list)return;
    let box=document.getElementById('sourceInsights');if(!box){box=document.createElement('div');box.id='sourceInsights';box.style.marginTop='14px';list.parentElement.appendChild(box)}
    const stats=db?.health?.sourceStats||{};const names=Object.keys(stats);
    if(!names.length){box.innerHTML='<div class="small">Reimporta export.xml con la v4.4 para ver qué métricas aporta cada fuente.</div>';return}
    const relevant=names.filter(n=>/huawei|gravl|health|iphone|watch/i.test(n)).sort((a,b)=>{const aa=/huawei/i.test(a)?0:/gravl/i.test(a)?1:2,bb=/huawei/i.test(b)?0:/gravl/i.test(b)?1:2;return aa-bb});
    const use=(relevant.length?relevant:names).slice(0,10);
    box.innerHTML='<div class="eyebrow" style="margin:4px 0 10px">Qué aporta cada fuente</div>'+use.map(name=>{const s=stats[name],items=Object.entries(metricLabels).filter(([k])=>s[k]>0).map(([k,l])=>`${l}: ${Number(s[k]).toLocaleString('es-MX')}`).join(' · ');return `<div class="hist"><b>${compactName(name)}</b><br><span class="small">${items||'Sin métricas compatibles detectadas'} · ${s.days||0} días</span></div>`}).join('');
  };
  const old=window.render;if(typeof old==='function')window.render=function(){old();window.renderSourceInsights()};
  setTimeout(window.renderSourceInsights,0);
})();