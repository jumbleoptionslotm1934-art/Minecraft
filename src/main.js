import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const CFG={CHUNK:16,HEIGHT:80,VIEW:5,SEA:26,GRAVITY:28,JUMP:9.5,WALK:5.2,SPRINT:7.5};
const BLOCKS={
  0:{name:"Air",solid:false},
  1:{name:"Grass",solid:true,color:"#62a83f",top:"#78bf4a",bottom:"#74502e"},
  2:{name:"Dirt",solid:true,color:"#79502f"},
  3:{name:"Stone",solid:true,color:"#808080"},
  4:{name:"Sand",solid:true,color:"#d6c27a"},
  5:{name:"Wood",solid:true,color:"#77512f"},
  6:{name:"Leaves",solid:true,color:"#397b38",transparent:true},
  7:{name:"Planks",solid:true,color:"#b18452"},
  8:{name:"Glass",solid:true,color:"#a7d7dc",transparent:true},
  9:{name:"Glowstone",solid:true,color:"#e3c35b",light:12},
  10:{name:"Coal Ore",solid:true,color:"#424242"},
  11:{name:"Iron Ore",solid:true,color:"#9a8878"},
  12:{name:"Copper Ore",solid:true,color:"#a86f52"},
  13:{name:"Gold Ore",solid:true,color:"#d9b62d"},
  14:{name:"Crystal Ore",solid:true,color:"#5cc7e8"},
  15:{name:"Water",solid:false,color:"#3d9bd1",transparent:true},
  16:{name:"Cactus",solid:true,color:"#3d8b45"},
  17:{name:"Wildflower",solid:true,color:"#d96aa9" }
};
const HOT=[1,2,3,4,5,7,6,8,9];
const ITEMS={
  1:{name:"Grass Block",block:1,max:64},2:{name:"Dirt",block:2,max:64},3:{name:"Stone",block:3,max:64},
  4:{name:"Sand",block:4,max:64},5:{name:"Wood",block:5,max:64},6:{name:"Leaves",block:6,max:64},
  7:{name:"Planks",block:7,max:64},8:{name:"Glass",block:8,max:64},9:{name:"Glowstone",block:9,max:64},
  10:{name:"Coal",max:64},11:{name:"Iron Ore",block:11,max:64},12:{name:"Copper Ore",block:12,max:64},
  13:{name:"Gold Ore",block:13,max:64},14:{name:"Crystal",block:14,max:64},16:{name:"Cactus",block:16,max:64},
  17:{name:"Wildflower",block:17,max:64},
  101:{name:"Wooden Pickaxe",tool:"pickaxe",tier:1,durability:59,max:1},
  102:{name:"Stone Pickaxe",tool:"pickaxe",tier:2,durability:131,max:1},
  103:{name:"Iron Pickaxe",tool:"pickaxe",tier:3,durability:250,max:1},
  104:{name:"Crystal Pickaxe",tool:"pickaxe",tier:4,durability:900,max:1},
  111:{name:"Wooden Axe",tool:"axe",tier:1,durability:59,max:1},
  121:{name:"Wooden Sword",tool:"sword",tier:1,durability:59,max:1}
};
const RECIPES=[
 {name:"Planks x4",out:7,count:4,need:[[5,1]]},
 {name:"Glass x1",out:8,count:1,need:[[4,1]]},
 {name:"Wood Pickaxe",out:101,count:1,need:[[7,3],[5,2]]},
 {name:"Stone Pickaxe",out:102,count:1,need:[[7,3],[3,2]]},
 {name:"Iron Pickaxe",out:103,count:1,need:[[7,3],[11,2]]},
 {name:"Crystal Pickaxe",out:104,count:1,need:[[7,3],[14,2]]},
 {name:"Wood Axe",out:111,count:1,need:[[7,3],[5,2]]},
 {name:"Wood Sword",out:121,count:1,need:[[7,2],[5,1]]}
];
let scene,camera,renderer,clock,world,player,keys={},selected=0,paused=true,inventoryOpen=false;
let materials={},chunkMeshes=new Map(),chunks=new Map(),dirty=new Set(),modified=new Map(),seed=133742;
let inventory=Array.from({length:36},()=>null), mining=false, miningTarget=null, miningProgress=0;
const saved=localStorage.getItem("voxel-seed"); if(saved) seed=+saved;

