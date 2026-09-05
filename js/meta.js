/* 第九层事故 - 局外系统 MetaProgression：里程碑解锁 / 深渊碎片 / 统计图鉴 / 基地升级（跨局持久化）
   职责清单（禁止逻辑散回其他模块）：
   ① 里程碑达成判定与授予（横幅反馈，幂等）② 武器解锁旗标存取（localStorage bd_unlocks）
   ③ 深渊碎片（永久货币）：发放 / 消费 / 枪械师买枪 / 工程师买被动 / 基地升级事务
   ④ 统计与图鉴数据：敌人击杀分类计数 / 武器使用与击杀 / Boss 击败与最佳时间 / 死亡胜利次数
   武器池/商店目录/展示架读取 unlocked() 过滤；道具池读取 itemUnlocked() 过滤；
   基地（base.js）与本模块通过 buyX()/up() 数据接口通信——本模块不做任何场景与玩法逻辑。 */
'use strict';
(function(){
const KEY='bd_unlocks';
const MILESTONES=[
  {id:'reach_f2',  title:'初次下潜', desc:'抵达第二层',                 unlock:['ricochet','laser']},
  {id:'first_buy', title:'军火交易', desc:'在武器商店购买一件武器',       unlock:['burst']},
  {id:'kills100',  title:'百人斩',   desc:'累计击杀 100 只敌人',          unlock:['hive']},
  {id:'flawless',  title:'完美清剿', desc:'无伤通过一间锁定的战斗房',      unlock:['arc']},
  {id:'kill_boss', title:'讨伐铁颚', desc:'击败 Boss 通关一次',           unlock:['rocket','rail','frost']},
  {id:'win_run',   title:'深渊征服者', desc:'通关完整的三层深渊',            unlock:['gambler','polaroid']},
  {id:'jackpot',   title:'头奖',     desc:'用赌徒的灾难触发一次 JACKPOT',  unlock:['polaroid']},
  {id:'streak8',   title:'赌运亨通', desc:'赌徒的灾难 Gambling Streak ×8', unlock:['gambler']},
];

/* 深渊碎片经济：品阶统一定价（枪械师）/ 被动统一价（工程师）/ 基地升级分级价 */
const SHARD_PRICE = { D:15, C:25, B:40, A:60 };
const ITEM_PRICE  = 30;
/* 工程师可永久解锁的进阶被动（未解锁前不进任何掉落池；基础被动始终可用） */
const GATED_ITEMS = ['crit','plate','thorns','twinTrig','magnet','adrenal','berserk','vamp'];
/* 基地永久升级（真实接入：medbay→开局上限 / armory→开局双枪 / ammo→装填 / archive→生成器特殊房 / training→训练靶） */
const UPGRADES = {
  medbay:  { name:'医疗站',     maxLv:2, price:[30,60], desc:'每级：开局生命上限 +1 颗红心' },
  armory:  { name:'武器仓库',   maxLv:1, price:[45],    desc:'开局额外携带一把随机已解锁武器' },
  ammo:    { name:'弹药工作台', maxLv:2, price:[25,50], desc:'每级：装填速度 +12%' },
  archive: { name:'档案室',     maxLv:2, price:[35,70], desc:'每级：每层额外特殊房（宝箱/商店）概率 +30%' },
  training:{ name:'训练场',     maxLv:1, price:[20],    desc:'训练靶强化：更高耐久，并显示累计承受伤害' },
  armor:   { name:'装甲舱',     maxLv:1, price:[45],    desc:'开局护甲 +1' },
  magnet:  { name:'重力靴',     maxLv:2, price:[35,60], desc:'每级：拾取磁力半径 +30%' },
};

/* 深渊共鸣（局外成长·轨道B）：可重复投入的碎片长期出口，价格递增，各 5 级封顶 */
const RESONANCE = {
  affinity_ammo:  { name:'弹药亲和', maxLv:5, price:[15,25,40,60,85],  desc:'每级：弹匣 +8% 且装填 -4%' },
  affinity_loot:  { name:'寻宝本能', maxLv:5, price:[15,25,40,60,85],  desc:'每级：特殊房概率 +4%' },
  affinity_vet:   { name:'老兵直觉', maxLv:5, price:[12,20,32,50,70],  desc:'每级：翻滚冷却 -5%、受击无敌 +5%' },
  affinity_shard: { name:'深渊亲和', maxLv:5, price:[18,30,48,72,100], desc:'每级：深渊碎片拾取 +10%' },
};

/* 深渊准备桌（局外成长·轨道C）：祝福池 BOONS 与血契 PACT，每局限带 2 个，startRun 消费 */
const BOONS = {
  boon_steel:{ name:'钢骨',   price:12, color:'#9ab0c8', desc:'本局：护甲 +1' },
  boon_rage: { name:'狂热',   price:15, color:'#ff8060', desc:'本局：攻速 +12%' },
  boon_wind: { name:'疾风',   price:10, color:'#60d0ff', desc:'本局：移速 +10%' },
  boon_greed:{ name:'贪婪',   price:15, color:'#ffe060', desc:'本局：碎片拾取 +30%' },
  boon_luck: { name:'好运',   price:14, color:'#60ffa0', desc:'本局：掉落品质 +1' },
  boon_regen:{ name:'再生',   price:16, color:'#ff9090', desc:'本局：每层回 1 红心' },
};
const PACT = {
  pact_blood:{ name:'血之契约', price:18, color:'#ff4050', desc:'伤害 +40%，但生命上限 -2' },
  pact_glass:{ name:'玻璃大炮', price:20, color:'#c0c8ff', desc:'伤害 +70%，但受伤 +50%' },
  pact_fast: { name:'赌命狂奔', price:16, color:'#ffa040', desc:'攻速 +30% 移速 +15%，但翻滚冷却 +30%' },
};

const freshData = ()=>({ flags:{}, kills:0, shards:0, bought:{}, items:{}, upgrades:{}, resonance:{}, runBoons:[],
  stats:{ ekills:{}, wuse:{}, wkill:{}, boss:{}, passives:{}, deaths:0, wins:0, runs:0, shardsEarned:0 } });

const M = {
  data:freshData(),
  MILESTONES, SHARD_PRICE, ITEM_PRICE, GATED_ITEMS, UPGRADES, RESONANCE, BOONS, PACT,

  load(){
    try{
      const raw=localStorage.getItem(KEY);
      const d=raw?JSON.parse(raw):null;
      this.data=freshData();
      if(d){
        this.data.flags=d.flags||{};
        this.data.kills=d.kills||0;
        this.data.shards=d.shards||0;
        this.data.bought=d.bought||{};
        this.data.items=d.items||{};
        this.data.upgrades=d.upgrades||{};
        this.data.resonance=d.resonance||{};
        if(this.data.stats && !this.data.stats.passives) this.data.stats.passives={};
        this.data.runBoons=d.runBoons||[];
        const s=d.stats||{};
        this.data.stats={ ekills:s.ekills||{}, wuse:s.wuse||{}, wkill:s.wkill||{}, boss:s.boss||{}, passives:s.passives||{},
          deaths:s.deaths||0, wins:s.wins||0, runs:s.runs||0, shardsEarned:s.shardsEarned||0 };
      }
      if(!this.data.flags.win_run && localStorage.getItem('bd_best')){ this.data.flags.win_run=true; }  // 老玩家回填：曾通关即视为深渊征服者
      // 老玩家道具回填：物品解锁门控上线前 bd_best 存在的老玩家，全部进阶被动视为已解锁（体验不回退）
      if(localStorage.getItem('bd_best')){ for(const id of GATED_ITEMS) this.data.items[id]=true; }
      this.save();
    }catch(e){}
  },
  save(){ try{ localStorage.setItem(KEY, JSON.stringify(this.data)); }catch(e){} },

  /* ---------- 解锁查询（武器：里程碑 ∨ 枪械师购买） ---------- */
  unlocked(wid){
    if(this.data.bought[wid]) return true;
    const m=this.milestoneOf(wid);
    return !m || !!this.data.flags[m.id];
  },
  milestoneOf(wid){ return this.MILESTONES.find(m=>m.unlock.includes(wid)) || null; },
  /* 道具解锁（进阶被动需工程师解锁；基础被动恒可用） */
  itemUnlocked(iid){ return !GATED_ITEMS.includes(iid) || !!this.data.items[iid]; },

  /* ---------- 里程碑（幂等） ---------- */
  grant(mid){
    const m=this.MILESTONES.find(x=>x.id===mid);
    if(!m || this.data.flags[mid]) return false;
    const fresh=m.unlock.filter(id=>{ const ms=this.milestoneOf(id); return !ms || !this.data.flags[ms.id]; });
    this.data.flags[mid]=true;
    this.save();
    if(fresh.length){
      const names=fresh.map(id=>G.weapons.defs[id].name).join('」「');
      G.audio.sfx('chest',{v:.7});
      G.ui.banner('武器解锁','「'+names+'」已加入深渊军火铺 · '+m.title);
    }
    return true;
  },

  /* ---------- 深渊碎片（永久货币；与局内弹壳完全独立） ---------- */
  /* 深渊共鸣（轨道B）：等级查询 / 价格 / 购买事务（与 buyUpgrade 同构） */
  resonanceLv(id){ return this.data.resonance[id]||0; },
  resonancePrice(id){ const u=RESONANCE[id]; const lv=this.resonanceLv(id); return (u && lv<u.maxLv) ? u.price[lv] : null; },
  buyResonance(id){
    const u=RESONANCE[id];
    if(!u) return {ok:false, why:'无此共鸣'};
    const price=this.resonancePrice(id);
    if(price==null) return {ok:false, why:'已满级'};
    if(!this.spendShards(price)) return {ok:false, why:'碎片不足', price};
    this.data.resonance[id]=this.resonanceLv(id)+1;
    this.save();
    return {ok:true, price};
  },

  /* 深渊准备桌（轨道C）：祝福/血契，每局限带 2 个（祝福+血契合计） */
  runBoonCount(){ return (this.data.runBoons||[]).length; },
  buyRunBoon(id){
    const u=BOONS[id]||PACT[id];
    if(!u) return {ok:false, why:'无此祝福/血契'};
    if((this.data.runBoons||[]).indexOf(id)>=0) return {ok:false, why:'已携带'};
    if(this.runBoonCount()>=2) return {ok:false, why:'本局只能携带 2 个'};
    if(!this.spendShards(u.price)) return {ok:false, why:'碎片不足', price:u.price};
    this.data.runBoons.push(id);
    this.save();
    return {ok:true, price:u.price};
  },

  addShards(n, quiet){
    const sm=this.resonanceLv('affinity_shard'); if(sm) n=Math.round(n*(1+.10*sm));   // 深渊亲和：碎片拾取值 +10%/级
    const bm=(typeof G!=='undefined'&&G.runShardMul)||1; if(bm>1) n=Math.round(n*bm);   // 贪婪祝福：本局碎片 +30%
    if(!(n>0)) return;
    this.data.shards+=n;
    this.data.stats.shardsEarned+=n;
    if(!quiet) G.ui.banner('深渊碎片','+'+n+' ◆　（当前 '+this.data.shards+'）');
    this.save();
  },
  spendShards(n){
    if(this.data.shards<n) return false;
    this.data.shards-=n;
    this.save();
    return true;
  },
  weaponPrice(wid){ const def=G.weapons.defs[wid]; return def ? (SHARD_PRICE[def.tier]||60) : 0; },
  upgradePrice(key){ const u=UPGRADES[key]; const lv=this.up(key); return (u && lv<u.maxLv) ? u.price[lv] : null; },
  up(key){ return this.data.upgrades[key]||0; },

  /* ---------- 购买事务（基地面板与自测共用同一入口，保证「显示=实际扣款」） ---------- */
  buyWeapon(wid){
    const def=G.weapons.defs[wid];
    if(!def || this.unlocked(wid)) return {ok:false, why:'已解锁'};
    const price=this.weaponPrice(wid);
    if(!this.spendShards(price)) return {ok:false, why:'碎片不足', price};
    this.data.bought[wid]=true;
    this.save();
    return {ok:true, price};
  },
  buyItem(iid){
    const it=G.items && G.items.passives[iid];
    if(!it || this.itemUnlocked(iid)) return {ok:false, why:'已解锁'};
    if(!this.spendShards(ITEM_PRICE)) return {ok:false, why:'碎片不足', price:ITEM_PRICE};
    this.data.items[iid]=true;
    this.save();
    return {ok:true, price:ITEM_PRICE};
  },
  buyUpgrade(key){
    const u=UPGRADES[key];
    if(!u) return {ok:false, why:'无此升级'};
    const price=this.upgradePrice(key);
    if(price==null) return {ok:false, why:'已满级'};
    if(!this.spendShards(price)) return {ok:false, why:'碎片不足', price};
    this.data.upgrades[key]=this.up(key)+1;
    this.save();
    return {ok:true, price};
  },

  /* ---------- 统计与图鉴 ---------- */
  onKill(etype){                                  // 每次击杀：累计计数 + 百人斩 + 敌人图鉴分类计数
    this.data.kills++;
    if(etype) this.data.stats.ekills[etype]=(this.data.stats.ekills[etype]||0)+1;
    if(this.data.kills>=100) this.grant('kills100');
    this.save();
  },
  onWeaponUse(wid){ if(wid) this.data.stats.wuse[wid]=(this.data.stats.wuse[wid]||0)+1; },
  onWeaponKill(wid){ if(wid) this.data.stats.wkill[wid]=(this.data.stats.wkill[wid]||0)+1; },
  onDescend(){ this.addShards(8, true); this.grant('reach_f2'); },          // 完成一层：+8 碎片（横幅留给下潜演出）
  onBuy(){ this.grant('first_buy'); },
  onFlawless(){ this.addShards(3, true); this.grant('flawless'); },          // 特殊挑战：无伤清剿 +3
  onBossKill(bossKey, time){                       // bossKey: 'ironjaw' | 'faceless'
    const st=this.data.stats.boss[bossKey]||(this.data.stats.boss[bossKey]={count:0,bestT:0});
    st.count++;
    if(time>0 && (!st.bestT || time<st.bestT)) st.bestT=time;
    this.addShards(bossKey==='faceless'?40:15, true);
    this.grant('kill_boss');
  },
  onWin(){ this.data.stats.wins++; this.grant('win_run'); },
  onRunStart(){ this.data.stats.runs++; },
  onJackpot(){ this.grant('jackpot'); },
  onStreak8(){ this.grant('streak8'); },

  /* Run 结算碎片：死亡按到达层数 / 胜利额外 +25（Boss 击杀碎片已在 bossDefeated 结算） */
  awardRun(result, floorNum){
    const n = result==='win' ? 25 : 6+5*Math.max(0,(floorNum||1)-1);
    this.addShards(n);
    return n;
  },

  /* 测试钩子 */
  debugUnlockAll(){ this.MILESTONES.forEach(m=>this.data.flags[m.id]=true); GATED_ITEMS.forEach(id=>this.data.items[id]=true); this.save(); },
  debugReset(){ this.data=freshData(); try{ localStorage.removeItem(KEY); }catch(e){} },
};
G.meta = M;
M.load();
})();
