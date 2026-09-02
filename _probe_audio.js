
function param(tag){ return { value:1, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){}, setTargetAtTime:function(){} }; }
function node(){ return { connect:function(){}, disconnect:function(){}, start:function(){}, stop:function(){}, onended:null, type:'', detune:param('d'), Q:param('q'), pan:param('p'), gain:param('g'), frequency:param('f'), buffer:null, loop:false, threshold:param('t'), ratio:param('r'), knee:param('k'), playbackRate:param('pb') }; }
const ctx={ currentTime:0, sampleRate:44100,
  createGain:function(){return node();}, createOscillator:function(){return node();},
  createBiquadFilter:function(){return node();}, createBufferSource:function(){return node();},
  createConvolver:function(){return node();}, createDynamicsCompressor:function(){return node();},
  createStereoPanner:function(){return node();},
  createBuffer:function(){return {getChannelData:function(){return new Float32Array(100);}}; },
};
global.window={AudioContext:function(){return ctx;}};
global.G={clamp:function(v,a,b){return v<a?a:(v>b?b:v);},game:{state:'play',inBase:false,curRoom:{locked:true},floorNum:1,player:{hp:6,maxHp:6,x:0,z:0}},boss:{}};
require('./js/audio.js');
const orig=G.audio._mnote;
G.audio._mnote=function(type,f,t,dur,vol,fq){
  if(!isFinite(vol)||!isFinite(f)||!isFinite(t)||!isFinite(dur)){
    console.log('BAD _mnote type='+type+' f='+f+' t='+t+' dur='+dur+' vol='+vol);
    console.log('  layerG=',JSON.stringify(this._layerG));
    return;
  }
  return orig.apply(this,arguments);
};
G.audio.unlock();
G.audio.music('f1',true);
for(let i=0;i<40;i++){ ctx.currentTime+=0.03; G.audio._sched(); G.audio.update(1/60); }
console.log('done');