function hash(x,z){let n=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(seed,1442695041);n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967295}
function smooth(t){return t*t*(3-2*t)}
function noise(x,z){const x0=Math.floor(x),z0=Math.floor(z),fx=smooth(x-x0),fz=smooth(z-z0);const a=hash(x0,z0),b=hash(x0+1,z0),c=hash(x0,z0+1),d=hash(x0+1,z0+1);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a,b,fx),THREE.MathUtils.lerp(c,d,fx),fz)}
function fbm(x,z){let v=0,a=.5,f=.025;for(let i=0;i<5;i++){v+=noise(x*f,z*f)*a;a*=.5;f*=2}return v}
function biomeAt(x,z){
 const temp=fbm(x+1200,z-800), wet=fbm(x-700,z+1600), elev=fbm(x+2500,z+2500);
 if(elev>.72)return "mountains";
 if(temp<.28)return wet>.52?"snowy_forest":"snow";
 if(wet<.24)return "desert";
 if(wet>.78&&temp>.55)return "swamp";
 if(wet>.62)return "forest";
 return temp>.62?"plains":"hills";
}
function caveNoise(x,y,z){
 const a=fbm3(x*.075,y*.075,z*.075),b=fbm3((x+317)*.14,(y-91)*.14,(z+503)*.14);
 return a*.65+b*.35;
}
function hash3(x,y,z){let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,1442695041)^seed;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967295}
function noise3(x,y,z){
 const x0=Math.floor(x),y0=Math.floor(y),z0=Math.floor(z),fx=smooth(x-x0),fy=smooth(y-y0),fz=smooth(z-z0);
 let v=0;
 for(let dx=0;dx<2;dx++)for(let dy=0;dy<2;dy++)for(let dz=0;dz<2;dz++)v+=hash3(x0+dx,y0+dy,z0+dz)*(dx?fx:1-fx)*(dy?fy:1-fy)*(dz?fz:1-fz);
 return v;
}
function fbm3(x,y,z){let v=0,a=.5,f=1;for(let i=0;i<4;i++){v+=noise3(x*f,y*f,z*f)*a;a*=.5;f*=2}return v}
function terrainHeight(wx,wz){
 const biome=biomeAt(wx,wz),base=fbm(wx,wz),detail=fbm(wx+900,wz-500);
 let h=20+base*27+detail*8;
 if(biome==="mountains")h+=18*fbm(wx*.45,wz*.45);
 if(biome==="desert")h-=3;
 if(biome==="swamp")h-=5;
 return Math.max(3,Math.min(CFG.HEIGHT-6,Math.floor(h)));
}
function topBlockFor(biome,h){if(h<=CFG.SEA+1)return 4;if(biome==="desert")return 4;if(biome==="snow"||biome==="snowy_forest")return 3;return 1}
function key(cx,cz){return cx+","+cz}
function chunkFor(x,z){return [Math.floor(x/CFG.CHUNK),Math.floor(z/CFG.CHUNK)]}
function local(x){return ((x%CFG.CHUNK)+CFG.CHUNK)%CFG.CHUNK}
function idx(x,y,z){return x+CFG.CHUNK*(z+CFG.CHUNK*y)}

