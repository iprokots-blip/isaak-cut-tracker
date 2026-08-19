/* Subtle goal-status colours for Lyse dashboard KPI cards. */
(function installGoalColours(){
  const STYLE_ID='lyse-goal-colours';
  const install=()=>{
    if(typeof renderToday!=='function' || typeof state==='undefined' || !state || !document.getElementById('kpis')) return false;
    if(window.__lyseGoalColoursInstalled) return true;
    window.__lyseGoalColoursInstalled=true;

    if(!document.getElementById(STYLE_ID)){
      const style=document.createElement('style');
      style.id=STYLE_ID;
      style.textContent=`
        #kpis .kpi{transition:background-color .25s ease,border-color .25s ease,box-shadow .25s ease}
        #kpis .kpi.goal-under{background:#fffbeb;border-color:#fde7a7;box-shadow:0 1px 0 rgba(245,158,11,.04)}
        #kpis .kpi.goal-on{background:#f3fbf5;border-color:#ccebd3;box-shadow:0 1px 0 rgba(34,197,94,.04)}
        #kpis .kpi.goal-over{background:#fff5f5;border-color:#f2cece;box-shadow:0 1px 0 rgba(239,68,68,.04)}
        #kpis .goal-state{display:inline-flex;align-items:center;gap:5px;margin-top:5px;font-size:10px;font-weight:800;letter-spacing:.02em}
        #kpis .goal-state:before{content:'';width:6px;height:6px;border-radius:50%;display:inline-block;background:currentColor;opacity:.7}
        #kpis .goal-under .goal-state{color:#a16207}
        #kpis .goal-on .goal-state{color:#268344}
        #kpis .goal-over .goal-state{color:#b83a3a}
      `;
      document.head.appendChild(style);
    }

    function classify(name,current,target){
      current=+current||0; target=+target||0;
      if(target<=0) return {cls:'',label:''};
      const ratio=current/target;
      let low=.90, high=1.05;
      if(name==='Calories'){low=.95;high=1.02}
      else if(name==='Protein'){low=.90;high=1.10}
      else if(name==='Carbs'){low=.90;high=1.05}
      else if(name==='Fat'){low=.90;high=1.05}
      if(ratio<low) return {cls:'goal-under',label:'Under'};
      if(ratio<=high) return {cls:'goal-on',label:'On target'};
      return {cls:'goal-over',label:'Over'};
    }

    function applyGoalColours(){
      try{
        const d=state.selectedDate||(typeof melToday==='function'?melToday():new Date().toISOString().slice(0,10));
        const t=target(),x=totals(d);
        const values={Calories:[x.k,t.cal],Protein:[x.p,t.pro],Carbs:[x.c,t.carb],Fat:[x.f,t.fat]};
        document.querySelectorAll('#kpis .kpi').forEach(card=>{
          const name=(card.querySelector('span')?.textContent||'').trim();
          const pair=values[name];
          card.classList.remove('goal-under','goal-on','goal-over');
          card.querySelector('.goal-state')?.remove();
          if(!pair) return;
          const s=classify(name,pair[0],pair[1]);
          if(!s.cls) return;
          card.classList.add(s.cls);
          const stateEl=document.createElement('div');
          stateEl.className='goal-state';
          stateEl.textContent=s.label;
          card.appendChild(stateEl);
        });
      }catch(e){console.error('Lyse goal colours failed',e)}
    }

    const baseRenderToday=renderToday;
    renderToday=function(){
      const r=baseRenderToday.apply(this,arguments);
      applyGoalColours();
      return r;
    };

    applyGoalColours();
    return true;
  };

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},100);
  }
})();
