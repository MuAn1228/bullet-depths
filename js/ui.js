/* 弹膛深渊 - UI：HUD / 小地图 / 界面切换 / 提示 */
'use strict';
(function(){
const UI = {
  els:{}, toastT:0, itemToastT:0, bannerT:0, mmScale:4.6,

  init(){
    ['hud','hearts','statbar','mMoney','mKeys','mArmor','activeBox','actName','actCd','wname','wslots','ammo',
     'floorTag','minimap','bossbar','bossname','bossfill','toast','itemToast','prompt','banner',
     'screenTitle','screenPause','screenDead','screenWin','fade','hurtFlash','lowhp','deadStats','winStats','buildList','deathTip',
     'crosshair','bigmapWrap','bigmap','bigmapTitle']
      .forEach(id=>this.els[id]=G.$(id));
    this.mm = this.els.minimap.getContext('2d');
    G.$('btnStart').onclick = ()=>{ G.audio.unlock(); G.audio.sfx('ui'); G.game.newGame(); };
    G.$('btnRetry').onclick = ()=>{ G.audio.sfx('ui'); G.game.returnToBase(); };
    G.$('btnAgain').onclick = ()=>{ G.audio.sfx('ui'); G.game.returnToBase(); };
    G.$('btnResume').onclick = ()=>{ G.audio.sfx('ui'); G.game.togglePause(false); };
    G.$('btnRestartP').onclick = ()=>{ G.audio.sfx('ui'); G.game.restartFromPause(); };
    G.$('btnTitleP').onclick = ()=>{ G.audio.sfx('ui'); G.game.toTitle(); };
    const bindVol=(id,kind)=>{ const el=G.$(id); el.oninput=()=>G.audio.setVol(kind, el.value/100); };
    bindVol('volMaster','master'); bindVol('volMusic','music'); bindVol('volSfx','sfx');
  },

  showHud(on){ this.els.hud.style.display = on?'block':'none'; },
  screen(name){ // 'title'|'pause'|'dead'|'win'|null —— 显式映射，避免大小写拼接错误
    const map={ title:'screenTitle', pause:'screenPause', dead:'screenDead', win:'screenWin' };
    const target=map[name]||'';
    ['screenTitle','screenPause','screenDead','screenWin'].forEach(s=>this.els[s].classList.toggle('on', s===target));
  },

  /* 准星：仅游戏进行/转场时显示（此时画布隐藏了系统指针），其余界面交还系统指针 */
  updateCrosshair(){
    const ch=this.els.crosshair;
    if(!ch) return;
    const st=G.game?G.game.state:'';
    if((st==='play'||st==='transition') && !(G.shop&&G.shop.isOpen()) && !(G.base&&G.base.isOpen())){
      ch.style.display='block';
      ch.style.transform=`translate(${G.input.mouse.x}px,${G.input.mouse.y}px)`;
    } else {
      ch.style.display='none';
    }
  },
  fade(on, instant){ this.els.fade.style.transition = instant?'none':'.45s'; this.els.fade.style.opacity = on?1:0; },

  hearts(p){
    const total = Math.ceil(p.maxHp/2);
    let html='';
    for(let i=0;i<total;i++){
      const v = p.hp - i*2;
      let cls='hh';
      if(v>=2) cls+=' full';
      else if(v===1) cls+=' half';
      else cls+=' empty';
      if(p.maxArmor>0 && p.armor>0 && i===total-1) cls+=' armored';
      html+=`<span class="${cls}"></span>`;
    }
    this.els.hearts.innerHTML = html;
  },
  weapon(p){
    const w = p.weapons[p.curW];
    if(!w){ this.els.wname.textContent='—'; this.els.ammo.textContent='0/0'; this.els.wslots.textContent='—'; return; }
    this.els.wname.textContent = w.def.name;
    this.els.ammo.textContent = w.ammo+'/'+w.def.mag;
    this.els.ammo.className = w.reloading?'reloading':(w.ammo===0?'empty':'');
    let slots='';
    p.weapons.forEach((ww,i)=>{ slots += (i===p.curW?'▶':'　')+(i+1)+'.'+ww.def.name.slice(0,6)+' '; });
    this.els.wslots.textContent = slots;
  },
  stats(p){
    this.els.mMoney.textContent = p.money;
    this.els.mKeys.textContent = p.keys;
    this.els.mArmor.textContent = p.armor;
    if(p.active){
      this.els.actName.textContent = '［'+p.active.name+'］';
      this.els.actCd.textContent = p.activeCd>0 ? Math.ceil(p.activeCd)+'s' : '就绪 [F]';
    } else { this.els.actName.textContent='无主动技能'; this.els.actCd.textContent='—'; }
    // 构筑 HUD：被动标签（悬停看说明）+ 关键数值总览（仅持有被动时显示）
    const ph=document.getElementById('passiveHud');
    if(ph){
      if(!p.passives.length){ ph.style.display='none'; }
      else{
        ph.style.display='block';
        document.getElementById('phTags').innerHTML = p.passives.map(id=>{
          const it=G.items.passives[id];
          return '<i style="border-color:'+it.color+';color:'+it.color+'" title="'+it.name+'：'+it.desc+'">'+it.name.slice(0,2)+'</i>';
        }).join('');
        const st=p.st, rows=[];
        if(st.dmgMul!==1) rows.push('伤 ×'+st.dmgMul.toFixed(2));
        if(st.rateMul!==1) rows.push('速 ×'+st.rateMul.toFixed(2));
        if(st.crit>0) rows.push('暴 '+Math.round(st.crit*100)+'%');
        if(st.speedMul!==1) rows.push('移 ×'+st.speedMul.toFixed(2));
        if(st.bulletSpdMul!==1) rows.push('弹 ×'+st.bulletSpdMul.toFixed(2));
        if(st.vamp>0) rows.push('吸 '+Math.round(st.vamp*100)+'%');
        if(st.thorns>0) rows.push('棘 '+st.thorns);
        if(st.pierce>0) rows.push('穿 +'+st.pierce);
        if(st.bounce>0) rows.push('跳 +'+st.bounce);
        document.getElementById('phStats').innerHTML = rows.join('　');
      }
    }
  },
  floor(n){
    const NAMES=['','第一层 · 石壁地牢','第二层 · 腐蚀深渊','第三层 · 虚空王座'];
    this._floorText = NAMES[n]||('第'+n+'层');
    this.els.floorTag.textContent = this._floorText;
  },
  /* 剩余敌人计数：n>0 时拼在层名后（锁定房间清剿进度），n=0 恢复纯层名 */
  enemyCount(n){
    const base=this._floorText||'';
    this.els.floorTag.textContent = n>0 ? (base+'　敌人 ×'+n) : base;
  },
  bossBar(on, name, frac){
    this.els.bossbar.style.display = on?'block':'none';
    if(on){ this.els.bossname.textContent=name; this.els.bossfill.style.width=(frac*100)+'%'; }
  },
  toast(msg){ this.els.toast.textContent=msg; this.els.toast.style.opacity=1; this.toastT=1.8; },
  itemToast(msg){ this.els.itemToast.innerHTML=msg; this.els.itemToast.style.opacity=1; this.itemToastT=2.6; },
  banner(big, small){
    this.els.banner.innerHTML = big + (small?('<small>'+small+'</small>'):'');
    this.els.banner.style.opacity=1; this.bannerT=2.6;
  },
  prompt(msg){ // msg=null 隐藏
    if(!msg){ this.els.prompt.style.display='none'; return; }
    this.els.prompt.innerHTML=msg; this.els.prompt.style.display='block';
  },
  hurtFlash(){ const el=this.els.hurtFlash; el.style.opacity=.45; setTimeout(()=>el.style.opacity=0,90); },
  lowHp(on){ this.els.lowhp.style.opacity = on?1:0; },

  endScreenStats(elId, run){
    const t = Math.floor(run.time), m=String(Math.floor(t/60)).padStart(2,'0'), s=String(t%60).padStart(2,'0');
    const el = this.els[elId];
    el.innerHTML =
      `用时 <b>${m}:${s}</b>　击杀 <b>${run.kills}</b>　弹壳 <b>${run.moneyEarned}</b><br>`+
      `到达层数 <b>${G.game.floorNum}</b>　承受伤害 <b>${run.dmgTaken}</b>　开启宝箱 <b>${run.chests}</b>`+
      (run.best?`<br><span style="color:#e0a03a;">★ 最速通关纪录 ${run.best}</span>`:'');
  },

  /* ---------- 地图渲染（小地图 / Tab大地图 共用） ---------- */
  drawMap(cv, g, big){
    const mm=cv.getContext('2d'), W=cv.width, H=cv.height;
    mm.clearRect(0,0,W,H);
    mm.fillStyle='#0a0810'; mm.fillRect(0,0,W,H);
    if(!g.floor) return;
    const f=g.floor;
    const rooms=f.rooms.filter(r=>r.discovered || r.mapHint);
    if(!rooms.length) return;
    // 动态缩放：已知房间整体铺满画布（固定小比例会让房间只有几个像素大，看起来"只有边框"）
    let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
    rooms.forEach(r=>{
      minX=Math.min(minX,r.rx); maxX=Math.max(maxX,r.rx+r.rw);
      minZ=Math.min(minZ,r.rz); maxZ=Math.max(maxZ,r.rz+r.rh);
    });
    const pad=big?26:16;
    const spanX=Math.max(1,maxX-minX), spanZ=Math.max(1,maxZ-minZ);
    let s=Math.min((W-pad*2)/spanX,(H-pad*2)/spanZ);
    s=Math.min(s, big?110:66); // 早期房间少时限制放大倍率，避免单房占满全图
    const ox=(W-spanX*s)/2-minX*s;
    const oy=(H-spanZ*s)/2-minZ*s;
    const colors={ start:'#7a9a5a', treasure:'#d8b03a', shop:'#4aa0c8',
                   exit:'#d09030', boss:'#c03028', secret:'#9a6ac8', npc:'#c07a50', shrine:'#c05a80', gamble:'#50a890' };
    // 房间连接走廊（粗线，从缝隙中透出形成通道）
    mm.strokeStyle='rgba(150,132,100,.5)';
    mm.lineWidth=Math.max(3,s*.26); mm.lineCap='round';
    for(const d of f.doors){
      const [a,b]=d.rooms;
      if(!a.discovered && !b.discovered) continue;
      mm.beginPath();
      mm.moveTo(ox+(a.rx+a.rw/2)*s, oy+(a.rz+a.rh/2)*s);
      mm.lineTo(ox+(b.rx+b.rw/2)*s, oy+(b.rz+b.rh/2)*s);
      mm.stroke();
    }
    const gap=Math.max(2,s*.12);
    rooms.forEach(r=>{
      const x=ox+r.rx*s, y=oy+r.rz*s, w=r.rw*s-gap, h=r.rh*s-gap;
      if(!r.discovered){ // 相邻已知但未进入：暗色轮廓
        mm.fillStyle='rgba(90,84,72,.35)'; mm.fillRect(x,y,w,h);
        mm.strokeStyle='rgba(120,110,90,.4)'; mm.lineWidth=1; mm.strokeRect(x+.5,y+.5,w-1,h-1);
        return;
      }
      let c=colors[r.type]||'#5a5048';
      if(r.type==='combat') c=r.cleared?'#6a7a58':'#8a5040';
      if(r.type==='boss'&&r.cleared) c='#7a5a58';
      mm.fillStyle=c;
      mm.fillRect(x,y,w,h);
      mm.strokeStyle='rgba(0,0,0,.55)'; mm.lineWidth=1; mm.strokeRect(x+.5,y+.5,w-1,h-1);
      // 当前房间高亮框
      if(r===g.curRoom){
        mm.strokeStyle='#ffe9a0'; mm.lineWidth=Math.max(2,s*.09); mm.strokeRect(x-2,y-2,w+4,h+4);
      }
      // 图标
      const ix=x+w/2, iy=y+h/2;
      mm.fillStyle='rgba(255,255,255,.95)';
      mm.font='bold '+Math.max(9,Math.round(s*.5))+'px Consolas';
      mm.textAlign='center'; mm.textBaseline='middle';
      let ic=null;
      if(r.type==='shop') ic='$';
      if(r.type==='treasure') ic='★';
      if(r.type==='exit') ic='▼';
      if(r.type==='boss') ic='☠';
      if(r.type==='secret') ic='?';
      if(r.type==='npc') ic='☺';
      if(r.type==='shrine') ic='†';
      if(r.type==='gamble') ic='%';
      if(r.type==='start') ic='S';
      if(ic) mm.fillText(ic,ix,iy);
      if(r.type==='combat'&&!r.cleared){ mm.fillStyle='#ff9060'; mm.fillText('!',ix,iy); }
    });
    // 玩家：白色朝向箭头（尺寸随地图比例；坐标按当前房间 tile 尺寸换算）
    if(g.player){
      const p=g.player;
      const px=ox+(p.x/(G.CW||12))*s, py=oy+(p.z/(G.CH||9))*s;
      mm.save();
      mm.translate(px,py);
      mm.rotate(p.face||0);
      mm.fillStyle='#ffffff';
      const sz=Math.max(6,s*.42);
      mm.beginPath();
      mm.moveTo(sz,0); mm.lineTo(-sz*.7,sz*.7); mm.lineTo(-sz*.35,0); mm.lineTo(-sz*.7,-sz*.7);
      mm.closePath(); mm.fill();
      mm.strokeStyle='#000'; mm.lineWidth=Math.max(1,s*.06); mm.stroke();
      mm.restore();
    }
  },

  minimap(g){ this.drawMap(this.els.minimap, g, false); },

  bigmap(on){
    this._bigOn = on===undefined ? !this._bigOn : !!on;
    const w=this.els.bigmapWrap;
    if(!w) return;
    w.classList.toggle('on', this._bigOn);
    if(this._bigOn){
      const FN=['','第一层 · 石壁地牢','第二层 · 腐蚀深渊','第三层 · 虚空王座'];
      this.els.bigmapTitle.textContent = (FN[G.game.floorNum]||('第'+G.game.floorNum+'层'))+'　（Tab 关闭）';
      this.drawMap(this.els.bigmap, G.game, true);
    }
  },

  update(dt){
    if(this.toastT>0){ this.toastT-=dt; if(this.toastT<=0) this.els.toast.style.opacity=0; }
    if(this.itemToastT>0){ this.itemToastT-=dt; if(this.itemToastT<=0) this.els.itemToast.style.opacity=0; }
    if(this.bannerT>0){ this.bannerT-=dt; if(this.bannerT<=0) this.els.banner.style.opacity=0; }
    // 大地图打开时实时刷新
    if(this._bigOn && this.els.bigmapWrap && this.els.bigmapWrap.classList.contains('on')){
      this.drawMap(this.els.bigmap, G.game, true);
    }
  }
};
G.ui = UI;
})();