class Chunk{
 constructor(cx,cz){this.cx=cx;this.cz=cz;this.blocks=new Uint8Array(CFG.CHUNK*CFG.HEIGHT*CFG.CHUNK);this.generate()}
 generate(){
  for(let x=0;x<CFG.CHUNK;x++)for(let z=0;z<CFG.CHUNK;z++){
   const wx=this.cx*CFG.CHUNK+x,wz=this.cz*CFG.CHUNK+z,biome=biomeAt(wx,wz),h=terrainHeight(wx,wz);
   for(let y=0;y<=h;y++){
    let id=y===h?topBlockFor(biome,h):y>h-4?2:3;
    if(y>4&&y<h-4){
      const n=caveNoise(wx,y,wz);
      if(n>.73 && y<Math.min(h-3,CFG.SEA-1))id=0;
      else if(n>.70 && y<h-8)id=0;
    }
    if(id===3){
      const r=hash3(wx,y,wz);
      if(y<18&&r>.987)id=14;
      else if(y<30&&r>.975)id=13;
      else if(y<42&&r>.965)id=11;
      else if(y<50&&r>.95)id=10;
      else if(y<38&&r>.975)id=12;
    }
    this.blocks[idx(x,y,z)]=id;
   }
   if(h<CFG.SEA)for(let y=h+1;y<=CFG.SEA;y++)this.blocks[idx(x,y,z)]=15;
   if(h>CFG.SEA+1&&hash(wx+91,wz-17)>.90)this.tree(x,h+1,z,biome);
   if(biome==="desert"&&hash(wx+44,wz+12)>.94&&h>CFG.SEA)this.cactus(x,h+1,z);
   if((biome==="forest"||biome==="plains"||biome==="hills")&&hash(wx-19,wz+72)>.93&&h>CFG.SEA)this.flower(x,h+1,z);
  }
  for(const [k,id] of modified){const [x,y,z]=k.split(",").map(Number);if(Math.floor(x/CFG.CHUNK)===this.cx&&Math.floor(z/CFG.CHUNK)===this.cz)this.set(local(x),y,local(z),id)}
 }
 tree(x,y,z,biome){const trunk=biome==="snowy_forest"?5:5;for(let i=0;i<5&&y+i<CFG.HEIGHT;i++)this.blocks[idx(x,y+i,z)]=trunk;for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=2;dy<=5;dy++){if(Math.abs(dx)+Math.abs(dz)+dy>8)continue;let xx=x+dx,zz=z+dz,yy=y+dy;if(xx>=0&&xx<CFG.CHUNK&&zz>=0&&zz<CFG.CHUNK&&yy<CFG.HEIGHT)this.blocks[idx(xx,yy,zz)]=6}}
 cactus(x,y,z){for(let i=0;i<3&&y+i<CFG.HEIGHT;i++)this.blocks[idx(x,y+i,z)]=16}
 flower(x,y,z){if(y<CFG.HEIGHT)this.blocks[idx(x,y,z)]=17}
 get(x,y,z){return x<0||z<0||x>=CFG.CHUNK||z>=CFG.CHUNK||y<0||y>=CFG.HEIGHT?0:this.blocks[idx(x,y,z)]}
 set(x,y,z,id){if(x>=0&&z>=0&&x<CFG.CHUNK&&z<CFG.CHUNK&&y>=0&&y<CFG.HEIGHT)this.blocks[idx(x,y,z)]=id}
}

function getChunk(cx,cz){const k=key(cx,cz);if(!chunks.has(k))chunks.set(k,new Chunk(cx,cz));return chunks.get(k)}
function getBlock(x,y,z){if(y<0||y>=CFG.HEIGHT)return 0;const [cx,cz]=chunkFor(x,z);return getChunk(cx,cz).get(local(x),y,local(z))}
function setBlock(x,y,z,id){if(y<0||y>=CFG.HEIGHT)return;modified.set(x+","+y+","+z,id);const [cx,cz]=chunkFor(x,z);getChunk(cx,cz).set(local(x),y,local(z),id);markDirty(cx,cz);if(local(x)===0)markDirty(cx-1,cz);if(local(x)===15)markDirty(cx+1,cz);if(local(z)===0)markDirty(cx,cz-1);if(local(z)===15)markDirty(cx,cz+1)}

