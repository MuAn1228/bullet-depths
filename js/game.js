/* 弹膛深渊 - 游戏主控：状态机 / 房间逻辑 / 相机 / 主循环 / 自测 */
'use strict';
(function(){
const GAME = {
  state:'boot', floorNum:1, floor:null, player:null, run:null,
  curRoom:null, curInteract:null, spawnQueue:[], strikes:[], flyingCrown:null,
  inBase:false,
  manual:false, acc:0, lastT:0, camX:0, camZ:0, _mmT:0,

  init(){
    // 场景
    G.scene = new THREE.Scene();
    G.world = new THREE.Group();
    G.scene.add(G.world);
    // 灯光
    const ambient=new THREE.AmbientLight(0xffffff,.6);
    const hemi=new THREE.HemisphereLight(0xffffff,0x222222,.5);
    const dir=new THREE.DirectionalLight(0xffffff,.8);
    dir.position.set(6,14,4);
    dir.castShadow=G.renderer!==null;
    if(G.renderer){
      dir.shadow.mapSize.set(1024,1024);
      const sc=dir.shadow.camera;
      sc.left=-24; sc.right=24; sc.top=24; sc.bottom=-24; sc.near=1; sc.far=45;
      dir.shadow.bias=-0.002;
    }
    const dirTarget=new THREE.Object3D();
    G.scene.add(dirTarget); dir.target=dirTarget;
    G.scene.add(ambient,hemi,dir);
    G.lights={ambient,hemi,dir,dirTarget};
    // 相机
    G.camera=new THREE.PerspectiveCamera(46, 16/9, .1, 60);
    // 子系统
    G.fx.init(G.scene);
    G.weapons.init(G.scene);
    G.props=[];
    G.pickups=[];
    // 地面瞄准指示环（跟随光标落点，辅助俯视角瞄准）
    {
      const retRing=new THREE.Mesh(new THREE.RingGeometry(.18,.27,18),
        new THREE.MeshBasicMaterial({color:0xffd23e,transparent:true,opacity:.65,depthWrite:false}));
      retRing.rotation.x=-Math.PI/2;
      const retDot=new THREE.Mesh(G.sphGeo(.05,6), G.bmat(0xffe9a0));
      retDot.position.y=.02;
      G.reticle=new THREE.Group();
      G.reticle.add(retRing); G.reticle.add(retDot);
      G.reticle.position.y=.06;
      G.reticle.visible=false;
      G.scene.add(G.reticle);
    }
    this.state='title';
    G.audio.music('title');
    // 按键钩子
    G.onKeyPress = (code)=>{
      if(code==='Escape'){
        if(G.shop && G.shop.isOpen()){ G.shop.close(); return; }   // 商店打开时 Esc 只关商店
        if(G.base && G.base.isOpen()){ G.base.closePanel(); return; } // 基地面板同理
        if(this.state==='play') this.togglePause(true);
        else if(this.state==='pause') this.togglePause(false);
      }
      if(code==='KeyE'){
        if(G.shop && G.shop.isOpen()){ G.shop.close(); return; }
        if(G.base && G.base.isOpen()){ G.base.closePanel(); return; }
      }
      // 死亡/胜利结算：E/回车/空格 返回基地（基地是默认归宿）
      if((code==='KeyE'||code==='Enter'||code==='Space') && (this.state==='dead'||this.state==='win')){
        this.returnToBase(); return;
      }
      if(code==='Tab' && (this.state==='play'||this.state==='pause')){
        if(this.inBase){ G.ui.toast('基地没有地图——深渊升降梯在西侧。'); return; }
        G.ui.bigmap(); // Tab 切换全屏大地图
        G.audio.sfx('ui',{v:.4});
      }
    };
  },

  /* ---------- 基地「废弃军械站」：局外循环中心 ----------
     集成方式：基地=特殊 floor（复用 tile 碰撞/房间/交互/构建管线）+ play 态 + inBase 旗标，
     主循环/暂停/交互零改动；地牢代码全部由 inBase 分支隔离。 */

  newGame(){                                        // 标题「开始」→ 基地（首次进基地带引导）
    if(this.state!=='title') return;
    this.state='transition';
    G.ui.screen(null);
    G.audio.sfx('doorOpen');
    G.ui.fade(true);
    setTimeout(()=>this.enterBase('title'), 480);
  },

  enterBase(from){                                  // from: 'title' | 'dead' | 'win'
    this.state='transition';
    G.shop && G.shop.close();
    G.base.closePanel();
    G.ui.screen(null); G.ui.fade(true); G.ui.prompt(null); G.ui.bigmap(false);
    setTimeout(()=>this._enterBaseNow(from), from==='title'?600:550);
  },
  _enterBaseNow(from){
    this.cleanupDynamic();
    this.run=this.newRun();                         // 基地复用 play 态主循环，run 必须非空（run.time 在基地照常走表）
    if(G.player){ G.scene.remove(G.player.mesh); G.player=null; }
    G.floor=this.floor=G.base.install();            // 每次重建：展示架/战利品随解锁成长
    this.floorNum=0;
    this.curRoom=this.floor.startRoom;
    G.player=G.createPlayer(11,9.5);
    G.player.weapons=[G.weapons.mktWeapon('rusty')];
    const mb=G.meta.up('medbay'); if(mb){ G.player.maxHp+=2*mb; }   // 基地内即见升级效果
    G.player.hp=G.player.maxHp;
    this.state='play'; this.inBase=true;
    G.ui.showHud(false); G.ui.screen(null);
    G.audio.music('base');
    G.ui.fade(false);
    G.base.onEnter(from);
  },

  /* 死亡/胜利结算 → 返回基地（结算碎片一次性入账并 toast） */
  returnToBase(){
    if(this.state!=='dead' && this.state!=='win') return;
    if(performance.now()-(this._resultT||0)<700) return;   // 防死亡瞬间连按误触
    const result=this.state==='win'?'win':'dead';
    const gained=G.meta.awardRun(result, this.floorNum);
    if(result==='dead') G.meta.data.stats.deaths++;
    G.meta.save();
    this._shardToast='深渊碎片 +'+gained+' ◆（当前 '+G.meta.data.shards+'）';
    this.enterBase(result);
  },

  /* 基地 → 地牢：乘深渊升降梯，过场后走既有 startRun 全量重置 */
  launchRun(){
    if(this.state!=='play' || !this.inBase) return;
    G.base.closePanel();
    G.ui.prompt(null);
    this.state='transition';
    G.audio.sfx('doorOpen');
    G.ui.fade(true);
    setTimeout(()=>{
      this.inBase=false;
      G.base.hud(false);
      this.startRun();
      G.ui.fade(false);
    }, 550);
  },

  toTitle(){
    this.state='title'; this.inBase=false;
    G.shop && G.shop.close(); G.base.closePanel();
    this.cleanupDynamic();
    G.base.teardownWorld();
    if(G.player){ G.scene.remove(G.player.mesh); G.player=null; }
    this.floor=null; G.floor=null; this.floorNum=1;
    G.ui.showHud(false); G.base.hud(false); G.ui.screen('title');
    G.audio.music('title');
  },

  restartFromPause(){
    this.togglePause(false);
    if(this.inBase) this.toTitle();                 // 基地不是一局：暂停里的重新开始=回标题
    else this.startRun();
  },

  newRun(){
    return { time:0, kills:0, moneyEarned:0, dmgTaken:0, chests:0, roomsCleared:0, moneySpent:0, best:null };
  },

  startRun(){
    this.inBase=false;
    G.base && G.base.leave();
    G.rng = new G.RNG((Date.now()^(Math.random()*1e9))>>>0);
    this.run=this.newRun();
    this.floorNum=1;
    G.shop && G.shop.close(); // 关闭武器商店面板（局内购买 UI 不跨局）
    G.gambler && G.gambler.reset(); // 赌徒的灾难：Streak/牌组/最近牌全部归零（不跨局）
    G.input.buffer={}; // 清残留输入缓冲
    // 清场
    this.cleanupDynamic();
    G.player && G.scene.remove(G.player.mesh);
    G.player=G.createPlayer(0,0);
    G.player.weapons=[G.weapons.mktWeapon('rusty')];
    /* 基地永久升级真实接入新局：医疗站开局上限 / 弹药工作台装填速度 / 武器仓库开局第二把 */
    if(G.meta){
      G.meta.onRunStart();
      const mb=G.meta.up('medbay'); if(mb){ G.player.maxHp+=2*mb; G.player.hp=G.player.maxHp; }
      const am=G.meta.up('ammo'); if(am) G.player.st.reloadMul*=Math.pow(.88,am);
      if(G.meta.up('armory')){
        const wid=G.weapons.randomWeaponId('C');
        if(wid && wid!=='rusty' && !G.player.weapons.some(w=>w.id===wid)) G.player.weapons.push(G.weapons.mktWeapon(wid));
      }
    }
    this.startFloor(1, true);
    G.ui.showHud(true);
    G.ui.screen(null);
    G.ui.hearts(G.player); G.ui.weapon(G.player); G.ui.stats(G.player);
    this.state='play';
    G.audio.music('f1');
    G.ui.banner('第一层 · 石壁地牢','找到通往深处的阶梯');
  },

  cleanupDynamic(){
    G.enemies.clear();
    G.boss.clear();
    G.weapons.clear();
    G.scalpel && G.scalpel.clear();   // 切割刀裂隙不跨房/跨局残留
    G.sunrevolver && G.sunrevolver.clear();   // 太阳之弹的三层视觉不跨房/跨局残留
    for(const pk of G.pickups){ G.scene.remove(pk.mesh); if(pk.label) G.scene.remove(pk.label); }
    G.pickups.length=0;
    this.spawnQueue.length=0;
    this.strikes.length=0;
    this.curRoom=null;
    this.curInteract=null;
    this.flyingCrown=null;
  },

  startFloor(n, isNew){
    this.floorNum=n;
    this.cleanupDynamic();
    this.floor = G.gen.genFloor(n, (G.rng.next()^0x9e3779b9)>>>0);
    G.floor=this.floor;
    G.build.buildFloor(this.floor);
    const sr=this.floor.startRoom;
    if(!G.player) G.player=G.createPlayer(sr.cx, sr.cz);
    else { G.player.x=sr.cx; G.player.z=sr.cz; G.player.vx=0; G.player.vz=0; }
    G.player.mesh.position.set(sr.cx,0,sr.cz);
    // 标记起始房
    this.markDiscovered(sr);
    this.curRoom=sr;
    G.ui.floor(n);
    G.ui.minimap(this);
    if(!isNew){
      G.player.heal && G.player.heal(2);
      G.audio.music(['','f1','f2','f3'][n]||'f2');
    }
  },

  markDiscovered(room){
    room.discovered=true;
    for(const nb of room.neighbors){ if(nb.type!=='secret') nb.mapHint=true; }
  },

  /* ---------- 房间逻辑 ---------- */
  onRoomEnter(room){
    if(room===this.curRoom) return;
    this.curRoom=room;
    if(!room.discovered) this.markDiscovered(room);
    room.visited=true;
    G.scalpel && G.scalpel.clear();   // 裂隙绑定房间：换房即闭合
    G.ui.minimap(this);
    if(room.type==='combat' && !room.cleared && !room.locked){
      this.lockRoom(room);
    }
    if(room.type==='boss' && !room.cleared && !room.bossSpawned){
      room.bossSpawned=true;
      this.lockRoom(room);
      this.bossFightT=this.run.time;                // Boss 战计时起点（图鉴最佳击杀时间）
      G.boss.spawn(room.cx, room.z0+2.6);
    }
  },

  lockRoom(room){
    room.locked=true;
    room.dmgAtLock=this.run.dmgTaken;   // 无伤清剿里程碑：记录锁门时的受伤基线
    room.lockTime=0; room.lockWarnT=0;
    for(const d of room.doors) d.open=false;
    G.audio.sfx('doorSlam');
    G.fx.shake(.15);
    this.spawnWave(room,0);
  },

  spawnWave(room, idx){
    room.waveIdx=idx;
    const wave=room.enemyWaves && room.enemyWaves[idx];
    if(!wave) return;
    for(const e of wave){
      const pos=G.roomSpawnPos(room, G.player);
      this.spawnQueue.push({t:.25+Math.random()*.4, type:e.type, elite:e.elite, room});
    }
  },

  /* 清剿判定：每帧扫描全部锁定房间（不依赖玩家所在位置，杜绝遗漏）+ 软锁保底 */
  checkRoomClear(room, dt){
    const floors=this.floor;
    if(!floors) return;
    for(const rm of floors.rooms){
      if(!rm.locked) continue;
      if(rm.type!=='combat') continue;
      const pending=this.spawnQueue.some(s=>s.room===rm);
      const alive=G.enemies.list.some(e=>e.room===rm && !e.dead);
      if(!pending && !alive){
        if(rm.enemyWaves && rm.waveIdx < rm.enemyWaves.length-1){
          this.spawnWave(rm, rm.waveIdx+1);
          G.ui.toast('敌人增援来袭！');
        } else {
          this.clearRoom(rm);
        }
      } else {
        // 残敌提醒：长时间未清剿时周期性提示剩余数量（仅提示，绝不自动清除）。
        // 反软锁由敌人系统的"位置非法 0.8 秒自愈"负责（只处理卡墙敌人），
        // 不做整房超时清空——避免慢节奏战斗（绕后盾卫/躲避激光）中敌人凭空消失。
        rm.lockTime=(rm.lockTime||0)+dt;
        if(rm.lockTime>30 && (!rm.lockWarnT || rm.lockTime-rm.lockWarnT>15)){
          rm.lockWarnT=rm.lockTime;
          const n=G.enemies.list.filter(e=>e.room===rm&&!e.dead).length + this.spawnQueue.filter(s=>s.room===rm).length;
          G.ui.toast('还有 '+n+' 只敌人 — 搜寻房间每个角落');
        }
      }
    }
  },

  clearRoom(room){
    room.cleared=true; room.locked=false;
    // 局外里程碑「完美清剿」：锁定期间未受伤
    if(room.type==='combat' && G.meta && this.run.dmgTaken===room.dmgAtLock) G.meta.onFlawless();
    room.lockTime=0; room.lockWarnT=0;
    for(const d of room.doors) d.open=true;
    G.audio.sfx('doorOpen');
    G.audio.sfx('roomClear',{v:.55,min:300});   // 清房 fanfare
    this.run.roomsCleared++;
    G.ui.toast('房间肃清！');
    // Boss 引导：第二层起，所有战斗房清完后若 Boss 未触发则提示其方位（防玩家漏找 Boss 房）
    if(this.floorNum>=2 && this.floor && this.floor.bossRoom){
      const boss=this.floor.bossRoom;
      const allCleared=this.floor.rooms.every(r=>r.type!=='combat'||r.cleared);
      if(allCleared && !boss.bossSpawned && !boss.cleared && G.player){
        const dx=boss.cx-G.player.x, dz=boss.cz-G.player.z;
        const dir=Math.abs(dx)>Math.abs(dz)?(dx>0?'东':'西'):(dz>0?'南':'北');
        G.ui.toast('侦测到 Boss 气息——在'+dir+'方的 ☠ 房间（Tab 查看大地图）');
      }
    }
    // 奖励
    const n=G.rng.int(3,5)+this.floorNum*2;
    for(let i=0;i<n;i++) G.spawnPickup('money', room.cx+(Math.random()-.5)*1.5, room.cz+(Math.random()-.5)*1.5);
    if(G.rng.chance(.16)) G.spawnPickup('heart', room.cx, room.cz);
  },

  /* ---------- 隐藏房 ---------- */
  breakSecretDoor(door){
    if(door.broken) return;
    door.broken=true; door.open=true;
    for(const [x,z] of door.tiles){
      const tile=this.floor.tilesGet(x,z);
      if(tile){ tile.t='floor'; tile.room=door.rooms.find(r=>r.type==='secret')||door.rooms[1]; delete tile.secret; }
    }
    if(door.group) door.group.visible=false;
    G.audio.sfx('explosion');
    G.fx.shake(.5);
    G.fx.burst(door.tiles[0][0]+.5,.8,door.tiles[0][1]+.5,16,{color:0x9a8a70,spd:3,life:.6,s0:.2,kind:'m',vy:2});
    G.ui.toast('发现隐藏房间！');
    const secret=door.rooms.find(r=>r.type==='secret');
    if(secret) this.markDiscovered(secret);
    G.ui.minimap(this);
  },

  /* ---------- 楼层切换 ---------- */
  descend(){
    if(this.state!=='play') return;
    this.state='transition';
    G.shop && G.shop.close();
    G.meta && G.meta.onDescend();   // 局外里程碑：初次下潜
    G.audio.sfx('doorOpen');
    G.ui.fade(true);
    G.ui.prompt(null);
    const next=this.floorNum+1;
    const FLOORS=[null,
      {name:'第一层 · 石壁地牢', hint:'寻找下行舱口'},
      {name:'第二层 · 腐蚀深渊', hint:'寻找并讨伐「铁颚」'},
      {name:'第三层 · 虚空王座', hint:'虚空在低语——直面「无面君主」'},
    ];
    const fl=FLOORS[next]||{name:'第'+next+'层', hint:'深入深渊'};
    setTimeout(()=>{
      this.startFloor(next,false);
      this.state='play';
      G.ui.banner(fl.name, fl.hint);
      G.ui.fade(false);
    }, 550);
  },

  /* ---------- 胜负 ---------- */
  bossDefeated(){
    const room=this.floor.bossRoom;
    if(room){ room.cleared=true; room.locked=false; for(const d of room.doors) d.open=true; }
    G.meta && G.meta.onBossKill(this.floorNum>=3?'faceless':'ironjaw', this.run.time-(this.bossFightT||this.run.time));  // Boss 图鉴 + 讨伐碎片
    // 第 2 层：王座崩塌后出现下行舱口，通往最终层（第 3 层击杀才是通关）
    if(this.floorNum<3){
      if(room){
        G.build.makeExit(room,{x:room.cx,z:room.cz});
        G.ui.toast('地面裂开了——出现一座下行舱口！');
      }
      G.fx.shake(.4);
      return;
    }
    G.fx.hitstop(.3);
    setTimeout(()=>this.winRun(), 1700);
  },

  winRun(){
    if(this.state==='win') return;
    this.state='win';
    G.meta && G.meta.onWin();   // 局外里程碑：深渊征服者（通关解锁赌徒的灾难/拍立得）
    G.shop && G.shop.close();
    G.audio.stopMusic();
    G.audio.sfx('victory',{crit:1});
    setTimeout(()=>{ if(G.game.state==='win') G.audio.music('victory'); }, 1300);   // 死亡 stinger → 短暂安静 → 胜利主题（仅仍在结算态）
    // 最佳纪录
    let best=null;
    try{
      const prev=localStorage.getItem('bd_best');
      const t=Math.floor(this.run.time);
      if(!prev || t<parseInt(prev)){ localStorage.setItem('bd_best',''+t); }
      best=localStorage.getItem('bd_best');
      const b=parseInt(best); const m=String(Math.floor(b/60)).padStart(2,'0'), s=String(b%60).padStart(2,'0');
      this.run.best=m+':'+s;
    }catch(e){}
    G.ui.endScreenStats('winStats', this.run);
    this._resultT=performance.now();                // 结算输入闸门（防误触直接跳过）
    const bl=G.$('buildList');
    const items=G.player.passives.map(id=>G.items.passives[id].name);
    const wps=G.player.weapons.map(w=>w.def.name);
    bl.innerHTML='构筑：'+(wps.join(' / ')||'—')+'<br>被动：'+(items.join('、')||'无')+(G.player.active?('　主动：'+G.player.active.name):'');
    G.ui.screen('win');
    G.ui.showHud(false);
    // 撒花
    let i=0;
    const conf=setInterval(()=>{
      if(!G.player){ clearInterval(conf); return; }   // 玩家已重建/清场时立即停止撒花
      G.fx.confetti(G.player.x+(Math.random()-.5)*6, 1.5, G.player.z+(Math.random()-.5)*6);
      if(++i>14) clearInterval(conf);
    },160);
  },

  loseRun(){
    if(this.state==='dead') return;
    this.state='dead';
    G.shop && G.shop.close();
    G.player.mesh.visible=false;
    G.fx.poof(G.player.x,.5,G.player.z,0xc03028);
    G.fx.burst(G.player.x,.6,G.player.z,16,{color:0xc03028,spd:3,life:.8,s0:.2});
    G.fx.slowmo(.3,.8);
    G.audio.stopMusic();
    G.audio.sfx('defeat',{crit:1});
    setTimeout(()=>{ if(G.game.state==='dead') G.audio.music('gameover'); }, 1500);  // 死亡 sting → 低沉 gameover 循环（仅仍在结算态）
    const tips=['翻滚的无敌帧能穿过任何弹幕。','被围攻时，先找掩体再反击。','爆炸桶的连锁能清掉一整波敌人。','商店的钥匙也许能打开绿箱子。','隐藏房的墙上有裂缝——开一枪试试。'];
    G.$('deathTip').textContent='「'+G.rng.pick(tips)+'」';
    G.ui.endScreenStats('deadStats', this.run);
    this._resultT=performance.now();                // 结算输入闸门（防误触直接跳过）
    G.ui.screen('dead');
    G.ui.showHud(false);
  },

  togglePause(on){
    if(on && this.state==='play'){ this.state='pause'; G.ui.screen('pause'); G.input.buffer={}; }
    else if(!on && this.state==='pause'){ this.state='play'; G.ui.screen(null); }
  },

  /* ---------- 主动技能：空袭 ---------- */
  scheduleStrikes(x,z,n){
    for(let i=0;i<n;i++){
      this.strikes.push({ t:0, warn:.45+i*.5, boom:.75+i*.5, x:x+(Math.random()-.5)*1.6, z:z+(Math.random()-.5)*1.6 });
    }
  },

  /* ---------- Boss 皇冠击飞 ---------- */
  crownFly(boss){
    const crown=boss.refs.crown;
    const wp=new THREE.Vector3();
    crown.getWorldPosition(wp);
    boss.refs.head.remove(crown);
    crown.position.copy(wp);
    G.scene.add(crown);
    this.flyingCrown={mesh:crown, vy:5, vx:(Math.random()-.5)*3, vz:(Math.random()-.5)*3, spin:8, t:0};
  },

  /* ---------- 主更新 ---------- */
  update(dt){
    if(this.state!=='play' && this.state!=='win' && this.state!=='dead') { G.fx.update(dt); return; }
    G.input.stepBuffers(dt); // 输入缓冲按逻辑帧倒计时（顿帧/暂停期间缓冲保留，不吞按键）
    const p=G.player;
    this.run.time+=dt;
    // 玩家
    if(this.state==='play') G.playerCtl.update(p,dt);
    // 生成队列
    for(let i=this.spawnQueue.length-1;i>=0;i--){
      const s=this.spawnQueue[i];
      s.t-=dt;
      if(s.t<=0){
        const pos=G.roomSpawnPos(s.room, p);
        const e=G.enemies.spawn(s.type, pos.x, pos.z, s.elite);
        e.room=s.room;
        this.spawnQueue.splice(i,1);
      }
    }
    // 空袭
    for(let i=this.strikes.length-1;i>=0;i--){
      const s=this.strikes[i];
      s.t+=dt;
      if(!s.warned && s.t>=s.warn){ s.warned=true; G.fx.ring(s.x,s.z,1.6,0xff5030,.4); G.fx.light(s.x,1,s.z,0xff5030,1.2,.4); G.audio.sfx('alarm',{v:.4}); }
      if(s.t>=s.boom){
        G.weapons.explode(s.x,s.z,2.2,22,'p');
        this.strikes.splice(i,1);
      }
    }
    // 皇冠
    if(this.flyingCrown){
      const c=this.flyingCrown;
      c.t+=dt;
      c.vy-=14*dt;
      c.mesh.position.x+=c.vx*dt; c.mesh.position.y+=c.vy*dt; c.mesh.position.z+=c.vz*dt;
      c.mesh.rotation.x+=c.spin*dt; c.mesh.rotation.z+=c.spin*.6*dt;
      if(c.mesh.position.y<=.1){ c.mesh.position.y=.1; c.vy*=-.4; c.vx*=.7; c.vz*=.7; c.spin*=.7; if(Math.abs(c.vy)<.5){ this.flyingCrown=null; } }
    }
    // 实体
    G.enemies.update(dt);
    G.boss.update(dt);
    G.weapons.update(dt);
    G.build.update(dt);
    G.photo.update(dt);   // 拍立得：照片碎片物理 / 扇光衰减 / 冻结名单清理
    G.gambler.update(dt); // 赌徒的灾难：Joker 揭牌时间线 / 纸牌飞行 / 卡壳计时 / STREAK HUD
    if(this.inBase && G.base) G.base.update(dt);   // 基地：NPC 工作动画 / 训练靶重生 / 环境粒子
    if(G.scalpel) G.scalpel.update(dt);            // 切割刀：裂隙寿命 / DOT tick
    if(G.jukebox) G.jukebox.update(dt);            // 点唱机：黑胶撞节点 / 节点寿命 / 共振线 / tick 伤害 / Club 灯光
    if(G.sunrevolver) G.sunrevolver.update(dt);    // 太阳左轮：太阳弹三层视觉 / 灼热轨迹 / 环境照明 / 蒸发敌方子弹
    G.fx.update(dt);
    // 房间进入/清剿
    if(this.state==='play' && p){
      const room=G.roomAt(p.x,p.z);
      if(room) this.onRoomEnter(room);
      if(this.curRoom) this.checkRoomClear(this.curRoom,dt);
    }
    // UI
    G.ui.update(dt);
    G.audio.update(dt);   // 音频状态机：战斗层/Boss阶段/ducking/心跳/环境音
    this._mmT-=dt;
    if(this._mmT<=0){
      this._mmT=.15;
      if(this.inBase){ G.base.hudRefresh(); }
      else {
        G.ui.minimap(this); G.ui.weapon(p); G.ui.stats(p);
        // 剩余敌人计数（含生成队列中待出场的）
        let n=0;
        for(const e of G.enemies.list){ if(!e.dead && e.room && e.room.locked) n++; }
        n += this.spawnQueue.filter(s=>s.room && s.room.locked).length;
        G.ui.enemyCount(n);
      }
    }
  },

  /* ---------- 相机与瞄准 ---------- */
  updateCamera(dt){
    const p=G.player;
    if(!p) return;
    // 鼠标 → 世界坐标
    const ndc=new THREE.Vector2((G.input.mouse.x/innerWidth)*2-1, -(G.input.mouse.y/innerHeight)*2+1);
    G.raycaster.setFromCamera(ndc, G.camera);
    const ray=G.raycaster.ray;
    const t=(0.55-ray.origin.y)/ray.direction.y;
    // isFinite 守卫：相机未俯视时射线可能平行地面（direction.y=0 → t=Infinity），
    // 0*Infinity=NaN 会永久污染 camX/相机矩阵/角色朝向，必须跳过本帧更新
    if(t>0 && isFinite(t)){
      G.input.aimX=ray.origin.x+ray.direction.x*t;
      G.input.aimZ=ray.origin.z+ray.direction.z*t;
    }
    // 跟随（基地拉远相机：完整收下功能区，俯瞰整备）
    const camH=this.inBase?21:14.2, camB=this.inBase?9.6:6.4;
    const tx=p.x+(p.aimX-p.x)*.16, tz=p.z+(p.aimZ-p.z)*.16;
    this.camX=G.lerp(this.camX,tx,Math.min(1,6*dt));
    this.camZ=G.lerp(this.camZ,tz,Math.min(1,6*dt));
    // 震动
    const tr=G.fx.trauma*G.fx.trauma;
    const sx=(Math.random()-.5)*tr*.7, sz=(Math.random()-.5)*tr*.7;
    G.camera.position.set(this.camX+sx, camH, this.camZ+camB+sz);
    G.camera.lookAt(this.camX+sx, .4, this.camZ-.2+sz);
    // 平行光跟随
    const d=G.lights;
    d.dir.position.set(p.x+6, 14, p.z+4);
    d.dirTarget.position.set(p.x, 0, p.z);
    d.dirTarget.updateMatrixWorld();
  },

  /* 地面瞄准指示环 */
  updateReticle(dt){
    if(!G.reticle) return;
    const show=(this.state==='play'||this.state==='transition');
    G.reticle.visible=show;
    if(show){
      G.reticle.position.x=G.input.aimX;
      G.reticle.position.z=G.input.aimZ;
      G.reticle.rotation.y+=dt*1.6;
      const s=1+Math.sin(performance.now()*.006)*.1;
      G.reticle.scale.set(s,s,1);
    }
  },

  /* ---------- 主循环 ---------- */
  frame(t){
    requestAnimationFrame((tt)=>this.frame(tt));
    this.frameCount=(this.frameCount||0)+1;
    if(!this.lastT) this.lastT=t;
    let dt=(t-this.lastT)/1000;
    this.lastT=t;
    if(dt>.1) dt=.1;
    const scaled=dt*G.fx.timeScale;
    if(!this.manual && !(G.shop&&G.shop.isOpen()) && !(G.base&&G.base.isOpen())){
      if(G.fx.hitstopT>0){ G.fx.hitstopT-=dt; }
      else{
        this.acc+=scaled;
        const step=1/60;
        let n=0;
        while(this.acc>=step && n<4){ this.update(step); this.acc-=step; n++; }
      }
      this.updateCamera(dt);
    }
    // 屏幕准星 + 地面瞄准环（任何状态每帧刷新，保证界面切换即时生效）
    G.ui.updateCrosshair();
    this.updateReticle(dt);
    if(G.renderer) G.renderer.render(G.scene, G.camera);
    G.input.endFrame();
  },
};

G.game = GAME;
G.raycaster = new THREE.Raycaster();
})();
