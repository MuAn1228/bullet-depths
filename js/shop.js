/* 弹膛深渊 - 武器商店系统
   职责清单（禁止逻辑散回其他模块）：
   ① 武器目录 UI：网格卡片（按品阶分组、稀有度配色）+ 详情面板 + 与当前武器属性对比
   ② 购买事务：验金 → 扣款 → 给予（走现有武器槽规则）→ 记账，防重复/防连点/防负数
   数据单一来源：武器属性全部引用 weapons.js 的 W.defs，售价一律经 W.priceOf（品阶统一定价）。
   本模块不复制任何武器属性——武器数值或价格体系改动后，商店自动同步。 */
'use strict';
(function(){
const TIER_ORDER = ['D','C','B','A'];
const TIER_NAME  = { D:'制式', C:'量产', B:'精良', A:'传说' };
const TIER_COLOR = { D:'#9aa4ac', C:'#5ad07a', B:'#58a8ff', A:'#c87aff' };
const LINES_OK   = ['好枪，拿去吧。','眼光不错，朋友。','这把在下面可吃香了。','成交！祝你在深渊里活得久一点。'];
const LINES_POOR = ['你的钱还不够。','弹壳不够，去下面多捡点。','赊账免谈，规矩就是规矩。'];

const S = {
  _open:false, sel:null, _busy:false, _built:false, els:{}, cards:{}, _greetT:0,

  /* 目录：与展示同序（品阶升序、阶内价格升序）。唯一数据源 = W.defs */
  catalogIds(){
    const W=G.weapons, out=[];
    for(const t of TIER_ORDER){
      out.push(...Object.keys(W.defs).filter(id=>W.defs[id].tier===t)
        .sort((a,b)=>W.priceOf(W.defs[a])-W.priceOf(W.defs[b])));
    }
    return out;
  },
  priceOf(id){ const W=G.weapons, def=W.defs[id]; return def ? W.priceOf(def) : 0; },
  owned(id){ const p=G.player; return !!(p && p.weapons.some(w=>w.id===id)); },
  isOpen(){ return this._open; },

  /* ---------- 面板开关 ---------- */
  open(){
    if(this._open || !G.player || G.game.state!=='play') return false;
    this._open=true; this._busy=false;
    G.input.mouse.wheel=0;   // 进店瞬间的滚动不带入（wheel 不再由 endFrame 清）
    this._build();
    if(!this.sel) this.sel=this.catalogIds()[0];
    G.game.curInteract=null;
    G.ui.prompt(null);
    this.refresh();
    this.els.wrap.classList.add('on');
    G.audio.sfx('buy',{v:.45});
    if(this._greetT<=0){
      G.ui.toast('「欢迎光临深渊军火铺——弹壳就是金钱，朋友。」');
      this._greetT=6;
    }
    return true;
  },
  close(){
    if(!this._open) return false;
    this._open=false; this._busy=false;
    if(this.els.wrap) this.els.wrap.classList.remove('on');   // 面板可能从未构建（如新局直接 close）
    G.input.mouse.down=false; G.input.mouse.wheel=0; G.input.buffer={};
    return true;
  },

  /* ---------- DOM 构建（只构建一次，之后仅刷新状态） ---------- */
  _build(){
    if(this._built) return;
    this._built=true;
    const $=G.$;
    this.els={
      wrap:$('shopWrap'), money:$('shopMoneyVal'), grid:$('shopGrid'),
      detail:$('shopDetail'), buy:$('shopBuy'), hint:$('shopHint'),
    };
    // 卡片：按品阶分组（D→A），阶内按价格升序；稀有度用边框/徽章配色表达
    const grid=this.els.grid; grid.innerHTML='';
    this.cards={};
    for(const id of this.catalogIds()){
      const def=G.weapons.defs[id], price=this.priceOf(id), tc=TIER_COLOR[def.tier];
      const locked=!G.meta.unlocked(id);            // 未解锁：??? 占位卡（图标照画，吊胃口）
      const card=document.createElement('div');
      card.className='wcard t'+def.tier;
      card.innerHTML=
        '<canvas class="wicon" width="72" height="44"></canvas>'+
        '<div class="wname">'+(locked?'？？？':def.name)+'</div>'+
        '<div class="wrow"><span class="wtier" style="color:'+tc+'">'+TIER_NAME[def.tier]+'</span>'+
        '<span class="wprice">'+price+'</span></div>'+
        '<div class="wowned">已持有</div>'+
        (locked?'<div class="wlockedtag">未解锁</div>':'');
      if(!locked) this._icon(card.querySelector('canvas'), def, tc, id);
      else {  // 未解锁：暗底 + ？？？剪影（不放真实图标，保持神秘感）
        const cx=card.querySelector('canvas').getContext('2d');
        cx.fillStyle='#17121e'; cx.fillRect(0,0,72,44);
        cx.fillStyle='#c87aff'; cx.font='bold 18px Consolas,monospace'; cx.textAlign='center';
        cx.fillText('？？？',36,28);
      }
      card.onclick=()=>{ this.sel=id; this.refresh(); G.audio.sfx('ui',{v:.35}); };
      grid.appendChild(card);
      this.cards[id]=card;
    }
    this.els.buy.onclick=()=>{ if(this.sel) this.buy(this.sel); };
  },

  /* ---------- 刷新（余额 / 卡片状态 / 详情与对比） ---------- */
  refresh(){
    if(!this._built) return;
    const p=G.player;
    this.els.money.textContent = p ? p.money : 0;
    for(const id of this.catalogIds()){
      const card=this.cards[id];
      const owned=this.owned(id);
      const locked=!G.meta.unlocked(id);
      card.classList.toggle('owned', owned);
      card.classList.toggle('locked', locked);
      card.classList.toggle('sel', this.sel===id);
      card.classList.toggle('poor', !owned && !locked && p && p.money < this.priceOf(id));
    }
    this._renderDetail();
  },

  _renderDetail(){
    const p=G.player;
    const id=this.sel, def=G.weapons.defs[id];
    if(!def){ this.els.detail.innerHTML=''; return; }
    const price=this.priceOf(id), tc=TIER_COLOR[def.tier];
    const owned=this.owned(id);
    const locked=!G.meta.unlocked(id);
    const cur=p && p.weapons[p.curW];
    const cmp=(mine,theirs,better)=>{ // better: 'hi'=越大越好 'lo'=越小越好
      if(theirs==null) return '';
      const d=mine-theirs;
      if(Math.abs(d)<1e-9) return '<i class="ceq">＝</i>';
      const up = d>0;
      const good = (better==='hi') ? up : !up;
      return '<i class="'+(good?'cup':'cdown')+'">'+(up?'▲':'▼')+'</i>';
    };
    const curDmg = cur ? cur.def.dmg : null;
    const row=(label, val, arrow)=>'<tr><td>'+label+'</td><td><b>'+val+'</b></td><td class="carr">'+(arrow||'')+'</td></tr>';
    if(locked){
      const ms=G.meta.milestoneOf(id);
      this.els.detail.innerHTML=
        '<div class="dhead"><span class="dtier" style="color:'+tc+'">'+TIER_NAME[def.tier]+'</span>'+
        '<span class="dname">？？？</span></div>'+
        '<div class="dblrub">尚未解锁 —— 里程碑「'+ms.title+'」：'+ms.desc+'</div>'+
        '<div class="dcmp">解锁后将加入商店与掉落池（售价 '+price+' 弹壳）</div>';
      const b=this.els.buy;
      b.classList.remove('ok','no','own'); b.classList.add('no');
      b.textContent='未 解 锁'; b.onclick=()=>{ G.audio.sfx('error',{v:.4}); };
      return;
    }
    let html=
      '<div class="dhead"><span class="dtier" style="color:'+tc+'">'+TIER_NAME[def.tier]+'</span>'+
      '<span class="dname">'+def.name+'</span></div>'+
      '<div class="dblrub">'+def.blurb+'</div>'+
      '<table class="dstats">';
    html+=row('伤害', def.dmg+(def.pellets>1?'×'+def.pellets:''), cmp(def.dmg,curDmg,'hi'));
    html+=row('射速', def.rate.toFixed(1)+'/s', cmp(def.rate, cur?cur.def.rate:null,'hi'));
    html+=row('弹匣', def.mag, cmp(def.mag, cur?cur.def.mag:null,'hi'));
    html+=row('射程', def.range>0 ? def.range+'m' : '—', def.range>0?cmp(def.range, cur?cur.def.range:null,'hi'):'');
    html+=row('装填', def.reload+'s', cmp(def.reload, cur?cur.def.reload:null,'lo'));
    html+=row('售价', price+' 弹壳', '');
    html+='</table>';
    if(cur && !owned){
      html+='<div class="dcmp">当前武器：'+cur.def.name+'（剩余槽位 '+(2-p.weapons.length)+'）</div>';
      if(p.weapons.length>=2)
        html+='<div class="dwarn">⚠ 购买后将替换当前武器，旧枪掉落在原地</div>';
    }
    this.els.detail.innerHTML=html;
    // 购买按钮三态
    const b=this.els.buy;
    b.classList.remove('ok','no','own');
    if(owned){ b.textContent='已 持 有'; b.classList.add('own'); }
    else if(p && p.money>=price){ b.textContent='购 买（'+price+' 弹壳）'; b.classList.add('ok'); }
    else { b.textContent='弹壳不足（需 '+price+'）'; b.classList.add('no'); }
    // 点击一律进入 buy() 事务：成功→扣款；不足/已持有→由事务给出明确反馈（NPC 台词+抖动），绝不空操作
    b.onclick=()=>{ if(this.sel) this.buy(this.sel); };
  },

  /* ---------- 购买事务（唯一入口；UI 与自测共用，保证「显示=实际扣款」） ---------- */
  buy(id){
    const def=G.weapons.defs[id];
    if(!def || this._busy) return false;
    const p=G.player;
    if(!p || G.game.state!=='play') return false;
    if(!G.meta.unlocked(id)){
      G.ui.toast('「这把还没解锁，朋友。」');
      G.audio.sfx('error');
      if(this._open){ this.refresh(); this._shake(id); }
      return false;
    }
    if(this.owned(id)){
      G.ui.toast('「你身上已经有一把『'+def.name+'』了。」');
      G.audio.sfx('error');
      if(this._open) this.refresh();
      return false;
    }
    const price=this.priceOf(id);
    if(p.money<price){
      G.ui.toast('「'+LINES_POOR[Math.floor(Math.random()*LINES_POOR.length)]+'」（还差 '+(price-p.money)+' 弹壳）');
      G.audio.sfx('error');
      if(this._open){ this.refresh(); this._shake(id); }
      return false;
    }
    this._busy=true;                       // 事务原子性：连点不会重复进入
    p.money-=price;                        // 先扣款（不可能为负：上面已验金）
    G.game.run.moneySpent=(G.game.run.moneySpent||0)+price;
    p.giveWeapon(G.weapons.mktWeapon(id)); // 再给予：现有武器槽规则（<2 把入槽，满 2 把替换当前并掉落旧枪）
    G.audio.sfx('buy');
    G.meta.onBuy();                                  // 局外里程碑：军火交易
    G.fx.burst(p.x,.8,p.z,10,{color:0xffd23e,spd:2.4,life:.5,s0:.2});
    G.ui.toast('「'+LINES_OK[Math.floor(Math.random()*LINES_OK.length)]+'」');
    this._busy=false;
    if(this._open) this.refresh(); else { G.ui.stats(p); G.ui.weapon(p); }
    return true;
  },
  _shake(id){
    const card=this.cards[id];
    if(!card) return;
    card.classList.remove('shake');
    void card.offsetWidth;                 // 重置动画
    card.classList.add('shake');
  },

  /* ---------- 武器像素图标（程序化，72×44；与武器数据同源渲染） ---------- */
  _icon(cv, def, tc, id){
    const x=cv.getContext('2d');
    x.clearRect(0,0,72,44);
    const DARK='#23262e', MET='#3a3f4a', WOOD='#7a5a38', GOLD='#e8c15a', ACC=tc;
    const R=(a,b,w,h,c)=>{ x.fillStyle=c; x.fillRect(a,b,w,h); };
    x.fillStyle='rgba(0,0,0,.35)'; x.fillRect(4,38,64,3);
    switch(id){
      case 'rusty':
        R(34,17,20,6,MET); R(24,15,14,10,DARK); x.fillStyle=GOLD; x.beginPath(); x.arc(31,20,5,0,7); x.fill();
        R(22,23,7,13,WOOD); R(50,14,3,3,MET); break;
      case 'ramenfork':
        R(28,3,3,9,MET); R(34,3,3,9,MET); R(40,3,3,9,MET);   // 三齿
        R(26,11,20,4,MET); R(33,14,5,16,DARK); R(30,29,11,9,WOOD); break; // 杆+粗柄
      case 'paperplane':
        x.fillStyle='#f2eedd'; x.beginPath(); x.moveTo(12,26); x.lineTo(62,16); x.lineTo(30,32); x.closePath(); x.fill();
        x.fillStyle='#c8c4b4'; x.beginPath(); x.moveTo(12,26); x.lineTo(30,32); x.lineTo(26,38); x.closePath(); x.fill();
        R(58,14,4,4,'#8fd0ff'); break;
      case 'smg':
        R(20,17,32,8,DARK); R(52,19,14,4,MET); R(34,25,6,13,MET); R(12,19,8,4,MET); R(24,15,10,3,ACC); break;
      case 'shotgun':
        R(20,15,44,4,MET); R(20,20,44,4,MET); R(34,24,13,6,WOOD); R(12,16,9,9,WOOD); R(60,13,3,3,GOLD); break;
      case 'ricochet':
        R(24,16,26,9,DARK); R(50,18,10,5,MET); R(26,25,7,13,WOOD);
        x.strokeStyle=ACC; x.lineWidth=2; x.beginPath(); x.arc(50,10,8,-.6,2.4); x.stroke();
        x.beginPath(); x.arc(60,16,7,2.4,5.4); x.stroke(); break;
      case 'rifle':
        R(18,19,46,4,DARK); R(30,15,17,8,MET); R(34,10,10,4,DARK); R(14,17,13,7,WOOD); R(36,23,6,9,MET); break;
      case 'laser':
        R(22,18,36,6,MET); R(24,20,32,2,ACC); R(26,12,3,6,MET); R(40,12,3,6,MET); R(28,24,6,8,DARK); R(56,17,6,8,ACC); break;
      case 'hive':
        R(24,14,20,14,MET); x.fillStyle=ACC;
        x.beginPath(); x.arc(30,21,2.4,0,7); x.arc(38,21,2.4,0,7); x.fill();
        R(44,18,14,5,DARK); R(27,28,6,9,WOOD); break;
      case 'burst':
        R(20,17,36,8,DARK); R(56,18,9,4,MET); R(34,25,6,11,MET); R(14,18,7,7,WOOD);
        x.fillStyle=ACC; x.fillRect(28,12,3,3); x.fillRect(34,12,3,3); x.fillRect(40,12,3,3); break;
      case 'plasma':
        x.fillStyle=ACC; x.beginPath(); x.arc(30,20,8,0,7); x.fill();
        x.fillStyle=MET; x.beginPath(); x.arc(30,20,4.5,0,7); x.fill();
        R(38,17,20,6,DARK); R(18,16,10,9,MET); R(42,23,6,7,MET); break;
      case 'rocket':
        R(16,15,44,12,DARK); R(58,17,5,8,GOLD); R(12,11,7,5,ACC); R(12,26,7,5,ACC);
        R(14,17,6,8,MET); R(30,27,7,9,MET); break;
      case 'rail':
        R(14,19,50,4,DARK); R(28,14,4,11,ACC); R(40,14,4,11,ACC); R(10,17,9,9,MET); R(52,15,3,3,GOLD); break;
      case 'frost':
        R(24,16,26,9,DARK); R(50,25,7,12,WOOD);
        x.fillStyle=ACC;
        x.beginPath(); x.moveTo(50,17); x.lineTo(66,13); x.lineTo(58,21); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(50,23); x.lineTo(68,24); x.lineTo(54,27); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(50,25); x.lineTo(64,32); x.lineTo(50,29); x.closePath(); x.fill(); break;
      case 'arc':
        R(24,17,28,8,MET); R(30,10,4,7,ACC); R(38,10,4,7,ACC); R(46,10,4,7,ACC); R(52,18,10,5,DARK);
        x.strokeStyle=ACC; x.lineWidth=2; x.beginPath();
        x.moveTo(62,16); x.lineTo(66,20); x.lineTo(63,21); x.lineTo(68,26); x.stroke(); break;
      case 'polaroid':
        R(22,13,30,19,'#8a6a34'); R(24,15,26,15,'#b09040');
        x.fillStyle=DARK; x.beginPath(); x.arc(32,23,5,0,7); x.fill();
        x.beginPath(); x.arc(43,23,5,0,7); x.fill();
        x.fillStyle=GOLD; x.beginPath(); x.arc(32,23,2,0,7); x.fill(); x.beginPath(); x.arc(43,23,2,0,7); x.fill();
        x.strokeStyle=ACC; x.lineWidth=2; x.beginPath();
        x.moveTo(20,10); x.lineTo(16,6); x.moveTo(18,14); x.lineTo(12,13); x.stroke(); break;
      default:
        R(24,17,30,8,DARK); R(54,18,10,4,MET);
    }
  },

  update(dt){ if(this._greetT>0) this._greetT-=dt; },
};
G.shop = S;
})();