const FACE=[
 [[1,0,0],[1,0,1,1,0,1,1,1,1,0,1,1]],
 [[-1,0,0],[0,0,0,0,1,0,0,1,1,0,0,1]],
 [[0,1,0],[0,1,0,1,1,0,1,1,1,0,1,1]],
 [[0,-1,0],[0,0,0,1,0,0,1,0,1,0,0,1]],
 [[0,0,1],[0,0,1,1,0,1,1,1,1,0,1,1]],
 [[0,0,-1],[0,0,0,0,1,0,1,1,0,1,0,0]]
];
function colorFor(id,face){const b=BLOCKS[id];return new THREE.Color(face===2&&b.top?b.top:face===3&&b.bottom?b.bottom:b.color)}
function buildChunk(cx,cz){
 const c=getChunk(cx,cz), pos=[],norm=[],col=[],ind=[];let v=0;
 for(let x=0;x<CFG.CHUNK;x++)for(let y=0;y<CFG.HEIGHT;y++)for(let z=0;z<CFG.CHUNK;z++){
  const id=c.get(x,y,z);if(!id||(!BLOCKS[id].solid&&id!==15))continue;
  for(let f=0;f<6;f++){const [d,vs]=FACE[f];if(getBlock(cx*CFG.CHUNK+x+d[0],y+d[1],cz*CFG.CHUNK+z+d[2])!==0)continue;
   const base=[cx*CFG.CHUNK+x,y,cz*CFG.CHUNK+z];const arr=[];for(let i=0;i<4;i++){arr.push([base[0]+vs[i*3],base[1]+vs[i*3+1],base[2]+vs[i*3+2]])}
   for(const p of arr){pos.push(...p);norm.push(d[0],d[1],d[2]);const cc=colorFor(id,f);col.push(cc.r,cc.g,cc.b)}
   ind.push(v,v+1,v+2,v,v+2,v+3);v+=4;
  }
 }
 if(chunkMeshes.has(key(cx,cz)))scene.remove(chunkMeshes.get(key(cx,cz)));
 if(!pos.length)return;
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("normal",new THREE.Float32BufferAttribute(norm,3));g.setAttribute("color",new THREE.Float32BufferAttribute(col,3));g.setIndex(ind);g.computeBoundingSphere();
 const m=new THREE.Mesh(g,materials.voxel);m.frustumCulled=true;chunkMeshes.set(key(cx,cz),m);scene.add(m);
}
function markDirty(cx,cz){dirty.add(key(cx,cz))}
function rebuildDirty(){for(const k of dirty){const [x,z]=k.split(",").map(Number);buildChunk(x,z)}dirty.clear()}

function ensureWorld(){
 const [pcx,pcz]=chunkFor(player.pos.x,player.pos.z);
 for(let dx=-CFG.VIEW;dx<=CFG.VIEW;dx++)for(let dz=-CFG.VIEW;dz<=CFG.VIEW;dz++)if(dx*dx+dz*dz<=CFG.VIEW*CFG.VIEW)getChunk(pcx+dx,pcz+dz);
 for(const k of chunks.keys())markDirty(...k.split(",").map(Number));
}
function streamWorld(){
 const [pcx,pcz]=chunkFor(player.pos.x,player.pos.z);
 for(let dx=-CFG.VIEW;dx<=CFG.VIEW;dx++)for(let dz=-CFG.VIEW;dz<=CFG.VIEW;dz++)if(dx*dx+dz*dz<=CFG.VIEW*CFG.VIEW)getChunk(pcx+dx,pcz+dz);
 const limit=CFG.VIEW+2;for(const [k,m] of chunkMeshes){const [x,z]=k.split(",").map(Number);if(Math.abs(x-pcx)>limit||Math.abs(z-pcz)>limit){scene.remove(m);m.geometry.dispose();chunkMeshes.delete(k)}}
}

