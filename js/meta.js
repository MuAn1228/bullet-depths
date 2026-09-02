/* 弹膛深渊 - 局外系统：里程碑解锁（跨局持久化）
   职责清单（禁止逻辑散回其他模块）：
   ① 里程碑达成判定与授予（横幅反馈，幂等）② 武器解锁旗标存取（localStorage bd_unlocks）
   ③ 累计击杀计数。武器池/商店目录/展示架读取 unlocked() 过滤；本模块不做任何玩法逻辑。 */
'use strict';
(function(){
const KEY='bd_unlocks';
const MILESTONES=[
  {id:'reach_f2',  title:'初次下潜', desc:'抵达第二层',                 unlock:['ricochet','laser']},
  {id:'first_buy', title:'军火交易', desc:'在武器商店购买一件武器',       unlock:['burst']},
  {id:'kills100',  title:'百人斩',   desc:'累计击杀 100 只敌人',          unlock:['hive']},
  {id:'flawless',  title:'完美清剿', desc:'无伤通过一间锁定的战斗房',      unlock:['arc']},
  {id:'kill_boss', title:'讨伐铁颚', desc:'击败 Boss 通关一次',           unlock:['rocket','rail','frost']},
  {id:'jackpot',   title:'头奖',     desc:'用赌徒的灾难触发一次 JACKPOT',  unlock:['polaroid']},
  {id:'streak8',   title:'赌运亨通', desc:'赌徒的灾难 Gambling Streak ×8', unlock:['gambler']},
];

const M = {
  data:{flags:{},kills:0},
  MILESTONES,

  load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw){ const d=JSON.parse(raw); this.data.flags=d.flags||{}; this.data.kills=d.kills||0; }
    }catch(e){}
  },
  save(){ try{ localStorage.setItem(KEY, JSON.stringify(this.data)); }catch(e){} },

  unlocked(wid){                                  // 武器是否已解锁（未挂里程碑的武器恒真）
    const m=this.milestoneOf(wid);
    return !m || !!this.data.flags[m.id];
  },
  milestoneOf(wid){ return this.MILESTONES.find(m=>m.unlock.includes(wid)) || null; },

  /* 达成里程碑（幂等）：授旗标 + 持久化 + 横幅列出本次解锁的武器 */
  grant(mid){
    const m=this.MILESTONES.find(x=>x.id===mid);
    if(!m || this.data.flags[mid]) return false;
    this.data.flags[mid]=true;
    this.save();
    const names=m.unlock.map(id=>G.weapons.defs[id].name).join('」「');
    G.audio.sfx('chest',{v:.7});
    G.ui.banner('武器解锁','「'+names+'」已加入深渊军火铺 · '+m.title);
    return true;
  },

  /* 里程碑钩子（游戏各处调用） */
  onKill(){                                       // 每次击杀：累计计数 + 百人斩
    this.data.kills++;
    if(this.data.kills>=100) this.grant('kills100');
    this.save();
  },
  onDescend(){ this.grant('reach_f2'); },
  onBuy(){ this.grant('first_buy'); },
  onFlawless(){ this.grant('flawless'); },
  onBossKill(){ this.grant('kill_boss'); },
  onJackpot(){ this.grant('jackpot'); },
  onStreak8(){ this.grant('streak8'); },

  /* 测试钩子 */
  debugUnlockAll(){ this.MILESTONES.forEach(m=>this.data.flags[m.id]=true); this.save(); },
  debugReset(){ this.data={flags:{},kills:0}; try{ localStorage.removeItem(KEY); }catch(e){} },
};
G.meta = M;
M.load();
})();
