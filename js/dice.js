/* 弹膛深渊 - 悖论骰子：掷骰攻击 / 连续计数 / 现实不稳定度 / PARADOX 现实崩坏
   职责清单（禁止逻辑散回其他模块）：
   - release()   掷骰结算：1~6 各自真实攻击效果（弱弹/双弹/散射/冻结钉/追踪/大爆炸）
   - 连续机制    lastRoll/cons：同数字累加、异数归一；cons≥4 → 本次攻击变为 PARADOX
   - paradox()   现实崩坏：全房敌人一次真实伤害（精英×1.3，Boss 走 hurtBoss 单次封顶 26）
   - update()    现实不稳定度衰减 + 高不稳定阶段的世界异常演出（节流，不干扰输入）
   - reset()     开新局归零（game.startRun 调用，不跨局）
   所有伤害走 G.hurtEnemy / G.hurtBoss；测试可用 _force 强制点数。 */
'use strict';
(function(){
const PARADOX_CONS=4, DMG_ENEMY=34, DMG_ELITE_MUL=1.3, DMG_BOSS=26, INSTAB_DECAY=8;
const COL={1:0x9a9a9a, 2:0xffd23e, 3:0xff9a3e, 4:0x8fd0ff, 5:0xff5050, 6:0xffffff};
const COL_CSS={1:'#9a9a9a', 2:'#ffd23e', 3:'#ff9a3e', 4:'#8fd0ff', 5:'#ff5050', 6:'#ffffff'};

const D = {
  lastRoll:0, cons:0, instab:0, _force:0, _glitchT:0,

  reset(){ this.lastRoll=0; this.cons=0; this.instab=0; this._force=0; this._glitchT=0; },

  /* ---------- 掷骰结算（chargeT 结束后由 player.js 调用） ---------- */
  release(p, ang, def){
    const roll=this._force || (1+((Math.random()*6)|0));
    this._force=0;
    this.cons=(roll===this.lastRoll)? this.cons+1 : 1;
    this.lastRoll=roll;
    this.instab=Math.min(100,this.cons*25);
    G.audio.sfx('diceStop',{v:.55});
    G.fx.ring(p.x,.9,p.z,COL[roll],.85);
    G.fx.dmgNum(p.x,1.7,p.z,'§'+roll,true,{color:COL_CSS[roll], scale:1.35});
    // 连续 4 次同数字：跳过普通攻击，进入 PARADOX
    if(this.cons>=PARADOX_CONS){ this.paradox(p, ang); return; }
    const shot=(da,d2,life,kind,color)=>G.weapons.spawn({
      team:'p', x:p.muzzleX, z:p.muzzleZ, ang:ang+da, spd:10,
      dmg:d2, size:.17, color:color||COL[roll], life:life, pierce:0, knock:2, wid:'dice',
      kind:kind||'',
    });
    switch(roll){
      case 1: shot(0, 3, .55); break;                                   // 厄运：短程弱弹
      case 2: shot(-.06,5,1.2); shot(.06,5,1.2); break;                 // 双重
      case 3: for(const da of [-.16,0,.16]) shot(da,4.5,1.3); break;    // 三重散射
      case 4:                                                           // 冻结：现实禁止其行动
        G.weapons.spawn({team:'p', x:p.muzzleX, z:p.muzzleZ, ang, spd:8.5,
          dmg:4, size:.18, color:0x8fd0ff, life:1.2, pierce:0, knock:1, wid:'dice', kind:'dice4'});
        break;
      case 5:                                                           // 追踪：自动寻的
        G.weapons.spawn({team:'p', x:p.muzzleX, z:p.muzzleZ, ang, spd:6.5,
          dmg:9, size:.2, color:0xff5050, life:3, pierce:0, knock:2, wid:'dice', kind:'homing'});
        G.audio.sfx('shock',{v:.3});
        break;
      case 6: {                                                         // 毁灭：瞄准点大爆炸
        const ax=p.x+Math.cos(ang)*4.5, az=p.z+Math.sin(ang)*4.5;
        G.weapons.explode(ax,az,2.6,26,'p');
        G.fx.shake(.3);
        break;
      }
    }
  },

  /* ---------- PARADOX：现实崩坏（连续 4 次同数字） ---------- */
  paradox(p, ang){
    this.cons=0; this.lastRoll=0; this.instab=0;
    G.fx.hitstop(.12);
    G.fx.screenFlash('#e8d8ff',.09);
    G.fx.shake(.35);
    G.audio.sfx('paradox',{v:.9});
    for(const e of G.enemies.list){
      if(e.dead||e.spawnT>0) continue;
      G.hurtEnemy(e, DMG_ENEMY*(e.elite?DMG_ELITE_MUL:1), ang, 3, true);
      G.fx.burst(e.x,.7,e.z,8,{color:0xc87aff,spd:3.4,life:.5,s0:.16});
    }
    const boss=G.boss&&G.boss.active;
    if(boss && !boss.dead && G.dist(p.x,p.z,boss.x,boss.z)<14) G.hurtBoss(DMG_BOSS);   // Boss 削弱：单次封顶
    G.fx.ring(p.x,.9,p.z,0xc87aff,4.5);
    G.fx.ring(p.x,.9,p.z,0x6a3ab8,6.5);
  },

  /* ---------- 每帧：不稳定度衰减 + 高不稳定世界异常（节流演出，不干扰输入） ---------- */
  update(dt){
    if(this.instab>0) this.instab=Math.max(0,this.instab-INSTAB_DECAY*dt);
    if(this.instab>=50){
      this._glitchT-=dt;
      if(this._glitchT<=0){
        this._glitchT=1.4-this.instab/100;
        G.fx.shake(.03+this.instab/100*.07);
        G.fx.screenFlash('#c8a9ff',.04);
      }
    }
  },
};
G.dice = D;
})();