class Player{
 constructor(){this.pos=new THREE.Vector3(0,40,0);this.vel=new THREE.Vector3();this.yaw=0;this.pitch=0;this.onGround=false;this.health=20}
 spawn(){let y=CFG.HEIGHT-1;while(y>1&&getBlock(0,y,0)===0)y--;this.pos.set(.5,y+1.01,.5)}
 update(dt){
  const dir=new THREE.Vector3((keys.KeyD?1:0)-(keys.KeyA?1:0),0,(keys.KeyS?1:0)-(keys.KeyW?1:0));if(dir.lengthSq())dir.normalize();
  const speed=(keys.ShiftLeft||keys.ShiftRight)?CFG.SPRINT:CFG.WALK;dir.applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw);this.vel.x=dir.x*speed;this.vel.z=dir.z*speed;
  this.vel.y-=CFG.GRAVITY*dt;if(this.onGround&&keys.Space){this.vel.y=CFG.JUMP;this.onGround=false}
  this.moveAxis("x",this.vel.x*dt);this.moveAxis("z",this.vel.z*dt);this.moveAxis("y",this.vel.y*dt);
  if(this.pos.y<-10)this.spawn();
  camera.position.copy(this.pos).add(new THREE.Vector3(0,1.62,0));camera.rotation.order="YXZ";camera.rotation.y=this.yaw;camera.rotation.x=this.pitch;
 }
 moveAxis(axis,amount){if(!amount)return;const old=this.pos[axis];this.pos[axis]+=amount;if(collides(this.pos)){this.pos[axis]=old;if(axis==="y"){if(amount<0)this.onGround=true;this.vel.y=0}}else if(axis==="y")this.onGround=false}
}
function collides(p){const r=.3,h=1.8;for(const dx of [-r,r])for(const dz of [-r,r])for(const dy of [0,h]){const x=Math.floor(p.x+dx),y=Math.floor(p.y+dy),z=Math.floor(p.z+dz);if(BLOCKS[getBlock(x,y,z)]?.solid)return true}return false}

function raycast(max=7){
 const o=camera.getWorldPosition(new THREE.Vector3()),d=camera.getWorldDirection(new THREE.Vector3());let p=o.clone();let prev=null;for(let i=0;i<max*20;i++){const b=new THREE.Vector3(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z));const id=getBlock(b.x,b.y,b.z);if(id)return {block:b,previous:prev,id};prev=b;p.addScaledVector(d,.05)}return null;
}
function selectedItem(){return inventory[selected]?.id??HOT[selected]}
function addItem(id,count=1){
 const max=ITEMS[id]?.max||64;
 for(let i=0;i<inventory.length&&count>0;i++)if(inventory[i]?.id===id&&inventory[i].count<max){const n=Math.min(count,max-inventory[i].count);inventory[i].count+=n;count-=n}
 for(let i=0;i<inventory.length&&count>0;i++)if(!inventory[i]){const n=Math.min(count,max);inventory[i]={id,count:n,durability:ITEMS[id]?.durability||0};count-=n}
 renderHotbar();renderInventory();return count===0;
}
function removeItem(id,count=1){
 for(let i=inventory.length-1;i>=0&&count>0;i--)if(inventory[i]?.id===id){const n=Math.min(count,inventory[i].count);inventory[i].count-=n;count-=n;if(inventory[i].count<=0)inventory[i]=null}
 renderHotbar();renderInventory();return count===0;
}
function selectedTool(){const it=inventory[selected];return it&&ITEMS[it.id]?.tool?it:null}
function miningTime(blockId){
 const b=BLOCKS[blockId];if(!b)return 1;
 const t=selectedTool(),tool=ITEMS[t?.id];
 let speed=1;
 if(tool?.tool==="pickaxe"&&[3,10,11,12,13,14].includes(blockId))speed=1+tool.tier*2.2;
 else if(tool?.tool==="axe"&&[5,7,16].includes(blockId))speed=1+tool.tier*2;
 else if(tool?.tool==="shovel"&&[2,4].includes(blockId))speed=1+tool.tier*2;
 return Math.max(.12,b.hardness?b.hardness/speed:.65/speed);
}
function dropFor(blockId){return {1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:11,12:12,13:13,14:14,16:16,17:17}[blockId]||null}
function finishMining(hit){
 const drop=dropFor(hit.id);
 setBlock(hit.block.x,hit.block.y,hit.block.z,0);
 if(drop)addItem(drop,1);
 const tool=selectedTool();if(tool){tool.durability=(tool.durability||ITEMS[tool.id].durability)-1;if(tool.durability<=0)inventory[selected]=null}
 saveWorld();renderHotbar();renderInventory();
}
function updateMining(dt){
 if(!mining||paused||inventoryOpen)return;
 const hit=raycast();if(!hit){miningTarget=null;miningProgress=0;return}
 const k=hit.block.x+","+hit.block.y+","+hit.block.z;
 if(k!==miningTarget){miningTarget=k;miningProgress=0}
 miningProgress+=dt/miningTime(hit.id);
 if(miningProgress>=1){finishMining(hit);miningTarget=null;miningProgress=0}
}
function placeBlock(){
 const hit=raycast();if(!hit||!hit.previous)return;
 const p=hit.previous,item=inventory[selected];const blockId=item&&ITEMS[item.id]?.block;
 if(!blockId||collides(new THREE.Vector3(p.x+.5,p.y,p.z+.5)))return;
 setBlock(p.x,p.y,p.z,blockId);removeItem(item.id,1);saveWorld();
}

