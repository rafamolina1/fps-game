import {map} from './world.js';
const $=id=>document.getElementById(id);
const names=['Azul','Âmbar'], colors=['#5894bd','#d6a958'];
const canvas=$('arena'), keys=new Set();
let ignoreMouseUntil=0, drawScene, pitch=0, audio, lastShot=0, lastHit=0;
const graphics=import('./harbor.js').then(({createHarbor})=>{drawScene=createHarbor(canvas);}).catch(()=>{$('msg').textContent='A arena precisa de WebGL 2. Ative a aceleração gráfica e recarregue.';});
function sound(hit){
 if(!audio||audio.state!=='running')return;
 const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
 osc.type=hit?'sine':'triangle';osc.frequency.setValueAtTime(hit?820:155,now);
 osc.frequency.exponentialRampToValueAtTime(hit?1040:38,now+.08);
 gain.gain.setValueAtTime(hit?.065:.18,now);gain.gain.exponentialRampToValueAtTime(.001,now+.11);
 osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+.12);
}
let socket,state,id,angle=0,active=false,firing=false;
const me=()=>state?.players.find(p=>p.id===id);
const host=()=>state?.host===id;
const send=m=>{if(socket?.readyState===1)socket.send(JSON.stringify(m));};
function stop(){
 active=false;firing=false;keys.clear();if(document.pointerLockElement)document.exitPointerLock();
}
function layout(){
 const live=state&&['play','interval'].includes(state.phase);
 $('panel').hidden=!!(active&&live);$('home').hidden=!!state;$('room').hidden=!state||live;
 $('pause').hidden=!live;$('exit').hidden=!state;$('back').hidden=!state||!host()||state.phase==='lobby';
 $('hud').hidden=!live||!active;canvas.hidden=false;
 if(!state||live)return;
 const result=state.phase==='result';
 $('title').textContent=result?(state.solo?'Treino concluído':names[state.winner]+' venceu'):'Sala '+state.code;
 $('summary').textContent=result?(state.solo?'Alvos acertados: '+me().kills:'Placar final: '+state.score.join(' × ')):state.players.length===1?'Comece sozinho para treinar nos alvos ou convide amigos.':'As equipes serão divididas ao iniciar.';
 $('roster').replaceChildren(...state.players.map(p=>{const li=document.createElement('li');li.textContent=p.name+(p.id===state.host?' · anfitrião':'')+(result?' · '+p.kills+' acertos finais':'');return li;}));
 $('copy').hidden=result;$('start').hidden=!host();
 $('start').textContent=result?'Jogar de novo':state.players.length===1?'Iniciar treino':'Iniciar partida';
}
function connect(type){
 if(socket&&socket.readyState<2)return;
 const name=$('nick').value.trim();if(!name){$('nick').focus();$('msg').textContent='Digite seu apelido.';return;}
 try{socket=new WebSocket(window.GAME_SERVER||location.origin.replace(/^http/,'ws'));}catch{$('msg').textContent='Confira o endereço do servidor.';return;}
 const ws=socket;$('msg').textContent='Conectando…';
 const timer=setTimeout(()=>{if(!state){$('msg').textContent='Servidor sem resposta.';ws.close();}},8000);
 ws.onopen=()=>send({type,name,code:$('code').value,cap:$('cap').value});
 ws.onerror=()=>$('msg').textContent='Servidor indisponível.';
 ws.onclose=()=>{clearTimeout(timer);stop();state=null;layout();if(!$('msg').textContent)$('msg').textContent='Conexão encerrada.';};
 ws.onmessage=e=>{
  const m=JSON.parse(e.data);
  if(m.type==='error'){$('msg').textContent=m.message;if(!state)ws.close();return;}
  if(m.type==='joined'){id=m.id;clearTimeout(timer);$('msg').textContent='';return;}
  const prev=state;state=m;
  if(m.phase==='play' && (prev?.phase!=='play'||prev.round!==m.round)){angle=me().angle; pitch=0;}
  if(!['play','interval'].includes(m.phase)&&active)stop();
  if(prev?.phase!==m.phase||prev.host!==m.host||prev.players.length!==m.players.length)layout();
 };
}
$('create').onclick=()=>connect('create');$('join').onclick=()=>connect('join');
$('code').value=new URLSearchParams(location.search).get('sala')||'';
$('copy').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('sala',state.code);try{await navigator.clipboard.writeText(url.href);$('msg').textContent='Convite copiado.';}catch{$('msg').textContent=url.href;}};
$('start').onclick=()=>send({type:'start'});$('back').onclick=()=>send({type:'lobby'});$('exit').onclick=()=>socket.close();
$('resume').onclick=async()=>{await graphics;if(!drawScene){$('msg').textContent='WebGL 2 indisponível. Verifique a aceleração gráfica do navegador.';return;}if(window.AudioContext){audio??=new AudioContext();audio.resume().catch(()=>{});}active=true;layout();if(canvas.requestPointerLock){try{canvas.requestPointerLock()?.catch(()=>{});}catch{}}};
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement){stop();layout();}else{ignoreMouseUntil=performance.now()+200;}});
window.addEventListener('blur',()=>{stop();layout();});
window.addEventListener('keydown',e=>{if(!active)return;e.preventDefault();if(e.code==='Escape'){stop();layout();}else keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));
canvas.onmousedown=e=>{if(active&&e.button===0)firing=true;};window.addEventListener('mouseup',()=>firing=false);
window.addEventListener('mousemove',e=>{if(active&&performance.now()>ignoreMouseUntil&&Math.abs(e.movementY)<220&&Math.abs(e.movementX)<350&&document.pointerLockElement===canvas){angle+=e.movementX*.0024;pitch=Math.max(-.98,Math.min(.98,pitch-e.movementY*.0024));}});
setInterval(()=>{if(state?.phase!=='play')return;
 if(active)angle+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*.1;
 send({type:'input',angle,pitch,forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),side:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),fire:firing||keys.has('Space'),reload:keys.has('KeyR')});
},50);
const radar=$('radar').getContext('2d');
function minimap(p){
 const unit=5;radar.clearRect(0,0,100,60);radar.fillStyle='#566367';
 map.forEach((row,z)=>[...row].forEach((cell,x)=>{if(cell!=='.')radar.fillRect(x*unit,z*unit,unit,unit);}));
 for(const q of state.players){if(q.id===p.id||q.team!==p.team||!q.hp)continue;
 radar.fillStyle='#a8c8dd';radar.fillRect(q.x*unit-1,q.z*unit-1,3,3);}
 radar.save();radar.translate(p.x*unit,p.z*unit);radar.rotate(angle);radar.fillStyle='#ffc75d';
 radar.beginPath();radar.moveTo(4,0);radar.lineTo(-2,-2.8);radar.lineTo(-2,2.8);radar.fill();radar.restore();
}
function render(){
 requestAnimationFrame(render);
 const p=me();drawScene?.(state,p,angle,pitch,active&&!!p);
 if(!active||!p)return;
 if(p.shot&&p.shot!==lastShot){lastShot=p.shot;sound(false);}
 if(p.hit&&p.hit!==lastHit){lastHit=p.hit;sound(true);}
 minimap(p);$('reticle').classList.toggle('hit',state.now-p.hit<170);$('reticle').hidden=!p.hp;
 const sec=Math.max(0,Math.ceil((state.deadline-state.now)/1000)),clock=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
 $('score').textContent=state.solo?'TREINO · '+clock:'AZUL '+state.score[0]+' × '+state.score[1]+' ÂMBAR · '+clock;
 $('notice').textContent=state.phase==='interval'?(state.winner===null?'Rodada empatada':names[state.winner]+' venceu a rodada'):!p.hp?'Eliminado · aguarde a próxima rodada':'';
 $('vitals').textContent=p.hp; $('ammo').textContent=p.reload?'•••':p.ammo; $('unit').textContent=state.solo?p.kills+' alvos':'Equipe '+names[p.team];
}
$('create').disabled=$('join').disabled=false;$('msg').textContent='';layout();requestAnimationFrame(render);
