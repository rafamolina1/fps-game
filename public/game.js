import * as T from '/vendor/three.module.js';
import {boxes,radius} from './world.js';
const $=id=>document.getElementById(id);
const scene=new T.Scene(), camera=new T.PerspectiveCamera(75,1,.06,160);
let renderer;
try {
 renderer = new T.WebGLRenderer({antialias:true});
} catch (error) {
 throw new Error('Não foi possível iniciar o 3D. Ative a aceleração gráfica do navegador e recarregue a página. ' + error.message);
}
document.body.prepend(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
scene.background=new T.Color(0x29234b);scene.fog=new T.FogExp2(0x29234b,.014);
scene.add(new T.HemisphereLight(0xfff0ff,0x8771dc,2.4));
const sun=new T.DirectionalLight(0xffe3ad,2);sun.position.set(6,15,8);scene.add(sun);
function mesh(geometry,color,parent=scene){
 const obj=new T.Mesh(geometry,new T.MeshStandardMaterial({color,flatShading:true}));parent.add(obj);return obj;
}
function box(w,h,d,x,y,z,color,parent){
 const obj=mesh(new T.BoxGeometry(w,h,d),color,parent);obj.position.set(x,y,z);return obj;
}
box(radius*2,1,radius*2,0,-.5,0,0x49426d);
scene.add(new T.GridHelper(32,32,0xffc764,0x76619b));scene.children.at(-1).position.y=.015;
for(const [i,[x,z,w,d,h]] of boxes.entries()){
 box(w,h,d,x,h/2,z,i%2?0xce627f:0x398e98);box(w+.04,.12,d+.04,x,h,z,0xffce78);
}
for(let i=0;i<120;i++){
 const star=mesh(new T.IcosahedronGeometry(.08+Math.random()*.4),0xecc8ff);
 const a=Math.random()*Math.PI*2;star.position.set(55*Math.cos(a),Math.random()*52-8,55*Math.sin(a));
}
const duck=new T.Group();scene.add(duck);
function oval(x,y,z,a,b,c,color,parent){const m=mesh(new T.SphereGeometry(1,14,10),color,parent);m.scale.set(a,b,c);m.position.set(x,y,z);return m;}
oval(0,0,0,.72,.52,.8,0xffdb30,duck);oval(0,.57,-.32,.42,.42,.42,0xffdb30,duck);
box(.5,.16,.42,0,.52,-.74,0xff7d33,duck);
for(const x of [-.28,.28])oval(x,.68,-.56,.065,.075,.065,0x141428,duck);
scene.add(camera);const gun=box(.18,.2,.54,.31,-.24,-.55,0x6fdddd,camera);
const muzzle=box(.13,.13,.12,.31,-.24,-.84,0xffda4f,camera);
const actors=new Map(),keys=new Set();let state,id,ws,yaw=0,pitch=0,fire=false,audio,lastShot,lastHit;
const locked=()=>document.pointerLockElement===renderer.domElement;
function stop(){keys.clear();fire=false;}
function layout(){
 const playing=state?.phase==='play', active=playing && locked();
 $('panel').hidden=active;$('home').hidden=!!state;$('room').hidden=!state||playing;$('pause').hidden=!playing;$('hud').hidden=!active;
 if(!playing && locked())document.exitPointerLock();
}
function beep(freq){
 if(!audio || !$('vol').valueAsNumber)return;
 const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.value=freq;
 gain.gain.value=$('vol').valueAsNumber*.008;gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.1);
 osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.11);
}
function emit(data){if(ws?.readyState===1)ws.send(JSON.stringify(data));}
function connect(type){
 if(ws && ws.readyState<2)return;
 const name=$('nick').value.trim();if(!name){$('nick').focus();$('msg').textContent='Escolha um apelido.';return;}
 const endpoint=window.GAME_SERVER || location.origin.replace(/^http/,'ws');
 try { ws=new WebSocket(endpoint); }
 catch (error) { $('msg').textContent='Endereço do servidor inválido: '+error.message; return; }
 const connection=ws;
 $('create').disabled=$('join').disabled=true;
 $('msg').textContent='Conectando…';
 const timeout=setTimeout(()=>{
   if(connection===ws && !state){
     $('msg').textContent='O servidor não respondeu. Confira se npm start continua rodando e abra o endereço mostrado no terminal.';
     connection.close();
   }
 },8000);
 const ready=()=>{clearTimeout(timeout);$('create').disabled=$('join').disabled=false;};
 ws.onopen=()=>emit({type,name,code:$('code').value.trim(),cap:$('cap').value});
 ws.onerror=()=>$('msg').textContent='Servidor indisponível. Confira a conexão.';
 ws.onclose=()=>{ready();state=null;stop();layout();if(!$('msg').textContent)$('msg').textContent='Conexão encerrada.';};
 ws.onmessage=({data})=>{
 const m=JSON.parse(data);
 if(m.type==='error'){$('msg').textContent=m.message;if(!state)ws.close();return;}
 if(m.type==='joined'){ready();id=m.id;$('msg').textContent='';return;}
 if(m.type!=='state')return;
 ready();
 const old=state;state=m;
 if(old?.phase!==m.phase){stop();$('msg').textContent='';layout();}
 if(m.phase!=='play'){
 const sorted=[...m.players].sort((a,b)=>b.score-a.score);
 const winners=sorted.filter(p=>Math.floor(p.score)===Math.floor(sorted[0].score));
 const result=m.mode==='laser'?(m.teams[0]===m.teams[1]?'Empate':m.teams[0]>m.teams[1]?'Turquesa venceu':'Coral venceu'):winners.length>1?'Empate':winners[0].name+' venceu';
 $('title').textContent=m.phase==='result'?result:'Sala '+m.room;
 $('roster').replaceChildren(...sorted.map(p=>{const li=document.createElement('li');li.textContent=p.name+(p.id===m.host?' ★':'')+(m.phase==='result'?' · '+Math.floor(p.score)+' pts':'');return li;}));
 $('options').hidden=m.host!==id;$('lobby').hidden=m.phase!=='result';$('start').textContent=m.phase==='result'?'Jogar de novo':'Iniciar rodada';
 }
 };
}
$('code').value=new URLSearchParams(location.search).get('sala')||'';
$('create').onclick=()=>connect('create');$('join').onclick=()=>connect('join');
$('copy').onclick=async()=>{const link=new URL(location.href);link.searchParams.set('sala',state.room);try{await navigator.clipboard.writeText(link.href);$('msg').textContent='Convite copiado.';}catch{$('msg').textContent=link.href;}};
$('start').onclick=()=>emit({type:'start',mode:$('mode').value,minutes:$('minutes').value,goal:$('goal').value});
$('lobby').onclick=()=>emit({type:'lobby'});document.querySelectorAll('.exit').forEach(b=>b.onclick=()=>ws.close());
$('resume').onclick=()=>{audio??=new AudioContext();audio.resume();renderer.domElement.requestPointerLock();};
document.addEventListener('pointerlockchange',()=>{stop();layout();});
onblur=stop;onkeydown=e=>{if(locked()){keys.add(e.code);e.preventDefault();}};onkeyup=e=>keys.delete(e.code);
onmousemove=e=>{if(locked()){const k=$('sens').valueAsNumber*.0007;yaw-=e.movementX*k;pitch=Math.max(-1.5,Math.min(1.5,pitch-e.movementY*k));}};
onmousedown=e=>{if(locked() && e.button===0)fire=true;};onmouseup=()=>fire=false;
setInterval(()=>{if(state?.phase==='play')emit({type:'input',yaw,pitch,f:+keys.has('KeyW')-keys.has('KeyS'),s:+keys.has('KeyD')-keys.has('KeyA'),jump:keys.has('Space'),run:keys.has('ShiftLeft'),fire});},50);
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}onresize=resize;resize();
const target=new T.Vector3();
function draw(time){
 const live=state?.phase==='play',players=live?state.players:[],me=players.find(p=>p.id===id);
 for(const [key,obj] of actors)if(!players.some(p=>p.id===key)){scene.remove(obj);obj.geometry.dispose();obj.material.dispose();actors.delete(key);}
 gun.visible=muzzle.visible=!!me && !me.dead;
 if(me){
 camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);camera.position.lerp(target.set(me.x,me.y+1.35,me.z),.55);
 for(const p of players){if(p===me)continue;let obj=actors.get(p.id);
 if(!obj){obj=mesh(new T.CapsuleGeometry(.43,.85,4,10),p.team?0xff7891:0x50f0d6);actors.set(p.id,obj);obj.position.set(p.x,p.y+.88,p.z);}
 obj.visible=!p.dead;obj.position.lerp(target.set(p.x,p.y+.88,p.z),.48);}
 const holder=players.find(p=>p.id===state.holder);
 duck.visible=state.mode==='duck' && holder!==me;
 if(holder)duck.position.set(holder.x,holder.y+2.2,holder.z);else duck.position.set(...state.duck);
 const left=Math.max(0,Math.ceil((state.end-state.now)/1000));$('clock').textContent=Math.floor(left/60)+'m '+String(left%60).padStart(2,'0')+'s';
 $('objective').textContent=state.mode==='laser'?'Turquesa '+state.teams[0]+' × '+state.teams[1]+' Coral · Seu time: '+(me.team?'Coral':'Turquesa'):holder===me?'Você está com o pato!':holder?'Pegue o pato de '+holder.name:'Pegue o pato dourado!';
 $('status').textContent=me.dead?'Reaparecendo…':'Vida '+me.hp+'/3 · '+Math.floor(me.score)+' pts · '+(me.cool>state.now?'Recarregando':'Raio pronto');
 if(me.flash && me.flash!==lastShot){lastShot=me.flash;beep(240);}
 if(me.hit && me.hit!==lastHit){lastHit=me.hit;beep(820);}
 muzzle.visible=gun.visible && state.now-me.flash<110;$('cross').style.color=state.now-me.hit<200?'#ffda39':'white';
 }else{duck.visible=true;duck.position.set(0,1,0);const a=time*.00005;camera.position.set(24*Math.sin(a),14,24*Math.cos(a));camera.lookAt(0,0,0);}
 duck.rotation.y=time*.0016;renderer.render(scene,camera);requestAnimationFrame(draw);
}requestAnimationFrame(draw);