function makeSwatch(color){const c=document.createElement("canvas");c.width=c.height=16;const x=c.getContext("2d");x.fillStyle=color;x.fillRect(0,0,16,16);if(color==="#62a83f"){x.fillStyle="#78bf4a";x.fillRect(0,0,16,5)}return c.toDataURL()}
function itemVisual(id){const it=ITEMS[id];const block=it?.block;return makeSwatch(BLOCKS[block||1]?.color||"#aaa")}
function renderHotbar(){const h=document.getElementById("hotbar");h.innerHTML="";for(let i=0;i<9;i++){const s=document.createElement("div");s.className="slot"+(i===selected?" selected":"");const item=inventory[i],id=item?.id;if(id)s.innerHTML='<span class="key">'+(i+1)+'</span><img class="swatch" src="'+itemVisual(id)+'"><span class="count">'+(item.count||1)+'</span>';else s.innerHTML='<span class="key">'+(i+1)+'</span>';h.appendChild(s)}}
function renderInventory(){const g=document.getElementById("inventoryGrid");g.className="invgrid";g.innerHTML="";for(let i=0;i<36;i++){const s=document.createElement("div");s.className="invslot";const item=inventory[i],id=item?.id;if(id)s.innerHTML='<img class="swatch" src="'+itemVisual(id)+'"><span class="count">'+(item.count||1)+'</span>';g.appendChild(s)}
 const rl=document.getElementById("recipeList");if(!rl)return;rl.innerHTML="";for(const r of RECIPES){const b=document.createElement("button");b.className="recipe";b.textContent=r.name;b.disabled=!canCraft(r);b.onclick=()=>{if(craft(r)){renderInventory();saveWorld()}};rl.appendChild(b)}}
function countItem(id){return inventory.reduce((n,x)=>n+(x?.id===id?x.count:0),0)}
function canCraft(r){return r.need.every(([id,n])=>countItem(id)>=n)}
function craft(r){if(!canCraft(r))return false;for(const [id,n] of r.need)removeItem(id,n);return addItem(r.out,r.count)}

