/* Editable nutrition targets + body-fat goal forecasting for Lyse. */
(function installTargetEditor(){
  function boot(){
    if(typeof state==='undefined'||!state||typeof target!=='function'||typeof renderTargets!=='function'||!document.getElementById('targets')) return false;
    if(window.__lyseTargetEditorInstalled) return true;
    window.__lyseTargetEditorInstalled=true;

    const baseTarget=target;
    const safe=(v,f=0)=>Number.isFinite(+v)?+v:f;
    const pct=v=>Math.round(v*1000)/10;

    function autoMath(curBfPct,targetBfPct){
      const s=state.settings,w=weight(melToday()),cur=clamp(safe(curBfPct,pct(s.bodyFat||.22))/100,.03,.65),goal=clamp(safe(targetBfPct,pct(s.goalBodyFat||.15))/100,.03,.60);
      const lean=w*(1-cur),goalWeight=lean/(1-goal),kgToLose=Math.max(0,w-goalWeight);
      const katch=370+21.6*lean,mif=s.sex==='Female'?10*w+6.25*(+s.heightCm||169)-5*(+s.age||20)-161:10*w+6.25*(+s.heightCm||169)-5*(+s.age||20)+5,bmr=(katch+mif)/2;
      const maint=s.manualMaintenance?+s.manualMaintenance:(+s.maintenanceAtStart||2600)*Math.pow(w/(+s.startWeight||80),.75);
      const selectedDays=Math.max(0,daysMel(melToday(),s.goalDate));
      const autoCal=selectedDays?Math.max(bmr,maint-kgToLose*7700/selectedDays):maint;
      return{w,cur,goal,lean,goalWeight,kgToLose,bmr,maint,selectedDays,autoCal};
    }

    target=function(){
      const t=baseTarget(),s=state.settings;
      if((s.targetMode||'auto')!=='manual') return t;
      const m=s.manualTargets||{};
      const cal=safe(m.calories,t.cal)>0?safe(m.calories,t.cal):t.cal;
      const pro=safe(m.protein,t.pro)>0?safe(m.protein,t.pro):t.pro;
      const carb=safe(m.carbs,t.carb)>=0?safe(m.carbs,t.carb):t.carb;
      const fat=safe(m.fat,t.fat)>0?safe(m.fat,t.fat):t.fat;
      const def=Math.max(0,t.maint-cal),dailyLoss=def/7700,weeklyDef=def*7,weeklyLoss=dailyLoss*7,monthDays=365/12,monthlyDef=def*monthDays,monthlyLoss=dailyLoss*monthDays;
      const lose=Math.max(0,t.w-(+s.goalWeight||t.w)),projectedDays=lose<=0?0:(dailyLoss>0?Math.ceil(lose/dailyLoss):0),projectedGoal=lose<=0?t.today:(projectedDays?addMel(t.today,projectedDays):s.goalDate);
      const st=cal<t.bmr?'MANUAL CALORIE TARGET BELOW ESTIMATED BMR':def<=0?'MANUAL TARGET HAS NO CALORIE DEFICIT':'MANUAL TARGETS ACTIVE';
      return{...t,cal,pro,carb,fat,def,dailyLoss,weeklyDef,weeklyLoss,monthlyDef,monthlyLoss,projectedDays,projectedGoal,st,raw:cal};
    };

    function ensureUI(){
      const cards=document.querySelectorAll('#targets > .grid.g2 > .card');
      if(cards.length<2)return;
      const left=cards[0],right=cards[1];
      right.querySelector('h3').textContent='Targets & forecast';
      const goalBtn=$('savetarget');goalBtn.textContent='Update goal';

      if(!$('gbf')){
        const dateLabel=$('gd').previousElementSibling;
        dateLabel.insertAdjacentHTML('beforebegin',`<label>Target body fat %</label><input id="gbf" class="input" type="number" min="3" max="60" step="0.5"><label style="display:flex;gap:7px;align-items:center;font-size:12px;font-weight:600;color:#475467"><input id="useBfGoal" type="checkbox"> Use BF% to estimate goal weight</label><div id="bfGoalPreview" class="notice" style="margin:9px 0"></div>`);
      }

      if(!$('targetControls')){
        right.querySelector('h3').insertAdjacentHTML('afterend',`<div id="targetControls"><label>Current body fat % <span class="muted">(rough estimate)</span></label><input id="curbf" class="input" type="number" min="3" max="65" step="0.5"><label>Nutrition target mode</label><select id="targetMode" class="input"><option value="auto">Automatic from goal + date</option><option value="manual">Manual targets</option></select><div id="manualTargetFields" class="grid g2" style="margin-top:8px"><div><label>Calories (kcal)</label><input id="mcal" class="input" type="number" min="0" step="10"></div><div><label>Protein (g)</label><input id="mpro" class="input" type="number" min="0" step="1"></div><div><label>Carbs (g)</label><input id="mcarb" class="input" type="number" min="0" step="1"></div><div><label>Fat (g)</label><input id="mfat" class="input" type="number" min="0" step="1"></div></div><button id="saveTargetSettings" class="btn" type="button" style="margin-top:10px">Save BF% + nutrition targets</button><div id="manualTargetNote" class="notice" style="margin:9px 0"></div></div>`);
      }
    }

    function forecastFromInputs(){
      if(!$('curbf')||!$('gbf'))return null;
      const a=autoMath($('curbf').value,$('gbf').value),mode=$('targetMode').value;
      let cal=mode==='manual'?safe($('mcal').value,a.autoCal):a.autoCal;
      if(!(cal>0))cal=a.autoCal;
      const def=Math.max(0,a.maint-cal),defPct=a.maint>0?def/a.maint*100:0,days=def>0&&a.kgToLose>0?Math.ceil(a.kgToLose*7700/def):0,date=days?addMel(melToday(),days):null;
      return{...a,cal,def,defPct,days,date};
    }

    function updatePreview(){
      const x=forecastFromInputs();if(!x)return;
      const use=$('useBfGoal').checked;
      if(use&&document.activeElement!==$('gw'))$('gw').value=num(x.goalWeight,1);
      $('bfGoalPreview').innerHTML=`<b>Estimated weight at ${num(x.goal*100,1)}% BF: ${num(x.goalWeight,1)} kg</b><br>Current lean-mass estimate: ${num(x.lean,1)} kg · about ${num(x.kgToLose,1)} kg to lose.<br>${x.def>0?`At ${num(x.cal)} kcal/day: ~${num(x.def)} kcal deficit/day (${num(x.defPct,1)}% of maintenance) → roughly <b>${x.days} days</b>${x.date?` · ${prettyDate(x.date)}`:''}.`:'Set a calorie deficit to calculate time.'}<br><span class="small">Rough projection only — BF% and lean-mass estimates are imperfect and real weight loss is not perfectly linear.</span>`;
      const mode=$('targetMode').value,below=x.cal<x.bmr;
      $('manualTargetFields').style.opacity=mode==='manual'?'1':'.55';
      ['mcal','mpro','mcarb','mfat'].forEach(id=>$(id).disabled=mode!=='manual');
      $('manualTargetNote').className='notice '+(below&&mode==='manual'?'warn':'');
      $('manualTargetNote').innerHTML=mode==='manual'?`Manual mode is active. Forecast uses your calorie target against estimated maintenance.${below?` <b>Your entered calories are below the estimated BMR of ${num(x.bmr)} kcal.</b>`:''}`:`Automatic mode recalculates calories and macros from your current weight, goal and selected goal date.`;
    }

    function fillUI(){
      ensureUI();const s=state.settings,t=target(),m=s.manualTargets||{};
      $('curbf').value=num((+s.bodyFat||.22)*100,1);
      $('gbf').value=num((+s.goalBodyFat||.15)*100,1);
      $('useBfGoal').checked=s.useBodyFatGoal!==false;
      $('targetMode').value=s.targetMode||'auto';
      $('mcal').value=num(safe(m.calories,t.cal));$('mpro').value=num(safe(m.protein,t.pro),1);$('mcarb').value=num(safe(m.carbs,t.carb),1);$('mfat').value=num(safe(m.fat,t.fat),1);
      updatePreview();
      const x=forecastFromInputs();
      if(x){
        const currentRow=`<div class="foodrow"><span>Current body fat</span><b>~${num(x.cur*100,1)}%</b></div>`;
        const goalRow=`<div class="foodrow"><span>Target body fat</span><b>${num(x.goal*100,1)}%</b></div>`;
        if(!$('tvals').innerHTML.includes('Current body fat'))$('tvals').insertAdjacentHTML('afterbegin',currentRow+goalRow);
      }
    }

    const baseRenderTargets=renderTargets;
    renderTargets=function(){baseRenderTargets();fillUI()};

    ensureUI();
    ['curbf','gbf','gw','gd','mcal','mpro','mcarb','mfat'].forEach(id=>$(id)?.addEventListener('input',updatePreview));
    $('targetMode')?.addEventListener('change',()=>{if($('targetMode').value==='manual'&&!state.settings.manualTargets){const t=baseTarget();$('mcal').value=num(t.cal);$('mpro').value=num(t.pro,1);$('mcarb').value=num(t.carb,1);$('mfat').value=num(t.fat,1)}updatePreview()});
    $('useBfGoal')?.addEventListener('change',updatePreview);

    $('savetarget').onclick=()=>{
      const s=state.settings,x=forecastFromInputs();
      s.goalBodyFat=clamp(safe($('gbf').value,15)/100,.03,.60);
      s.useBodyFatGoal=$('useBfGoal').checked;
      s.goalWeight=s.useBodyFatGoal&&x?num(x.goalWeight,2):(safe($('gw').value,s.goalWeight)||s.goalWeight);
      s.goalDate=$('gd').value||s.goalDate;
      save();renderAll();
    };

    $('saveTargetSettings').onclick=()=>{
      const s=state.settings;
      s.bodyFat=clamp(safe($('curbf').value,22)/100,.03,.65);
      s.targetMode=$('targetMode').value||'auto';
      s.manualTargets={calories:Math.max(0,safe($('mcal').value,0)),protein:Math.max(0,safe($('mpro').value,0)),carbs:Math.max(0,safe($('mcarb').value,0)),fat:Math.max(0,safe($('mfat').value,0))};
      const x=forecastFromInputs();
      if(s.useBodyFatGoal!==false&&x)s.goalWeight=num(x.goalWeight,2);
      save();renderAll();
    };

    renderAll();
    return true;
  }

  if(!boot()){
    let tries=0;const timer=setInterval(()=>{tries++;if(boot()||tries>120)clearInterval(timer)},100);
  }
})();
