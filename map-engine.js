let nmOfflinePromise, nmOfflineData, nmOfflineSelection;
const nmOfflineNorm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').trim();
function nmOfflineLoad(){
 if(nmOfflinePromise)return nmOfflinePromise;
 nmOfflinePromise=(async()=>{
  const raw=Uint8Array.from(atob(window.MAP_GZIP),c=>c.charCodeAt(0));
  const d=JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  d.features=[];d.grid=new Map();
  const insert=(type,item,rings)=>{
   let a=Infinity,b=Infinity,c=-Infinity,e=-Infinity;
   for(const ring of rings)for(let i=0;i<ring.length;i+=2){a=Math.min(a,ring[i]);b=Math.min(b,ring[i+1]);c=Math.max(c,ring[i]);e=Math.max(e,ring[i+1]);}
   if(!isFinite(a))return;
   const id=d.features.length;d.features.push({type,item,box:[a,b,c,e]});
   for(let x=Math.floor(a/8192);x<=Math.floor(c/8192);x++)for(let y=Math.floor(b/8192);y<=Math.floor(e/8192);y++){const key=x+','+y;if(!d.grid.has(key))d.grid.set(key,[]);d.grid.get(key).push(id);}
  };
  d.areas.forEach(v=>insert('area',v,v[1]));d.rivers.forEach(v=>insert('river',v,[v]));d.buildings.forEach(v=>insert('building',v,v[1]));d.roads.forEach(v=>insert('road',v,[v[2]]));
  d.search.forEach(v=>v._q=nmOfflineNorm(v[0]+' '+v[4]));
  d.points.forEach(v=>{v._xy=L.CRS.EPSG3857.latLngToPoint(L.latLng(v[2],v[3]),16);});
  nmOfflineData=d;return d;
 })().catch(e=>{nmOfflinePromise=null;throw e;});return nmOfflinePromise;
}
function nmOfflineQuery(d,b){const ids=new Set();for(let x=Math.floor(b[0]/8192);x<=Math.floor(b[2]/8192);x++)for(let y=Math.floor(b[1]/8192);y<=Math.floor(b[3]/8192);y++)for(const id of d.grid.get(x+','+y)||[])ids.add(id);return [...ids].map(i=>d.features[i]).filter(f=>f.box[0]<=b[2]&&f.box[2]>=b[0]&&f.box[1]<=b[3]&&f.box[3]>=b[1]);}
function nmOfflineTiles(d){return L.GridLayer.extend({
 createTile(coords){
  const tile=document.createElement('canvas'),ratio=Math.min(devicePixelRatio||1,2);tile.width=tile.height=256*ratio;tile.style.width=tile.style.height='256px';
  const c=tile.getContext('2d');c.scale(ratio,ratio);c.fillStyle='#f4f1e9';c.fillRect(0,0,256,256);
  const scale=2**(16-coords.z),ox=coords.x*256*scale,oy=coords.y*256*scale,z=coords.z;
  const f=nmOfflineQuery(d,[ox-80*scale,oy-80*scale,ox+336*scale,oy+336*scale]);
  const path=rings=>{c.beginPath();for(const r of rings){for(let i=0;i<r.length;i+=2){const x=(r[i]-ox)/scale,y=(r[i+1]-oy)/scale;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}}};
  for(const a of f.filter(v=>v.type==='area').sort((a,b)=>b.item[0]-a.item[0])){path(a.item[1]);c.fillStyle=a.item[0]===0?'#acd3df':'#d6e4c4';c.fill('evenodd');}
  for(const a of f.filter(v=>v.type==='river')){path([a.item]);c.strokeStyle='#acd3df';c.lineWidth=z>=14?5:2;c.stroke();}
  if(z>=15)for(const a of f.filter(v=>v.type==='building')){path(a.item[1]);c.fillStyle='#dfd7c9';c.fill('evenodd');c.strokeStyle='#c9bead';c.lineWidth=.6;c.stroke();}
  const roads=f.filter(v=>v.type==='road'&&(z>=13||v.item[0]<=(z>=12?4:z>=11?3:2))).sort((a,b)=>b.item[0]-a.item[0]);
  c.lineCap='round';c.lineJoin='round';
  const width=k=>Math.max(1,(k<=2?7:k<=4?5:3.5)*Math.pow(1.35,z-14));
  for(const casing of [true,false])for(const a of roads){path([a.item[2]]);const k=a.item[0];c.lineWidth=width(k)+(casing?1.4:0);c.strokeStyle=casing?'#d3cbbb':k<=2?'#f0cf82':k===8?'#e3d7bc':'#fffefa';c.stroke();}
  const used=[];const label=(s,x,y,size,color,angle=0)=>{if(!s||x<4||x>252||y<8||y>248)return; c.font='500 '+size+'px system-ui';const w=c.measureText(s).width;const b=[x-w/2-3,y-size,x+w/2+3,y+size];if(used.some(a=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1]))return;used.push(b);c.save();c.translate(x,y);c.rotate(angle);c.textAlign='center';c.textBaseline='middle';c.lineWidth=3;c.strokeStyle='#faf9f3';c.strokeText(s,0,0);c.fillStyle=color;c.fillText(s,0,0);c.restore();};
  for(const p of d.points){const x=(p._xy.x-ox)/scale,y=(p._xy.y-oy)/scale;if(x<0||x>256||y<0||y>256)continue;
   const settlement=!['restaurant','cafe','fast_food','bar','pub','station'].includes(p[1]);
   if(settlement&&z<=14)label(p[0],x,y,z<=11?12:14,'#58655d');
   else if(p[1]==='station'&&z>=13){c.fillStyle='#566e8c';c.fillRect(x-3,y-3,6,6);if(z>=14)label(p[0],x,y-12,11,'#455d78');}
   else if(!settlement&&p[1]!=='station'&&false){c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fillStyle='#aa6644';c.fill();if(z>=17)label(p[0],x,y-11,11,'#8b5137');}
  }
  if(z>=14)for(const a of roads.slice().reverse()){
   const r=a.item[2],s=d.names[a.item[1]];if(!s)continue;let best=null,len=0;
   for(let i=2;i<r.length;i+=2){const x=(r[i-2]+r[i])/2/scale-ox/scale,y=(r[i-1]+r[i+1])/2/scale-oy/scale,l=Math.hypot(r[i]-r[i-2],r[i+1]-r[i-1])/scale;if(x>5&&x<251&&y>10&&y<246&&l>len){len=l;let angle=Math.atan2(r[i+1]-r[i-1],r[i]-r[i-2]);if(angle>Math.PI/2)angle-=Math.PI;if(angle< -Math.PI/2)angle+=Math.PI;best=[x,y,angle];}}
   if(best&&len>Math.min(90,s.length*5))label(s,best[0],best[1],11,'#716b5e',best[2]);
  }
  if(z>=17)for(const a of f.filter(v=>v.type==='building'&&v.item[0])){const b=a.box;label(d.names[a.item[0]],((b[0]+b[2])/2-ox)/scale,((b[1]+b[3])/2-oy)/scale,10,'#928571');}
  return tile;
 }
});}
