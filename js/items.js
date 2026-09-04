/* 第九层事故 - 物品：被动道具 / 主动技能 / 掉落表 */
'use strict';
(function(){
const IT = {
  /* ---------- 被动道具 ---------- */
  passives: {
    dmgUp:    { name:'强化弹头', desc:'伤害 +30%', color:'#e05a3a', apply:p=>{ p.st.dmgMul += .3; } },
    rateUp:   { name:'扳机弹簧', desc:'射速 +25%', color:'#e0a03a', apply:p=>{ p.st.rateMul += .25; } },
    reloadUp: { name:'快手护腕', desc:'装填 +35%', color:'#c8c8d0', apply:p=>{ p.st.reloadMul *= .65; } },
    speedUp:  { name:'疾风之靴', desc:'移速 +18%', color:'#50c8ff', apply:p=>{ p.st.speedMul += .18; } },
    bulletSpd:{ name:'弹道线圈', desc:'弹速与射程 +30%', color:'#8fd0ff', apply:p=>{ p.st.bulletSpdMul += .3; } },
    bounce:   { name:'橡胶弹壳', desc:'子弹弹跳 +1', color:'#a0e8ff', apply:p=>{ p.st.bounce += 1; } },
    pierce:   { name:'穿甲弹芯', desc:'子弹穿透 +1', color:'#d0d0a0', apply:p=>{ p.st.pierce += 1; } },
    crit:     { name:'鹰眼神符', desc:'15% 概率暴击(2.5倍)', color:'#ffd23e', apply:p=>{ p.st.crit += .15; } },
    luck:     { name:'幸运蹄铁', desc:'幸运 +2（更好的掉落）', color:'#50ffa0', apply:p=>{ p.st.luck += 2; } },
    heartCan: { name:'红心容器', desc:'生命上限 +1 并回满', color:'#e04a3a', apply:p=>{ p.maxHp+=2; p.hp=p.maxHp; } },
    plate:    { name:'古旧板甲', desc:'护甲 +1（格挡一次伤害，缓慢恢复）', color:'#7fd0e8', apply:p=>{ p.maxArmor+=1; p.armor+=1; } },
    magnet:   { name:'磁力核心', desc:'拾取范围 x3', color:'#c060ff', apply:p=>{ p.st.magnetMul += 2; } },
    thorns:   { name:'荆棘外壳', desc:'接触反伤 3 点', color:'#90e050', apply:p=>{ p.st.thorns += 3; } },
    twinTrig: { name:'双重扳机', desc:'+1 弹丸，单发伤害 -20%', color:'#ff7ac0', apply:p=>{ p.st.pelletAdd += 1; p.st.dmgMul *= .8; } },
    adrenal:  { name:'肾上腺素', desc:'半血以下时射速移速 +40%', color:'#ff9a8a', apply:p=>{ p.st.adrenal=true; } },
    berserk:  { name:'狂战药剂', desc:'受伤后 5 秒内伤害 +50%', color:'#e02020', apply:p=>{ p.st.berserk=true; } },
    vamp:     { name:'吸血弹匣', desc:'击杀时 18% 概率掉落红心', color:'#c03050', apply:p=>{ p.st.vamp += .18; } },
    scrooge:  { name:'吝啬鬼戒', desc:'击杀掉落弹壳 +60%', color:'#e8c15a', apply:p=>{ p.st.moneyMul += .6; } },
    /* ---- 被动道具池扩充（2026-09-04）：机制 + 搭配型 ---- */
    brute:    { name:'蛮牛弹壳', desc:'伤害 +20%，移速 -10%', color:'#d06030', apply:p=>{ p.st.dmgMul += .2; p.st.speedMul *= .9; } },
    steady:   { name:'稳定器',   desc:'装填 +20%，射速 -5%', color:'#90b0c8', apply:p=>{ p.st.reloadMul *= .8; p.st.rateMul *= .95; } },
    scrounger:{ name:'拾荒者',   desc:'拾取磁力 +100% 且幸运 +1', color:'#c8a050', apply:p=>{ p.st.magnetMul += 1; p.st.luck += 1; } },
    critDmg:  { name:'碎甲晶石', desc:'暴击伤害 2.5 倍 → 4 倍', color:'#ffd23e', apply:p=>{ p.st.critMul = 1.6; } },
    ammoBelt: { name:'弹链马甲', desc:'所有弹匣 +50%', color:'#8a8a52', apply:p=>{ p.st.magMul *= 1.5; } },
    overheat: { name:'过热弹夹', desc:'射速 +35%，伤害 -15%', color:'#ff8a40', apply:p=>{ p.st.rateMul += .35; p.st.dmgMul *= .85; } },
    bulwark:  { name:'壁垒核心', desc:'护甲 +1，受击无敌时间 +20%', color:'#7fd0e8', apply:p=>{ p.maxArmor+=1; p.armor+=1; p.st.invulnMul *= 1.2; } },
    firstBlood:{name:'先声夺人', desc:'满血时伤害 +40%', color:'#ffb03a', apply:p=>{ p.st.fullHpMul = 1.4; } },
    lastStand:{ name:'背水一战', desc:'生命 ≤2 时伤害 +60%', color:'#ff5040', apply:p=>{ p.st.lowHpMul = 1.6; } },
  },

  /* ---------- 主动技能 ---------- */
  actives: {
    cloak:  { name:'残影斗篷', cd:25, desc:'3秒无敌并可通过敌人', use:p=>{ p.invulnT=Math.max(p.invulnT,3); p.ghostT=3; G.fx.poof(p.x,0.6,p.z,0x8fd0ff); G.audio.sfx('tele'); G.ui.itemToast('『残影斗篷』幽灵形态'); } },
    storm:  { name:'弹药风暴', cd:30, desc:'8秒射速x2.5且无需装填', use:p=>{ p.stormT=8; G.audio.sfx('phase'); G.ui.itemToast('『弹药风暴』火力全开'); } },
    strike: { name:'空袭信标', cd:22, desc:'在光标处召唤三轮轰炸', use:p=>{ const ax=G.input.aimX, az=G.input.aimZ; G.game.scheduleStrikes(ax,az,3); G.audio.sfx('charge'); G.ui.itemToast('『空袭信标』打击来袭'); } },
    aegis:  { name:'护盾脉冲', cd:28, desc:'格挡接下来 3 次伤害', use:p=>{ p.shieldCharge=3; G.audio.sfx('shield'); G.ui.itemToast('『护盾脉冲』+3 层护盾'); } },
  },

  pools: {
    C: ['dmgUp','rateUp','reloadUp','speedUp','bulletSpd','luck','magnet','scrooge','brute','steady','scrounger'],
    B: ['bounce','pierce','crit','heartCan','plate','thorns','twinTrig','vamp','critDmg','ammoBelt','overheat','bulwark'],
    A: ['adrenal','berserk','heartCan','plate','crit','pierce','heartCan','plate','firstBlood','lastStand'],
  },

  randomPassive(tier){
    const full = this.pools[tier] || this.pools.C;
    /* 工程师解锁门控：进阶被动未解锁前不进任何掉落池；过滤后为空则回退全池（双保险不空转） */
    const ok = full.filter(id=>!G.meta || G.meta.itemUnlocked(id));
    return G.rng.pick(ok.length?ok:full);
  },

  /* 商店随机库存（武器统一由柜台「武器商店」目录出售并按品阶定价，货架只摆消耗品） */
  shopStock(floorNum){
    const stock = [];
    const iTier = floorNum===1 ? ['C','B'] : ['B','A'];
    stock.push({ kind:'item', id:this.randomPassive(G.rng.pick(iTier)), price:G.rng.int(35,52) });
    stock.push({ kind:'heart', price:10 });
    stock.push({ kind:'key', price:8 });
    if(G.rng.chance(.65)) stock.push({ kind:'active', id:G.rng.pick(Object.keys(this.actives)), price:G.rng.int(38,50) });
    return stock;
  },

  /* 宝箱掉落 */
  chestLoot(tier, floorNum){ // tier: 'brown' | 'green'(锁) | 'red'(隐藏房)
    const out = [];
    if(tier==='green'){
      if(G.rng.chance(.5)) out.push({kind:'weapon', tier: floorNum===1?'B':'A'});
      else out.push({kind:'item', id:this.randomPassive('A')});
      if(G.rng.chance(.5)) out.push({kind:'key', n:1});
    } else if(tier==='red'){
      out.push({kind:'weapon', tier:'A'});
      if(G.rng.chance(.6)) out.push({kind:'item', id:this.randomPassive('B')});
    } else {
      if(G.rng.chance(.45)) out.push({kind:'weapon', tier: floorNum===1?'C':'B'});
      else out.push({kind:'item', id:this.randomPassive(G.rng.chance(.5)?'C':'B')});
      if(G.rng.chance(.35)) out.push({kind:'heart'});
      if(G.rng.chance(.2)) out.push({kind:'money', n:G.rng.int(8,16)});
    }
    return out;
  },

  giveTo(p, loot){
    switch(loot.kind){
      case 'item':
        if(p.passives.includes(loot.id)){ p.money += 15; G.ui.itemToast('重复被动『'+this.passives[loot.id].name+'』→ 转化为 15 弹壳'); break; }
        p.passives.push(loot.id);
        if(G.meta && G.meta.data.stats) G.meta.data.stats.passives[loot.id]=(G.meta.data.stats.passives[loot.id]||0)+1;   // 图鉴遭遇记录
        this.passives[loot.id].apply(p);
        G.ui.itemToast('获得被动『<b style="color:'+this.passives[loot.id].color+';">'+this.passives[loot.id].name+'</b>』'+this.passives[loot.id].desc);
        G.audio.sfx('itemGet');
        break;
      case 'active':
        p.active = this.actives[loot.id]; p.activeCd = 0;
        G.ui.itemToast('获得主动『<b>'+p.active.name+'</b>』'+p.active.desc);
        G.audio.sfx('itemGet');
        break;
      case 'heart': p.heal(2); break;
      case 'key': p.addKeys(1); break;
      case 'money': p.addMoney(loot.n||10); break;
    }
  }
};
G.items = IT;
})();
