import * as T from './three.module.min.js';
import {structure} from './world.js';

const S=2.6, steel='#364e55', dark='#283941', yellow='#e4aa32';
let seed=76129;
function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
function paint(w,h,draw){
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const g=c.getContext('2d');draw(g,w,h);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
function noise(g,w,h,count){
 for(let i=0;i<count;i++){
  g.fillStyle=random()>.5?'rgba(252,244,221,.10)':'rgba(24,31,31,.09)';
  g.fillRect(random()*w,random()*h,1+random()*3,1+random()*2);
 }
}
function text(g,label,x,y,size,color){g.fillStyle=color;g.font='bold '+size+'px Arial';g.fillText(label,x,y);}
function container(base,name){
 return paint(768,384,(g,w,h)=>{
  g.fillStyle=base;g.fillRect(0,0,w,h);
  for(let x=9;x<w;x+=26){const grad=g.createLinearGradient(x,0,x+24,0);
   grad.addColorStop(0,'#0004');grad.addColorStop(.18,'#0001');grad.addColorStop(.7,'#fff1');grad.addColorStop(.82,'#fff3');grad.addColorStop(1,'#0004');
   g.fillStyle=grad;g.fillRect(x,12,24,h-24);}
  text(g,name,48,161,76,'#ede8cc');text(g,'TRANSATLÂNTICA  /  CARGA',51,193,18,'#ece7c9');
  text(g,'MSCU  706  412',470,64,22,'#eee5c9');text(g,'22G1',470,91,17,'#eee5c9');
  for(const y of [4,h-13]){g.fillStyle='#18222377';g.fillRect(0,y,w,9);}
  for(let i=0;i<170;i++){g.fillStyle='#69462d44';g.fillRect(random()*w,random()*h,1+random()*4,random()*19);}
  noise(g,w,h,15000);
 });
}
const factory = paint(1024,512,(g,w,h)=>{
 g.fillStyle='#b5a995';g.fillRect(0,0,w,h);
 for(let y=0;y<h;y+=18){g.fillStyle='#77695b66';g.fillRect(0,y,w,1);for(let x=(y%36?0:25);x<w;x+=50)g.fillRect(x,y,1,18);}
 g.fillStyle='#596e6a';g.fillRect(0,382,w,130);
 for(let x=30;x<w;x+=124){g.fillStyle='#594e42';g.fillRect(x-5,43,104,145);g.fillStyle='#36545a';g.fillRect(x,48,94,135);
 for(let j=0;j<6;j++){g.fillStyle=['#8badaf','#759297','#546b70','#95aca9'][Math.floor(random()*4)];g.fillRect(x+3+(j%3)*31,51+Math.floor(j/3)*67,26,60);}
 g.fillStyle='#d8c9ad';g.fillRect(x-7,184,108,7);}
 text(g,'ARMAZÉM',39,300,47,'#344f51');text(g,'17',321,344,119,'#465d59');
 g.fillStyle='#576467';g.fillRect(593,235,334,277);for(let y=235;y<512;y+=9){g.fillStyle='#a5aaa244';g.fillRect(595,y,330,2);}
 text(g,'PORTO SUL',630,354,34,'#d5c6a3');
 noise(g,w,h,32000);
});
const pavement=paint(512,512,(g,w,h)=>{
 g.fillStyle='#a59d89';g.fillRect(0,0,w,h);noise(g,w,h,65000);
 for(const y of [5,250]){g.strokeStyle='#756e6088';g.lineWidth=2;g.beginPath();g.moveTo(0,y);g.lineTo(142,y+3);g.lineTo(156,y+1);g.lineTo(w,y+1);g.stroke();}
 g.fillStyle='#665e5255';g.fillRect(255,5,2,245);g.fillRect(85,252,2,260);
 for(let i=0;i<40;i++){g.fillStyle='#655e4d16';g.beginPath();g.ellipse(random()*w,random()*h,3+random()*29,2+random()*6,random()*3,0,7);g.fill();}
});pavement.wrapS=pavement.wrapT=T.RepeatWrapping;pavement.repeat.set(18,13);
const cranePaint=paint(512,128,(g,w,h)=>{g.fillStyle='#d19a36';g.fillRect(0,0,w,h);text(g,'PORTO   SUL',29,87,59,'#34494a');noise(g,w,h,7000);});
export function createHarbor(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(67,1,.045,205);
 scene.background=new T.Color('#a2c9d2');scene.fog=new T.FogExp2('#c8d3cb',.009);
 const sky=new T.Mesh(new T.SphereGeometry(150,32,16),new T.ShaderMaterial({
  side:T.BackSide,depthWrite:false,
  vertexShader:'varying vec3 ray; void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 ray;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
   void main(){vec3 d=normalize(ray);float h=max(0.,d.y);
    vec3 sky=mix(vec3(.74,.82,.80),vec3(.30,.56,.71),smoothstep(0.,.8,h));
    vec2 p=d.xz/max(.065,h)*vec2(1.7,3.2);
    float cloud=noise(p)*.56+noise(p*2.03)*.27+noise(p*4.09)*.12+noise(p*8.)*.05;
    sky=mix(sky,vec3(.95,.93,.86),smoothstep(.48,.75,cloud)*smoothstep(.02,.12,h)*.64);
    gl_FragColor=vec4(sky,1.);
   }`
 }));sky.position.set(25,0,14);scene.add(sky);
 scene.add(new T.HemisphereLight('#fff3d4','#b7abad',1.48));
 const sun=new T.DirectionalLight('#fff0cc',2.65);sun.position.set(-18,55,-28);sun.target.position.set(26,0,15);scene.add(sun,sun.target);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-40,right:40,top:36,bottom:-36,near:.2,far:140});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.025;
 const cube=new T.BoxGeometry(), materials=new Map(),batches=new Map(),matrix=new T.Object3D();
 function material(color){
  if(color?.isMaterial)return color;
  if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial(color?.isTexture?{map:color,roughness:.9}:{color,roughness:.8}));
  return materials.get(color);
 }
 function block(x,y,z,w,h,d,color,rotation=0){
  const mat=material(color);if(!batches.has(mat))batches.set(mat,[]);
  matrix.position.set(x,y,z);matrix.scale.set(w,h,d);matrix.rotation.set(0,rotation,0);matrix.updateMatrix();batches.get(mat).push(matrix.matrix.clone());
 }
 function beam(a,b,width,color){
  const v=new T.Vector3(...a),u=new T.Vector3(...b),delta=u.clone().sub(v);
  const mat=material(color);if(!batches.has(mat))batches.set(mat,[]);
  matrix.position.copy(v).lerp(u,.5);matrix.scale.set(width,delta.length(),width);matrix.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  matrix.updateMatrix();batches.get(mat).push(matrix.matrix.clone());
 }
 const ground=new T.Mesh(new T.PlaneGeometry(115,83),material(pavement));ground.position.set(25,-.015,15);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const red=container('#a14c36','SUL'),blue=container('#387076','MARÉ'),green=container('#697b61','NORTE');
 function cargo(x,z,w,d,h,tex,base=0){
  block(x,base+h/2,z,w,h,d,tex);
  for(const a of [-1,1])for(const b of [-1,1])block(x+a*(w/2-.09),base+h/2,z+b*(d/2-.08),.16,h+.07,.16,'#59564b');
  for(const b of [-1,1])block(x,base+h+.025,z+b*(d/2-.05),w,.08,.12,steel);
 }
 // Combine adjacent cells so each building has a continuous facade.
 for(const {kind,cx,cz,w,d,h,stack,tile} of structure){
  if(kind==='shed'){
   block(cx,h/2,cz,w,h,d,factory);block(cx,h+.06,cz,w+.25,.17,d+.25,steel);
   block(cx,h+.38,cz,w*.46,.59,d*.64,'#718381');
  }else{
   cargo(cx,cz,w,d,h,tile==='1'?blue:tile==='2'?red:green);
   if(stack)cargo(cx,cz,w,d,2.47,red,2.56);
  }
 }
 // Gantry crane spans the quay. Trusses and catwalks share instance batches.
 function gantry(x,z,span,h){
  for(const side of [-1,1]){
   const xx=x+side*span/2;
   for(const dz of [-2,2]){beam([xx+side*.9,0,z+dz],[xx,h,z+dz*.65],.43,yellow);block(xx+side*.9,.28,z+dz,1.6,.55,1.1,dark);}
   beam([xx,3,z-2],[xx,h-1,z+1.4],.16,steel);beam([xx,3,z+2],[xx,h-1,z-1.4],.16,steel);
  }
  for(const dz of [-1.35,1.35]){
   block(x,h,z+dz,span+7,.42,.38,yellow);block(x,h+1.7,z+dz,span+7,.28,.33,yellow);
   for(let u=-span/2-3;u<span/2+3;u+=2.5)beam([x+u,h,z+dz],[x+u+2.5,h+1.7,z+dz],.14,yellow);
  }
  block(x,h+.9,z-1.42,8,1.42,.1,cranePaint);
  block(x+span*.28,h-1,z,1.9,1.8,2.3,'#d3a74e');block(x+span*.28,h-.88,z-1.17,1.58,1.08,.08,'#344e53');
  for(const dz of [-.65,.65])beam([x-2,h,z+dz],[x-2,h-4,z+dz],.047,dark);
  block(x-2,h-4,z,2.7,.26,1.9,yellow);
 }
 gantry(40,23,33,12.7);gantry(58,-12,26,17);
 // Harbor silhouettes, exhaust stacks and lighting beyond the perimeter.
 for(let i=0;i<22;i++){
  const a=(i/22)*Math.PI*2,x=26+Math.cos(a)*52,z=14+Math.sin(a)*43;
  const h=3+random()*5;block(x,h/2,z,5+random()*5,h,5,'#81979a');
  if(i%4===0){block(x,h+3,z,.75,6,.75,'#ac8a70');block(x,h+4.2,z,.78,.7,.78,'#d8cfc0');}
 }
 for(const [x,z] of [[3,3],[48,3],[4,28],[49,28]]){
  block(x,4.4,z,.15,8.8,.15,steel);block(x,8.8,z,2,.12,.18,steel);
  for(const sign of [-1,1])block(x+sign*.7,8.64,z,.65,.31,.48,'#e7dcb4');
 }
 for(let x=4;x<49;x+=3.1){block(x,.003,11.8,1.85,.012,.08,'#c7a353');block(x,.003,20.4,1.85,.012,.08,'#c7a353');}
 // Drain grilles, painted bay corners and scuffed loading markings.
 for(let x=4;x<50;x+=.38)block(x,.006,25,.17,.012,.35,'#656860');
 for(const [x,z] of [[18,12],[33,20]])for(const a of [-1,1])for(const b of [-1,1]){
  block(x+a*1.75,.01,z+b*1.85,.85,.015,.09,'#d5c390');block(x+a*2.12,.01,z+b*1.48,.09,.015,.82,'#d5c390');
 }
 for(const [mat,transforms] of batches){
  const inst=new T.InstancedMesh(cube,mat,transforms.length);
  transforms.forEach((m,i)=>inst.setMatrixAt(i,m));inst.castShadow=true;inst.receiveShadow=true;scene.add(inst);
 }
 const overlay=new T.Scene(),handCam=new T.PerspectiveCamera(49,1,.01,6);
 overlay.add(new T.HemisphereLight('#fff2d8','#8c9ca6',1.85));const key=new T.DirectionalLight('#ffffff',2);key.position.set(-1,3,1);overlay.add(key);
 function piece(parent,geo,color,x,y,z){const m=new T.Mesh(geo,material(color));m.position.set(x,y,z);parent.add(m);return m;}
 function box(parent,x,y,z,w,h,d,c){const m=piece(parent,cube,c,x,y,z);m.scale.set(w,h,d);return m;}
 function oval(parent,x,y,z,w,h,d,c){const m=piece(parent,new T.SphereGeometry(1,14,10),c,x,y,z);m.scale.set(w,h,d);return m;}
 const gun=new T.Group();overlay.add(gun);
 // Stylized service pistol, with a contoured slide, gloved hand and sleeve.
 const upper=new T.Group();gun.add(upper);
 const slide=new T.Shape();slide.moveTo(-.045,-.026);slide.lineTo(.045,-.026);slide.lineTo(.045,.017);slide.lineTo(.035,.032);slide.lineTo(-.035,.032);slide.lineTo(-.045,.017);slide.closePath();
 piece(upper,new T.ExtrudeGeometry(slide,{depth:.31,bevelEnabled:true,bevelSize:.003,bevelThickness:.004,bevelSegments:1}), '#424e50',0,0,-.34);
 box(gun,0,-.04,-.17,.086,.033,.27,'#303938');
 box(gun,0,-.10,-.082,.077,.145,.067,'#434941').rotation.x=-.25;
 for(const x of [-.034,.034])box(upper,x,.038,-.057,.014,.016,.023,'#292f30');
 box(upper,0,.036,-.326,.011,.012,.013,'#d1c6a3');
 for(let i=0;i<7;i++)for(const side of [-1,1])box(upper,side*.046,.001,-.05-i*.009,.004,.035,.003,'#212d2e');
 box(gun,0,-.081,-.143,.026,.012,.081,'#333c39');box(gun,0,-.063,-.181,.026,.047,.009,'#333c39');
 oval(gun,-.011,-.111,-.085,.056,.057,.067,'#504e41');
 for(let i=0;i<3;i++)oval(gun,-.031,-.08-i*.021,-.112,.037,.014,.033,'#79705a');
 oval(gun,-.065,-.131,-.095,.045,.053,.069,'#766e55');
 box(upper,0,.001,-.023,.064,.038,.006,'#313c3e');
 for(let i=0;i<5;i++)box(upper,0,-.013+i*.006,-.019,.049,.0018,.002,'#697172');
 box(upper,.046,.009,-.215,.002,.026,.066,'#283535');
 box(upper,.048,.018,-.211,.002,.006,.048,'#768080');
 for(let i=0;i<4;i++)box(upper,-.046,.003,-.225-i*.008,.002,.019,.003,'#5d6868');
 const sleeve=oval(gun,.018,-.19,.08,.069,.082,.21,'#495049');sleeve.rotation.x=.39;
 oval(gun,-.093,-.185,.014,.063,.062,.155,'#6a6a55').rotation.y=-.33;
 const flash=piece(gun,new T.OctahedronGeometry(.064),new T.MeshBasicMaterial({color:'#ffcd6e'}),0,.004,-.409);flash.scale.z=1.8;
 const flareTexture=paint(128,128,(g)=>{
  const glow=g.createRadialGradient(64,64,0,64,64,62);glow.addColorStop(0,'#fff');glow.addColorStop(.12,'#fffbd8');glow.addColorStop(.32,'#ffbf5299');glow.addColorStop(1,'#ff6a0000');g.fillStyle=glow;g.fillRect(0,0,128,128);
 });
 const glow=new T.Sprite(new T.SpriteMaterial({map:flareTexture,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));flash.add(glow);glow.scale.set(.23,.23,.23);
 const casing=piece(overlay,new T.CylinderGeometry(.005,.006,.026,9), '#b99748',0,0,0);
 const marks=[],effects=[],dotGeometry=new T.CircleGeometry(.074,11),upAxis=new T.Vector3(0,1,0),forwardAxis=new T.Vector3(0,0,1);
 const scarTexture=paint(64,64,(g)=>{
  const gradient=g.createRadialGradient(32,32,1,32,32,31);gradient.addColorStop(0,'#191716');gradient.addColorStop(.39,'#211c19');gradient.addColorStop(.52,'#6c6255');gradient.addColorStop(.64,'#c2b49a99');gradient.addColorStop(1,'#6b604800');
  g.fillStyle=gradient;g.fillRect(0,0,64,64);
 });
 const scarMat=new T.MeshBasicMaterial({map:scarTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const tracerGeometry=new T.CylinderGeometry(.012,.019,1,6);
 const tracerMat=new T.MeshBasicMaterial({color:0xffdd91});
 const sparksMat=new T.MeshBasicMaterial({color:0xffce81});
 const particlesGeo=new T.OctahedronGeometry(.023);
 let effectCursor=0,markCursor=0,kickTime=-Infinity;
 function addShot(event,local,time){
  let fx=effects[effectCursor];
  if(!fx){const trace=new T.Mesh(tracerGeometry,tracerMat),sparks=new T.InstancedMesh(particlesGeo,sparksMat,6);
   sparks.frustumCulled=false;scene.add(trace,sparks);
   fx={trace,sparks,start:new T.Vector3(),end:new T.Vector3(),direction:new T.Vector3(),normal:new T.Vector3(),vel:[]};effects.push(fx);}
  effectCursor=(effectCursor+1)%32;
  fx.born=time;fx.start.fromArray(event.origin);fx.end.fromArray(event.end);fx.normal.fromArray(event.normal||[0,1,0]);
  if(local){
   // Convert the viewmodel muzzle to the world camera's projection.
   camera.updateMatrixWorld();handCam.updateMatrixWorld();gun.updateMatrixWorld(true);
   flash.getWorldPosition(fx.start).project(handCam);fx.start.z=.5;fx.start.unproject(camera).sub(camera.position).normalize().multiplyScalar(.86).add(camera.position);
  }else{fx.start.y=1.29;fx.start.addScaledVector(new T.Vector3(...event.dir),.55);}
  fx.direction.copy(fx.end).sub(fx.start);fx.length=fx.direction.length();fx.direction.normalize();
  fx.trace.quaternion.setFromUnitVectors(upAxis,fx.direction);fx.trace.visible=true;
  fx.surface=Boolean(event.normal);fx.vel=Array.from({length:6},()=>fx.normal.clone().multiplyScalar(1+Math.random()*2).add(new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(3)));
  if(fx.surface){
   let mark=marks[markCursor];if(!mark){mark=new T.Mesh(dotGeometry,scarMat);scene.add(mark);marks.push(mark);}
   markCursor=(markCursor+1)%72;mark.visible=true;mark.position.copy(fx.end).addScaledVector(fx.normal,.009);
   mark.quaternion.setFromUnitVectors(forwardAxis,fx.normal);mark.scale.setScalar(.8+Math.random()*.6);
  }
 }
 function updateEffects(time){
  for(const fx of effects){
   const age=time-fx.born,travel=Math.min(.10,.025+fx.length*.0014);
   fx.trace.visible=age<travel+.035;
   if(fx.trace.visible){
    const head=Math.min(fx.length,fx.length*(.35+age/travel)),tail=Math.max(0,head-fx.length*Math.max(.06,.62-age*3));
    fx.trace.position.copy(fx.start).addScaledVector(fx.direction,(head+tail)/2);fx.trace.scale.y=Math.max(.01,head-tail);
   }
   const t=age-travel*.55;fx.sparks.visible=fx.surface&&t>=0&&t<.23;
   if(fx.sparks.visible){
    fx.vel.forEach((v,i)=>{matrix.position.copy(fx.end).addScaledVector(v,t);matrix.position.y-=4*t*t;matrix.scale.setScalar(1-t/.23);matrix.rotation.set(0,i+t,0);matrix.updateMatrix();fx.sparks.setMatrixAt(i,matrix.matrix);});fx.sparks.instanceMatrix.needsUpdate=true;
   }
  }
 }
 const actors=new Map(),targetSkin=paint(256,384,(g,w,h)=>{
  g.fillStyle='#b79b70';g.fillRect(0,0,w,h);noise(g,w,h,11000);for(const r of [88,69,47,25]){g.strokeStyle='#483e31';g.lineWidth=3;g.beginPath();g.ellipse(128,164,r,r*1.25,0,0,7);g.stroke();}
  g.fillStyle='#ac5134';g.fillRect(118,155,20,20);text(g,'PORTO  /  17',52,351,23,'#463e31');
 });
 function createActor(dummy,team){
  const g=new T.Group();scene.add(g);
  if(dummy){box(g,0,.64,0,.08,1.26,.1,steel);box(g,0,.05,0,.71,.1,.5,steel);
   box(g,0,1.38,0,.98,.97,.10,targetSkin);box(g,0,2,0,.38,.3,.1,'#ad956f');}
  else{
   const cloth=team?'#a28a5b':'#547384';
   oval(g,0,1.23,0,.35,.49,.22,cloth);box(g,0,1.31,-.05,.51,.51,.37,'#44504b');
   oval(g,0,1.91,0,.22,.26,.21,'#575348');oval(g,0,2.01,0,.245,.175,.23,cloth);
   box(g,0,1.92,-.18,.32,.083,.08,'#283638');
   for(const side of [-1,1]){oval(g,side*.16,.56,0,.15,.5,.15,cloth);oval(g,side*.17,.12,-.05,.15,.14,.24,dark);
    oval(g,side*.32,1.39,-.05,.14,.25,.15,cloth);oval(g,side*.25,1.22,-.22,.14,.13,.23,'#50594e');}
   box(g,.12,1.27,-.43,.13,.14,.51,steel);
  }
  return g;
 }
 const clock=new T.Clock();let width=0,height=0,lastRound=-1,lastShift=0,previewTime=0;
 return function draw(state,p,angle,pitch,playing,shots,kicked){
  const dt=Math.min(.1,clock.getDelta()),blend=1-Math.exp(-dt*19);
  if(width!==innerWidth||height!==innerHeight){width=innerWidth;height=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,1.45));renderer.setSize(width,height,false);camera.aspect=handCam.aspect=width/height;camera.updateProjectionMatrix();handCam.updateProjectionMatrix();}
  const present=new Set();
  for(const q of playing?(state.solo?state.dummies:state.players):[]){
   if(q===p)continue;
   const id=q.id||q.x+','+q.z;present.add(id);let actor=actors.get(id);
   if(!actor){actor=createActor(state.solo,q.team);actors.set(id,actor);actor.position.set(q.x*S,0,q.z*S);}
   actor.position.x+=(q.x*S-actor.position.x)*blend;actor.position.z+=(q.z*S-actor.position.z)*blend;
   actor.visible=state.solo?q.down<=state.now:q.hp>0;
   actor.rotation.y=state.solo?Math.atan2(camera.position.x-actor.position.x,camera.position.z-actor.position.z):-q.angle-Math.PI/2;
  }
  for(const [id,a] of actors)if(!present.has(id)){a.visible=false;}
  if(playing){
   const shift=Math.hypot(p.x*S-camera.position.x,p.z*S-camera.position.z);
   if(lastRound!==state.round||shift>3){camera.position.set(p.x*S,1.66,p.z*S);lastRound=state.round;}
   lastShift+=(Math.min(1,shift*2.1)-lastShift)*blend;
   camera.position.x+=(p.x*S-camera.position.x)*blend;camera.position.z+=(p.z*S-camera.position.z)*blend;
   camera.position.y=1.66+Math.sin(clock.elapsedTime*13)*lastShift*.024;
   camera.rotation.order='YXZ';camera.rotation.set(pitch,-angle-Math.PI/2,0);
   if(kicked)kickTime=clock.elapsedTime;
   const age=clock.elapsedTime-kickTime,recoil=Math.max(0,1-age/.16),reload=p.reload?Math.sin(Math.PI*Math.max(0,Math.min(1,(p.reload-state.now)/1400))):0;
   gun.position.set(.173+Math.sin(clock.elapsedTime*6)*lastShift*.006,-.143-reload*.09,-.55+recoil*.026);
   gun.rotation.set(.035+recoil*.18-reload*.62,.16,-.045-reload*.66);flash.visible=age<.064;upper.position.z=.047*recoil;if(flash.visible)flash.rotation.z=kickTime*11;
   casing.visible=age<.32;if(casing.visible){casing.position.copy(gun.position);casing.position.x+=.035+age*.78;casing.position.y+=.03+age*.64-2.8*age*age;casing.position.z+=age*.19-.13;casing.rotation.set(age*22,.4,age*16);}
   for(const shot of shots)addShot(shot,shot.shooter===p.id,clock.elapsedTime);
   updateEffects(clock.elapsedTime);
   }else{if(lastRound!==-1){for(const m of marks)m.visible=false;for(const fx of effects){fx.born=-Infinity;fx.trace.visible=fx.sparks.visible=false;}kickTime=-Infinity;}
   previewTime+=dt;camera.position.set(7+Math.sin(previewTime*.07)*1.5,6.9,27);camera.lookAt(34,3,12);lastRound=-1;}
  renderer.autoClear=true;renderer.render(scene,camera);
  if(playing&&p.hp){renderer.autoClear=false;renderer.clearDepth();renderer.render(overlay,handCam);}
 };
}
