/* Directly editable nutrition targets + body-fat goal forecasting for Lyse. */
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
      const pro=safe(m.protein,t.pro)>=0?safe(m.protein,t.pro):t.pro;
      const carb=safe(m.carbs,t.carb)>=0?safe(m.carbs,t.carb):t.carb;
      const fat=safe(m.fat,t.fat)>=0?safe(m.fat,t.fat):t.fat;
      const def=Math.max(0,t.maint-cal),dailyLoss=def/7700,weeklyDef=def*7,weeklyLoss=dailyLoss*7,monthDays=365/12,monthlyDef=def*monthDays,monthlyLoss=dailyLoss*monthDays;
      const lose=Math.max(0,t.w-(+s.goalWeight||t.w)),projectedDays=lose<=0?0:(dailyLoss>0?Math.ceil(lose/dailyLoss):0),projectedGoal=lose<=0?t.today:(projectedDays?addMel(t.today,projectedDays):s.goalDate);
      const st=cal<t.bmr?'CUSTOM CALORIE TARGET BELOW ESTIMATED BMR':def<=0?'CUSTOM TARGET HAS NO CALORIE DEFICIT':'CUSTOM TARGETS ACTIVE';
      return{...t,cal,pro,carb,fat,def,dailyLoss,weeklyDef,weeklyLoss,monthlyDef,monthlyLoss,projectedDays,projectedGoal,st,raw:cal};
    };

    function ensureUI(){
      const cards=document.querySelectorAll('#targets > .grid.g2 > .card');
      if(cards.length<2)return;
      const right=cards[1];
      right.querySelector('h3').textContent='Targets & forecast';
      $('savetarget').textContent='Update goal';

      if(!$('gbf')){
        const dateLabel=$('gd').previousElementSibling;
        dateLabel.insertAdjacentHTML('beforebegin',`<label>Target body fat %</label><input id="gbf" class="input" type="number" min="3" max="60" step="0.5"><label style="display:flex;gap:7px;align-items:center;font-size:12px;font-weight:600;color:#475467"><input id="useBfGoal" type="checkbox"> Use BF% to estimate goal weight</label><div id="bfGoalPreview" class="notice" style="margin:9px 0"></div>`);
      }

      if(!$('targetControls')){
        right.querySelector('h3').insertAdjacentHTML('afterend',`
          <div id="targetControls">
            <label>Current body fat % <span class="muted">(rough estimate)</span></label>
            <input id="curbf" class="input" type="number" min="3" max="65" step="0.5">

            <div class="row between" style="margin-top:14px;align-items:flex-end">
              <div>
                <label style="margin:0">Daily nutrition targets</label>
                <div id="targetModeStatus" class="muted"></div>
              </div>
            </div>

            <div id="manualTargetFields" class="grid g2" style="margin-top:8px">
              <div><label>Calories (kcal)</label><input id="mcal" class="input" type="number" min="1" step="10"></div>
              <div><label>Protein (g)</label><input id="mpro" class="input" type="number" min="0" step="1"></div>
              <div><label>Carbs (g)</label><input id="mcarb" class="input" type="number" min="0" step="1"></div>
              <div><label>Fat (g)</label><input id="mfat" class="input" type="number" min="0" step="1"></div>
            </div>

            <div class="row" style="margin-top:10px;flex-wrap:wrap">
              <button id="saveTargetSettings" class="btn" type="button">Save custom targets</button>
              <button id="useAutoTargets" class="btn alt" type="button">Use automatic targets</button>
            </div>
            <div id="manualTargetNote" class="notice" style="margin:9px 0"></div>
          </div>`);
      }
    }

    function forecastFromInputs(){
      if(!$('curbf')||!$('gbf'))return null;
      const a=autoMath($('curbf').value,$('gbf').value);
      let cal=safe($('mcal').value,a.autoCal);
      if(!(cal>0))cal=a.autoCal;
      const def=Math.max(0,a.maint-cal),defPct=a.maint>0?def/a.maint*100:0,days=def>0&&a.kgToLose>0?Math.ceil(a.kgToLose*7700/def):0,date=days?addMel(melToday(),days):null;
      return{...a,cal,def,defPct,days,date};
    }

    function updatePreview(){
      const x=forecastFromInputs();if(!x)return;
      const use=$('useBfGoal').checked;
      if(use&&document.activeElement!==$('gw'))$('gw').value=num(x.goalWeight,1);
      $('bfGoalPreview').innerHTML=`<b>Estimated weight at ${num(x.goal*100,1)}% BF: ${num(x.goalWeight,1)} kg</b><br>Current lean-mass estimate: ${num(x.lean,1)} kg · about ${num(x.kgToLose,1)} kg to lose.<br>${x.def>0?`At ${num(x.cal)} kcal/day: ~${num(x.def)} kcal deficit/day (${num(x.defPct,1)}% of maintenance) → roughly <b>${x.days} days</b>${x.date?` · ${prettyDate(x.date)}`:''}.`:'Set a calorie deficit to calculate time.'}<br><span class="small">Rough projection only — BF% and lean-mass estimates are imperfect and real weight loss is not perfectly linear.</span>`;
      const manual=(state.settings.targetMode||'auto')==='manual',below=x.cal<x.bmr;
      $('targetModeStatus').textContent=manual?'Custom targets are active':'Automatic targets are active';
      $('manualTargetNote').className='notice '+(below?'warn':'');
      $('manualTargetNote').innerHTML=manual
        ?`These four values are editable. Change them and press <b>Save custom targets</b>.${below?` <b>Your entered calories are below the estimated BMR of ${num(x.bmr)} kcal.</b>`:''}`
        :`These boxes show the current automatic targets. Edit any of them and press <b>Save custom targets</b> to override the automatic values.${below?` <b>The entered calorie value is below the estimated BMR of ${num(x.bmr)} kcal.</b>`:''}`;
    }

    function fillUI(){
      ensureUI();const s=state.settings,t=target(),m=s.manualTargets||{},manual=(s.targetMode||'auto')==='manual';
      $('curbf').value=num((+s.bodyFat||.22)*100,1);
      $('gbf').value=num((+s.goalBodyFat||.15)*100,1);
      $('useBfGoal').checked=s.useBodyFatGoal!==false;
      $('mcal').value=num(manual?safe(m.calories,t.cal):t.cal);
      $('mpro').value=num(manual?safe(m.protein,t.pro):t.pro,1);
      $('mcarb').value=num(manual?safe(m.carbs,t.carb):t.carb,1);
      $('mfat').value=num(manual?safe(m.fat,t.fat):t.fat,1);
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
      const cal=Math.max(1,safe($('mcal').value,0)),pro=Math.max(0,safe($('mpro').value,0)),carb=Math.max(0,safe($('mcarb').value,0)),fat=Math.max(0,safe($('mfat').value,0));
      s.bodyFat=clamp(safe($('curbf').value,22)/100,.03,.65);
      s.targetMode='manual';
      s.manualTargets={calories:cal,protein:pro,carbs:carb,fat};
      const x=forecastFromInputs();
      if(s.useBodyFatGoal!==false&&x)s.goalWeight=num(x.goalWeight,2);
      save();renderAll();
    };

    $('useAutoTargets').onclick=()=>{
      const s=state.settings;
      s.bodyFat=clamp(safe($('curbf').value,22)/100,.03,.65);
      s.targetMode='auto';
      save();renderAll();
    };

    renderAll();
    return true;
  }

  if(!boot()){
    let tries=0;const timer=setInterval(()=>{tries++;if(boot()||tries>120)clearInterval(timer)},100);
  }
})();
