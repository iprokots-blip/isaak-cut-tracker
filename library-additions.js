/* Lyse personal library additions. Idempotent: each item is inserted once, then synced. */
(function(){
  const additions=[
    {
      id:'f_20260821_waterfront_pantry_iced_latte_small',
      name:'Waterfront Pantry Iced Latte — Small',
      serving:'1 small',
      calories:150,
      protein:8,
      carbs:12,
      fat:8,
      category:'Cafe / Drinks',
      source:'Estimated cafe item — full cream milk, no syrup'
    }
  ];

  function install(){
    try{
      if(typeof state==='undefined'||!state||!Array.isArray(state.foods))return false;
      let changed=false;
      for(const item of additions){
        const exists=state.foods.some(f=>f.id===item.id||String(f.name||'').toLowerCase()===item.name.toLowerCase());
        if(!exists){state.foods.unshift({...item});changed=true;}
      }
      if(changed){
        if(typeof renderAll==='function')renderAll();
        if(typeof save==='function')save();
      }
      return true;
    }catch(e){console.error('Lyse library additions failed',e);return false;}
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{
      if(install()||++tries>150)clearInterval(timer);
    },100);
  }
})();
