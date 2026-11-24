// Map cells are square. Blue and amber start at opposite ends.
export const map = [
 '11111111111111111111',
 '1........11........1',
 '1.22............22.1',
 '1.....33....33.....1',
 '1..................1',
 '1...11........11...1',
 '1...11..2222..11...1',
 '1..................1',
 '1.....33....33.....1',
 '1.22............22.1',
 '1........11........1',
 '11111111111111111111'
];
export const starts = [
 [[2.5,4.5],[2.5,6.5],[1.5,5.5],[1.5,7.5]],
 [[17.5,5.5],[17.5,6.5],[18.5,4.5],[18.5,7.5]]
];
export const targets=[[7.5,4.5],[10.5,3.5],[12.5,7.5],[16.5,8.5]];
export const solid=(x,z)=>map[Math.floor(z)]?.[Math.floor(x)]!=='.';

// Shared structural volumes keep hit positions on the same walls seen by the renderer.
export const structure=[];
const seen=new Set(),S=2.6;
for(let z=0;z<map.length;z++)for(let x=0;x<map[z].length;x++){
 const tile=map[z][x];if(tile==='.'||seen.has(x+','+z))continue;
 let w=1,d=1;while(map[z][x+w]===tile&&!seen.has((x+w)+','+z))w++;
 while(map[z+d]&&Array.from({length:w},(_,i)=>map[z+d][x+i]===tile&&!seen.has((x+i)+','+(z+d))).every(Boolean))d++;
 for(let j=0;j<d;j++)for(let i=0;i<w;i++)seen.add((x+i)+','+(z+j));
 const cx=(x+w/2)*S,cz=(z+d/2)*S,bw=w*S,bd=d*S;
 if(tile==='1'&&(z===0||z+d===map.length||x===0||x+w===map[z].length)){
  const horizontal=w>d, units=Math.ceil(Math.max(w,d)/4);
  for(let i=0;i<units;i++)structure.push({kind:'shed',cx:cx+(horizontal?((i+.5)/units-.5)*bw:0),cz:cz+(horizontal?0:((i+.5)/units-.5)*bd),w:horizontal?bw/units:bw,d:horizontal?bd:bd/units,h:5.2+(i%3)*.75});
 }else structure.push({kind:'cargo',cx,cz,w:bw,d:bd,tile,stack:(x===14&&z===5)||(z===2&&x===16),h:2.52});
}
const surfaces=[];
function add(cx,cz,w,d,lo,hi){surfaces.push([[cx-w/2,lo,cz-d/2],[cx+w/2,hi,cz+d/2]]);}
for(const b of structure){
 add(b.cx,b.cz,b.w,b.d,0,b.stack?5.03:b.h);
 if(b.kind==='shed'){
  add(b.cx,b.cz,b.w+.25,b.d+.25,b.h-.025,b.h+.145);
  add(b.cx,b.cz,b.w*.46,b.d*.64,b.h+.085,b.h+.675);
 }
}
export function traceSurface(origin,dir){
 let distance=130,normal=null;
 if(dir[1]<0){const t=-origin[1]/dir[1];if(t<distance){distance=t;normal=[0,1,0];}}
 for(const [low,high] of surfaces){
  let near=0,far=distance,axis=-1;
  for(let i=0;i<3;i++){
   if(Math.abs(dir[i])<1e-8){if(origin[i]<low[i]||origin[i]>high[i]){far=-1;break;}continue;}
   const a=(low[i]-origin[i])/dir[i],b=(high[i]-origin[i])/dir[i],entry=Math.min(a,b);
   if(entry>near){near=entry;axis=i;}far=Math.min(far,Math.max(a,b));
   if(near>far)break;
  }
  if(axis>=0&&near<=far&&near<distance){distance=near;normal=[0,0,0];normal[axis]=-Math.sign(dir[axis]);}
 }
 return {distance,normal};
}
