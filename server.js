import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {WebSocketServer} from 'ws';
import {boxes,radius,spawns} from './public/world.js';

const files={'/':'index.html','/game.js':'game.js','/world.js':'world.js','/style.css':'style.css','/vendor/three.module.js':'../node_modules/three/build/three.module.js'};
const server=http.createServer(async(req,res)=>{
  const file=files[new URL(req.url,'http://localhost').pathname];
  if(typeof file!=='string'){res.writeHead(404).end();return;}
  const type=file.endsWith('js')?'application/javascript':file.endsWith('css')?'text/css':'text/html';
  try{res.writeHead(200,{'Content-Type':type+'; charset=utf-8'}).end(await readFile(new URL('./public/'+file,import.meta.url)));}catch{res.end();}
});
const rooms=new Map(), sockets=new WebSocketServer({server,maxPayload:2048});
const send=(ws,data)=>{if(ws.readyState===1 && ws.bufferedAmount<65536)ws.send(JSON.stringify(data));};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function spawn(p,i){
  [p.x,p.z]=spawns[i%8];Object.assign(p,{y:0,vy:0,kx:0,kz:0,hp:3,dead:0,input:{},cool:0});
}
function drop(r,p){if(r.holder===p.id){r.holder=null;r.duck=[p.x,p.y+.6,p.z];r.pickup=Date.now()+750;}}
function eliminate(r,p,attacker,now){
  drop(r,p);p.dead=now+1600;p.hp=0;
  if(attacker && r.mode==='laser'){attacker.score++;r.teams[attacker.team]++;}
}
function move(p,axis,step){
  const next=p[axis]+step, x=axis==='x'?next:p.x,z=axis==='z'?next:p.z;
  if(!boxes.some(([a,b,w,d,h])=>p.y<h-.02 && Math.abs(x-a)<w/2+.32 && Math.abs(z-b)<d/2+.32))p[axis]=next;
}
function shoot(r,p,now){
  p.cool=now+380;p.flash=now;
  const cp=Math.cos(p.pitch), dir=[-Math.sin(p.yaw)*cp,Math.sin(p.pitch),-Math.cos(p.yaw)*cp];
  for(let t=.3;t<21;t+=.16){
    const x=p.x+dir[0]*t,y=p.y+1.35+dir[1]*t,z=p.z+dir[2]*t;
    if(y<0 || boxes.some(([a,b,w,d,h])=>y<h && Math.abs(x-a)<w/2 && Math.abs(z-b)<d/2))break;
    const q=r.players.find(q=>q!==p && !q.dead && (r.mode!=='laser'||q.team!==p.team) && y>=q.y && y<=q.y+1.8 && Math.hypot(x-q.x,z-q.z)<.55);
    if(q){q.kx=dir[0]*13;q.kz=dir[2]*13;q.vy=4;p.hit=now;drop(r,q);
      if(--q.hp<=0 || r.mode==='laser')eliminate(r,q,p,now);break;}
  }
}
function tick(r,now){
  const dt=.05;
  for(const [i,p] of r.players.entries()){
    if(p.dead){if(now>=p.dead)spawn(p,i);continue;}
    const k=p.input, f=k.f||0,s=k.s||0,n=Math.max(1,Math.hypot(f,s));
    const speed=(k.run?8:5.8)*(r.holder===p.id?.74:1);
    move(p,'x',((-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)*speed/n+p.kx)*dt);
    move(p,'z',((-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)*speed/n+p.kz)*dt);
    p.kx*=.84;p.kz*=.84;
    let floor=Math.max(Math.abs(p.x),Math.abs(p.z))<=radius?0:-50;
    for(const [x,z,w,d,h] of boxes)if(p.y>=h-.02 && Math.abs(x-p.x)<w/2+.32 && Math.abs(z-p.z)<d/2+.32)floor=Math.max(floor,h);
    if(k.jump && p.y<=floor+.02)p.vy=9.6;
    p.vy-=22*dt;p.y+=p.vy*dt;if(p.y<=floor){p.y=floor;p.vy=0;}
    if(p.y< -4){eliminate(r,p,null,now);continue;}
    if(k.fire && now>=p.cool)shoot(r,p,now);
    if(r.mode==='duck' && !r.holder && now>=r.pickup && Math.hypot(p.x-r.duck[0],p.y+.6-r.duck[1],p.z-r.duck[2])<1.65)r.holder=p.id;
  }
  if(r.duck[1]<-1 || Math.max(Math.abs(r.duck[0]),Math.abs(r.duck[2]))>radius)r.duck=[0,.6,0];
  const carrier=r.players.find(p=>p.id===r.holder);
  if(carrier)carrier.score+=dt;
  if(now>=r.end || (carrier && carrier.score>=r.goal) || Math.max(...r.teams)>=r.goal)r.phase='result';
}
function snapshot(r,now){
  const players=r.players.map(({ws,input,...p})=>p);
  const state={type:'state',room:r.code,host:r.host,phase:r.phase,mode:r.mode,end:r.end,now,players,duck:r.duck,holder:r.holder,teams:r.teams};
  for(const p of r.players)send(p.ws,state);
}
setInterval(()=>{const now=Date.now();for(const r of rooms.values()){if(r.phase==='play')tick(r,now);snapshot(r,now);}},50);
sockets.on('connection',ws=>{
  let r,p;
  ws.on('error',()=>ws.terminate());
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw);}catch{return;}if(!m || typeof m!=='object')return;
    const error=message=>send(ws,{type:'error',message});
    if(!r && ['create','join'].includes(m.type)){
      let code=String(m.code||'').toUpperCase();
      if(m.type==='create'){
        do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
        rooms.set(code,{code,phase:'lobby',mode:'duck',players:[],teams:[0,0],duck:[0,.6,0],cap:clamp(parseInt(m.cap)||8,2,8)});
      }
      const room=rooms.get(code);
      if(!room || room.phase!=='lobby' || room.players.length>=room.cap)return error('Sala indisponível, cheia ou em partida.');
      r=room;p={id:randomUUID(),name:String(m.name||'Visitante').trim().slice(0,18)||'Visitante',ws,score:0,yaw:0,pitch:0};
      spawn(p,r.players.length);r.players.push(p);r.host??=p.id;send(ws,{type:'joined',id:p.id});return;
    }
    if(!p)return;
    if(m.type==='start' && p.id===r.host && r.phase!=='play'){
      if(r.players.length<2)return error('Convide mais uma pessoa para começar.');
      Object.assign(r,{phase:'play',mode:m.mode==='laser'?'laser':'duck',goal:clamp(parseInt(m.goal)||30,1,180),end:Date.now()+clamp(parseInt(m.minutes)||3,1,10)*60000,holder:null,duck:[0,.6,0],pickup:0,teams:[0,0]});
      r.players.forEach((q,i)=>{spawn(q,i);q.score=0;q.team=i%2;});return;
    }
    if(m.type==='lobby' && p.id===r.host && r.phase==='result')r.phase='lobby';
    if(m.type==='input' && r.phase==='play' && Number.isFinite(m.yaw) && Number.isFinite(m.pitch)){
      p.yaw=m.yaw;p.pitch=clamp(m.pitch,-1.5,1.5);
      p.input={f:Math.sign(Number(m.f)||0),s:Math.sign(Number(m.s)||0),fire:!!m.fire,jump:!!m.jump,run:!!m.run};
    }
  });
  ws.on('close',()=>{if(!r)return;r.players=r.players.filter(q=>q!==p);drop(r,p);
    if(!r.players.length)rooms.delete(r.code);
    else if(r.host===p.id){for(const q of r.players){send(q.ws,{type:'error',message:'O anfitrião saiu. Crie outra sala.'});q.ws.close();}rooms.delete(r.code);}
    else if(r.players.length<2 && r.phase==='play')r.phase='result';
  });
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? 'A porta já está em uso. Encerre o outro servidor ou defina PORT.'
    : error.message);
  process.exit(1);
});
server.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('Jogo pronto em http://localhost:' + server.address().port);
  console.log('Abra esse endereço no navegador. Ctrl+C encerra o servidor.');
});
