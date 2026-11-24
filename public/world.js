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
export function cast(x,z,dx,dz){
 let col=Math.floor(x),row=Math.floor(z);
 const stepX=dx<0?-1:1,stepZ=dz<0?-1:1;
 const jumpX=dx===0?Infinity:Math.abs(1/dx),jumpZ=dz===0?Infinity:Math.abs(1/dz);
 let tx=(dx<0?x-col:col+1-x)*jumpX,tz=(dz<0?z-row:row+1-z)*jumpZ;
 for(let i=0;i<64;i++){
   const side=tx<tz, depth=side?tx:tz;
   if(side){col+=stepX;tx+=jumpX;}else{row+=stepZ;tz+=jumpZ;}
   const tile=map[row]?.[col];
   if(tile!=='.')return {depth,tile:tile||'1',side,offset:side?z+depth*dz:x+depth*dx};
 }
 return {depth:64,tile:'1',side:false,offset:0};
}
