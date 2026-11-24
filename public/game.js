import {cast} from './world.js';
const $=id=>document.getElementById(id);
const names=['Azul','Âmbar'], colors=['#5894bd','#d6a958'];
const canvas=$('arena'),ctx=canvas.getContext('2d',{alpha:false});
const W=480,H=270,F=280;
canvas.width=W;canvas.height=H;
const depth=new Float32Array(W),keys=new Set();
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
 $('hud').hidden=!live||!active;canvas.hidden=!live;
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
  if(m.phase==='play' && (prev?.phase!=='play'||prev.round!==m.round))angle=me().angle;
  if(!['play','interval'].includes(m.phase)&&active)stop();
  if(prev?.phase!==m.phase||prev.host!==m.host||prev.players.length!==m.players.length)layout();
 };
}
$('create').onclick=()=>connect('create');$('join').onclick=()=>connect('join');
$('code').value=new URLSearchParams(location.search).get('sala')||'';
$('copy').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('sala',state.code);try{await navigator.clipboard.writeText(url.href);$('msg').textContent='Convite copiado.';}catch{$('msg').textContent=url.href;}};
$('start').onclick=()=>send({type:'start'});$('back').onclick=()=>send({type:'lobby'});$('exit').onclick=()=>socket.close();
$('resume').onclick=()=>{active=true;layout();if(canvas.requestPointerLock){try{canvas.requestPointerLock()?.catch(()=>{});}catch{}}};
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement){stop();layout();}});
window.addEventListener('blur',()=>{stop();layout();});
window.addEventListener('keydown',e=>{if(!active)return;e.preventDefault();if(e.code==='Escape'){stop();layout();}else keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));
canvas.onmousedown=e=>{if(active&&e.button===0)firing=true;};window.addEventListener('mouseup',()=>firing=false);
window.addEventListener('mousemove',e=>{if(active&&document.pointerLockElement===canvas)angle+=e.movementX*.0024;});
setInterval(()=>{if(state?.phase!=='play')return;
 if(active)angle+=(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')))*.1;
 send({type:'input',angle,forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),side:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),fire:firing||keys.has('Space'),reload:keys.has('KeyR')});
},50);
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
const palettes={'1':['#888c85','#717772'],'2':['#967d61','#7b654c'],'3':['#707f83','#5b686c']};
function render(){
 requestAnimationFrame(render);
 if(!active||!state)return;
 const p=me();if(!p)return;
 rect(0,0,W,H/2,'#aebcc0');rect(0,H/2,W,H/2,'#696c63');
 const dx=Math.cos(angle),dz=Math.sin(angle);
 for(let i=0;i<W;i++){
  const lateral=(i-W/2)/F,hit=cast(p.x,p.z,dx-dz*lateral,dz+dx*lateral);
  depth[i]=hit.depth;const height=F*1.55/Math.max(.01,hit.depth),top=(H-height)/2;
  const palette=palettes[hit.tile];rect(i,top,1,height,palette[Number(hit.side)]);
  if(hit.offset%1<.025)rect(i,top,1,height,'#525957');
  rect(i,top+.83*height,1,height*.09,'#454d49');
 }
 const sprites=state.solo?state.dummies.filter(q=>q.down<=state.now):state.players.filter(q=>q!==p&&q.hp>0);
 const projected=sprites.map(q=>{const x=q.x-p.x,z=q.z-p.z;return {q,d:x*dx+z*dz,u:z*dx-x*dz};}).filter(s=>s.d>.08).sort((a,b)=>b.d-a.d);
 for(const {q,d,u} of projected){
  const scale=F/d,cx=W/2+u*scale,left=Math.max(0,Math.floor(cx-.26*scale)),right=Math.min(W,Math.ceil(cx+.26*scale));
  for(let i=left;i<right;i++){
   if(d>=depth[i])continue;
   const local=Math.abs((i-cx)/scale),y=H/2;
   if(state.solo){rect(i,y-.32*scale,1,.61*scale,local<.1?'#9e4536':'#d4c6a5');if(local<.04)rect(i,y+.29*scale,1,.48*scale,'#493f35');}
   else{
    if(local<.13)rect(i,y-.66*scale,1,.26*scale,'#373b39');
    rect(i,y-.4*scale,1,.56*scale,colors[q.team]);
    if(local>.035&&local<.19)rect(i,y+.16*scale,1,.57*scale,'#383e3b');
   }
  }
 }
 if(p.hp){
  const recoil=state.now-p.shot<100?5:0;
  rect(289,226+recoil,16,49,'#252a28');rect(285,247+recoil,32,30,'#454a45');
  const aim=state.now-p.hit<140?'#edb15e':'#faf7ed';
  rect(W/2-6,H/2,4,1,aim);rect(W/2+3,H/2,4,1,aim);rect(W/2,H/2-6,1,4,aim);rect(W/2,H/2+3,1,4,aim);
 }
 const sec=Math.max(0,Math.ceil((state.deadline-state.now)/1000)),clock=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
 $('score').textContent=state.solo?'TREINO · '+clock:'AZUL '+state.score[0]+' × '+state.score[1]+' ÂMBAR · '+clock;
 $('notice').textContent=state.phase==='interval'?(state.winner===null?'Rodada empatada':names[state.winner]+' venceu a rodada'):!p.hp?'Eliminado · aguarde a próxima rodada':'';
 $('stats').textContent=(state.solo?p.kills+' alvos':'Equipe '+names[p.team])+' · Vida '+p.hp+' · '+(p.reload?'Recarregando…':p.ammo+'/12');
}
$('create').disabled=$('join').disabled=false;$('msg').textContent='';layout();requestAnimationFrame(render);
