import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {WebSocketServer} from 'ws';
import {cast,solid,starts,targets} from './public/world.js';

const files=new Map([['/','index.html'],['/game.js','game.js'],['/style.css','style.css'],['/world.js','world.js']]);
const server=http.createServer(async(req,res)=>{
 const file=files.get(req.url.split('?')[0]);
 if(!file){res.writeHead(404).end();return;}
 try{const body=await readFile(new URL('./public/'+file,import.meta.url));
 res.writeHead(200,{'Content-Type':(file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html')+'; charset=utf-8'}).end(body);}
 catch{res.writeHead(500).end();}
});
const rooms=new Map(),sockets=new WebSocketServer({server,maxPayload:2048});
const send=(ws,m)=>{if(ws.readyState===1&&ws.bufferedAmount<65536)ws.send(JSON.stringify(m));};
function spawn(p,i){
 const [x,z]=starts[p.team][Math.floor(i/2)];
 Object.assign(p,{x,z,angle:p.team?Math.PI:0,hp:100,ammo:12,reload:0,shot:0,hit:0,input:{}});
}
function round(r){
 r.round++;r.phase='play';r.deadline=Date.now()+90000;r.players.forEach(spawn);
}
function finishRound(r,winner){
 if(winner!==null)r.score[winner]++;
 r.winner=winner;r.phase=r.score.includes(3)?'result':'interval';r.deadline=Date.now()+3500;
}
function clearAt(x,z){return [-.18,.18].every(a=>[-.18,.18].every(b=>!solid(x+a,z+b)));}
function fire(r,p,now){
 p.ammo--;p.shot=now;
 const dx=Math.cos(p.angle),dz=Math.sin(p.angle);
 let nearest=cast(p.x,p.z,dx,dz).depth,victim=null;
 const candidates=r.solo?r.dummies:r.players.filter(q=>q.hp>0&&q!==p);
 for(const q of candidates){
  if(q.down>now)continue;
  const x=q.x-p.x,z=q.z-p.z,along=x*dx+z*dz,across=x*dz-z*dx;
  if(along<=0||Math.abs(across)>.26)continue;
  const distance=along-Math.sqrt(.26**2-across**2);
  if(distance<nearest){nearest=distance;victim=q;}
 }
 if(!victim||victim.team===p.team)return;
 p.hit=now;
 if(r.solo){victim.down=now+1500;p.kills++;return;}
 victim.hp=Math.max(0,victim.hp-34);if(!victim.hp)p.kills++;
}
function tick(r,now){
 if(r.phase==='interval'&&now>=r.deadline)round(r);
 if(r.phase!=='play')return;
 for(const p of r.players){
  if(!p.hp)continue;
  const k=p.input,forward=k.forward||0,side=k.side||0,scale=.15/Math.max(1,Math.hypot(forward,side));
  const dx=Math.cos(p.angle),dz=Math.sin(p.angle);
  const x=p.x+(dx*forward-dz*side)*scale,z=p.z+(dz*forward+dx*side)*scale;
  if(clearAt(x,p.z))p.x=x;if(clearAt(p.x,z))p.z=z;
  if(p.reload&&now>=p.reload){p.ammo=12;p.reload=0;}
  if(!p.reload&&k.reload&&p.ammo<12)p.reload=now+1400;
  if(!p.reload&&k.fire&&p.ammo&&now-p.shot>=200)fire(r,p,now);
 }
 if(r.solo){if(now>=r.deadline)r.phase='result';return;}
 const alive=[0,1].map(t=>r.players.filter(p=>p.team===t&&p.hp>0).length);
 if(!alive[0]||!alive[1]||now>=r.deadline)finishRound(r,alive[0]===alive[1]?null:Number(alive[1]>alive[0]));
}
setInterval(()=>{
 const now=Date.now();
 for(const r of rooms.values()){
  tick(r,now);
  const players=r.players.map(({ws,input,...p})=>p);
  const state={...r,players,type:'state',now};
  for(const p of r.players)send(p.ws,state);
 }
},50);
sockets.on('connection',ws=>{
 let r,p;
 ws.on('error',()=>ws.terminate());
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object')return;
  if(!r&&['create','join'].includes(m.type)){
   let code=String(m.code||'').trim().toUpperCase();
   if(m.type==='create'){
    do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
    rooms.set(code,{code,phase:'lobby',players:[],score:[0,0],round:0,cap:Math.max(1,Math.min(8,parseInt(m.cap)||8))});
   }
   const room=rooms.get(code);
   if(!room||room.phase!=='lobby'||room.players.length>=room.cap){send(ws,{type:'error',message:'Sala inexistente, cheia ou já em partida.'});return;}
   r=room;p={id:randomUUID(),name:String(m.name||'Jogador').trim().slice(0,18)||'Jogador',ws,kills:0};
   r.players.push(p);r.host??=p.id;send(ws,{type:'joined',id:p.id});return;
  }
  if(!p)return;
  if(m.type==='start'&&r.host===p.id&&['lobby','result'].includes(r.phase)){
   Object.assign(r,{score:[0,0],round:0,solo:r.players.length===1,winner:null,dummies:targets.map(([x,z])=>({x,z,down:0}))});
   r.players.forEach((q,i)=>{q.team=i%2;q.kills=0;});round(r);
  }
  if(m.type==='lobby'&&p.id===r.host){r.phase='lobby';r.players.forEach(q=>q.input={});}
  if(m.type==='input'&&r.phase==='play'&&p.hp&&Number.isFinite(m.angle)){
   p.angle=m.angle%(Math.PI*2);
   p.input={forward:Math.sign(Number(m.forward)||0),side:Math.sign(Number(m.side)||0),fire:m.fire===true,reload:m.reload===true};
  }
 });
 ws.on('close',()=>{
  if(!r)return;r.players=r.players.filter(q=>q!==p);
  if(!r.players.length){rooms.delete(r.code);return;}
  if(r.host===p.id)r.host=r.players[0].id;
  if(r.phase!=='lobby'&&!r.solo&&[0,1].some(t=>!r.players.some(q=>q.team===t)))r.phase='lobby';
 });
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Abra http://localhost:'+server.address().port));