function saveWorld(){localStorage.setItem("voxel-seed",String(seed));localStorage.setItem("voxel-player",JSON.stringify({x:player.pos.x,y:player.pos.y,z:player.pos.z,yaw:player.yaw,pitch:player.pitch}));localStorage.setItem("voxel-modified",JSON.stringify([...modified]));localStorage.setItem("voxel-inventory",JSON.stringify(inventory))}
function loadWorld(){try{const p=JSON.parse(localStorage.getItem("voxel-player"));if(p)Object.assign(player.pos,{x:p.x,y:p.y,z:p.z});const m=JSON.parse(localStorage.getItem("voxel-modified")||"[]");modified=new Map(m);const inv=JSON.parse(localStorage.getItem("voxel-inventory")||"null");if(Array.isArray(inv)&&inv.length===36)inventory=inv}catch{}}

function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color("#7db9ed");scene.fog=new THREE.Fog("#7db9ed",45,145);
 camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,250);
 renderer=new THREE.WebGLRenderer({antialias:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.getElementById("game").appendChild(renderer.domElement);
 const amb=new THREE.HemisphereLight("#dceeff","#4c6b45",1.8);scene.add(amb);const sun=new THREE.DirectionalLight("#fff3d1",2.2);sun.position.set(80,120,40);sun.castShadow=true;scene.add(sun);
 materials.voxel=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});
 player=new Player();world={};loadWorld();
 if(!localStorage.getItem("voxel-player")){player.spawn();addItem(1,32);addItem(2,32);addItem(3,32);addItem(5,16);addItem(7,16);addItem(101,1);addItem(121,1);saveWorld()}
 renderHotbar();renderInventory();ensureWorld();rebuildDirty();
 clock=new THREE.Clock();animate();
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(!paused&&!inventoryOpen){player.update(dt);streamWorld();updateMining(dt);rebuildDirty()}const biome=biomeAt(Math.floor(player.pos.x),Math.floor(player.pos.z));
 document.getElementById("status").textContent='Seed '+seed+' · '+Math.floor(player.pos.x)+', '+Math.floor(player.pos.y)+', '+Math.floor(player.pos.z)+' · '+biome+' · '+(player.onGround?"Grounded":"Airborne");renderer.render(scene,camera)}
function start(){paused=false;document.getElementById("menu").classList.add("hidden");renderer.domElement.requestPointerLock()}
function toggleInventory(){inventoryOpen=!inventoryOpen;document.getElementById("inventory").classList.toggle("hidden",!inventoryOpen);if(inventoryOpen)document.exitPointerLock();else renderer.domElement.requestPointerLock()}
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
addEventListener("keydown",e=>{keys[e.code]=true;if(e.code.startsWith("Digit")){const n=+e.code.slice(5)-1;if(n>=0&&n<9){selected=n;renderHotbar()}}if(e.code==="KeyE"&&!e.repeat)toggleInventory();if(e.code==="Escape"){inventoryOpen=false;document.getElementById("inventory").classList.add("hidden");paused=true;document.getElementById("menu").classList.remove("hidden")}})
addEventListener("keyup",e=>keys[e.code]=false);
function rendererPointer(){document.addEventListener("mousemove",e=>{if(document.pointerLockElement!==renderer.domElement||inventoryOpen)return;player.yaw-=e.movementX*.0022;player.pitch-=e.movementY*.0022;player.pitch=Math.max(-1.5,Math.min(1.5,player.pitch))});renderer?.domElement?.addEventListener("mousedown",e=>{if(paused)return;if(e.button===0)mining=true;if(e.button===2)placeBlock()});
renderer?.domElement?.addEventListener("mouseup",e=>{if(e.button===0){mining=false;miningTarget=null;miningProgress=0}});renderer?.domElement?.addEventListener("contextmenu",e=>e.preventDefault())}
document.getElementById("play").onclick=start;
document.getElementById("newWorld").onclick=()=>{seed=Math.floor(Math.random()*2**31);localStorage.removeItem("voxel-player");localStorage.removeItem("voxel-modified");localStorage.removeItem("voxel-inventory");location.reload()};
init();
rendererPointer();