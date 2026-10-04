/* global document, Image, history, window, location, ResizeObserver, fetch, URL, setTimeout, console */
import * as THREE from './node_modules/three/build/three.module.js'

// All coordinates are authored in export pixels. Screens are actual JPEG captures,
// placed on Three.js meshes; artwork, typography and framing are deterministic.
const W = 2400, H = 1800
const C = { ink:'#ececf1',soft:'#c3c3ce',muted:'#9595a3',faint:'#55555f',apricot:'#d0a46a',lavender:'#929bff',mint:'#83c7bc' }
const definitions = [
  {id:'overview',title:'A home for (all) Elektron mods',description:'Overview of the Modwerk launch preview: a shared library, machine-specific configurations, community forum and standardized developer workflow.'},
  {id:'forum',title:'Talk mods. Share discoveries.',description:'Actual forum front page and category controls from an isolated, empty local database. There are no staged users, posts, replies or activity counts.'},
  {id:'module-pages',title:'Every mod, explained.',description:'Clear module pages bring documentation, controls, source credits, resource estimates and screenshots together. The real Tape Echo page illustrates the format; its LCD images are original emulator captures.'},
  {id:'sdk',title:'One shared SDK',description:'A common module contract for every machine. Launch lineup: Octatrack, Digitakt and Digitone builds available. Digitakt II and Digitone II have research started; other profiles invite contributors through the same SDK standard. The documentation screen is a rendered excerpt of docs/SDK.md.'},
]
const canvas = document.querySelector('#preview')
const loading = document.querySelector('#loading')
let renderer, scene, camera, current = 0, angle = .35
let panels = [], textures = [], geometries = [], materials = []
const images = {}
let devices = []
const names = ['all-machines','forum','forum-categories','sdk','tapeecho-page','tapeecho-media','tapeecho-controls']

function imageFile(url) {
  return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not load '+url));img.src=url})
}
function trackGeometry(g) { geometries.push(g); return g }
function trackMaterial(m) { materials.push(m); return m }
function xy(x,y,z=0) { return new THREE.Vector3(x-W/2,H/2-y,z) }
function context(w,h) { const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return [c,c.getContext('2d')] }
function texture(c) {const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();textures.push(t);return t}
function flatTexture(c,w,h,x,y,z=5,parent=scene) {
  const mesh=new THREE.Mesh(trackGeometry(new THREE.PlaneGeometry(w,h)),trackMaterial(new THREE.MeshBasicMaterial({map:texture(c),transparent:true,toneMapped:false,depthWrite:false})))
  mesh.position.copy(parent===scene?xy(x+w/2,y+h/2,z):new THREE.Vector3(x+w/2,-y-h/2,z))
  parent.add(mesh);return mesh
}
function text(value,x,y,size=36,color=C.ink,weight=500,mono=false,width=2200) {
  const lines=value.split('\n'), height=Math.ceil(lines.length*size*1.17+size*.12)
  const [c,ctx]=context(width,height)
  ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${mono?'Mono':'Archivo'}`;ctx.textBaseline='top'
  lines.forEach((line,i)=>ctx.fillText(line,0,i*size*1.17))
  return flatTexture(c,width,height,x,y,190)
}
function line(x1,y1,x2,y2,color=C.faint,z=0,opacity=1) {
  const points=[xy(x1,y1,z),xy(x2,y2,z)]
  const g=trackGeometry(new THREE.BufferGeometry().setFromPoints(points))
  const l=new THREE.Line(g,trackMaterial(new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity})));scene.add(l);return l
}
function roundPath(ctx,x,y,w,h,r) {ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function roundedShape(w,h,r=20) {
  const s=new THREE.Shape(),l=-w/2,t=-h/2
  s.moveTo(l+r,t);s.lineTo(l+w-r,t);s.quadraticCurveTo(l+w,t,l+w,t+r);s.lineTo(l+w,t+h-r);s.quadraticCurveTo(l+w,t+h,l+w-r,t+h);s.lineTo(l+r,t+h);s.quadraticCurveTo(l,t+h,l,t+h-r);s.lineTo(l,t+r);s.quadraticCurveTo(l,t,l+r,t);return s
}
function box(x,y,w,h,z,color='#242429',depth=14,bevel=7) {
  const g=trackGeometry(new THREE.ExtrudeGeometry(roundedShape(w,h,bevel+6),{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:4,bevelSegments:3,steps:1,curveSegments:8}))
  const m=trackMaterial(new THREE.MeshStandardMaterial({color,roughness:.68,metalness:.24}))
  const mesh=new THREE.Mesh(g,m);mesh.position.copy(xy(x+w/2,y+h/2,z));scene.add(mesh);return mesh
}
function pill(label,x,y,color=C.apricot,w) {
  const width=w||Math.ceil(label.length*16+40)
  const [c,ctx]=context(width,48);roundPath(ctx,1,1,width-2,46,12);ctx.fillStyle='#24242a';ctx.fill();ctx.strokeStyle=color+'75';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle=color;ctx.font='500 21px Mono';ctx.textBaseline='middle';ctx.fillText(label,20,25)
  flatTexture(c,width,48,x,y,190)
}
function chrome(source,crop,title,w,h) {
  const [c,ctx]=context(w,h+42)
  roundPath(ctx,0,0,w,h+42,18);ctx.clip();ctx.fillStyle='#242429';ctx.fillRect(0,0,w,h+42)
  ctx.fillStyle='#6b6b79';[20,35,50].forEach(x=>{ctx.beginPath();ctx.arc(x,21,3,0,Math.PI*2);ctx.fill()})
  ctx.fillStyle='#b7b7c6';ctx.font='500 11px Mono';ctx.textBaseline='middle';ctx.fillText(title,76,21)
  const [sx,sy,sw,sh]=crop||[0,0,source.width,source.height]
  ctx.drawImage(source,sx,sy,sw,sh,0,42,w,h)
  ctx.strokeStyle='#50505c';ctx.lineWidth=1;roundPath(ctx,.5,.5,w-1,h+41,18);ctx.stroke()
  return c
}
function screen(key,x,y,w,{crop,title='MODWERK / PREVIEW',rx=.025,ry=-.035,rz=0,z=70}={}) {
  const source=images[key], sw=crop?.[2]||source.width, sh=crop?.[3]||source.height
  const h=w*sh/sw, total=h+42
  const group=new THREE.Group();group.position.copy(xy(x+w/2,y+total/2,z));scene.add(group)
  const geo=trackGeometry(new THREE.ExtrudeGeometry(roundedShape(w+10,total+10,20),{depth:12,bevelEnabled:true,bevelSize:4,bevelThickness:3,bevelSegments:3,steps:1,curveSegments:10}))
  const back=new THREE.Mesh(geo,trackMaterial(new THREE.MeshStandardMaterial({color:'#48484f',metalness:.42,roughness:.4})));back.position.z=-17;group.add(back)
  const surface=new THREE.Mesh(trackGeometry(new THREE.PlaneGeometry(w,total)),trackMaterial(new THREE.MeshBasicMaterial({map:texture(chrome(source,crop,title,w,total-42)),transparent:true,toneMapped:false})));surface.position.z=1;group.add(surface)
  // A translucent ground shadow, behind the screen instead of painted over UI.
  const [shadow,sctx]=context(256,128);const gradient=sctx.createRadialGradient(128,64,0,128,64,100);gradient.addColorStop(0,'rgba(0,0,0,.6)');gradient.addColorStop(1,'rgba(0,0,0,0)');sctx.fillStyle=gradient;sctx.fillRect(0,0,256,128)
  flatTexture(shadow,w*1.13,total*1.15,x-w*.06,y+36,0)
  panels.push({group,rx,ry,rz});return {w,h:total}
}
function header(number,label) {
  const [c,ctx]=context(64,64);ctx.drawImage(images.mark,0,0,64,64);flatTexture(c,64,64,110,79,190)
  text('Modwerk',194,87,44,C.ink,650,false,350)
  text('DEVELOPMENT PREVIEW',1740,97,21,C.muted,450,true,540)
  line(110,180,2290,180,'#3d3d46',0)
  text(`${String(number+1).padStart(2,'0')} / ${label.toUpperCase()}`,112,220,24,C.apricot,500,true,1700)
}
function footer(number,note) {
  line(110,1640,2290,1640,'#3b3b42',0)
  text('INDEPENDENT COMMUNITY PROJECT',112,1690,21,C.muted,400,true,850)
  text(note,950,1690,20,C.muted,400,true,1200)
  text(`${number+1} / ${definitions.length}`,2185,1690,22,C.apricot,500,true,120)
}
function trigRow(y=1535) {
  const width=2180,gap=22,s=(width-gap*15)/16
  for(let i=0;i<16;i++){
    const x=110+i*(s+gap),beat=i%4===0
    box(x,y,s,64,2,beat?'#4b4034':'#252529',12,5)
    line(x+15,y+18,x+s-15,y+18,beat?C.apricot:'#666670',25)
    text(String(i+1).padStart(2,'0'),x+15,y+32,18,beat?C.apricot:C.faint,500,true,s-20)
  }
}
function background(number) {
  scene=new THREE.Scene();scene.background=new THREE.Color('#141416')
  camera=new THREE.OrthographicCamera(-W/2,W/2,H/2,-H/2,1,10000);camera.position.set(0,0,5000)
  scene.add(new THREE.AmbientLight('#b8b8cb',2.2))
  const key=new THREE.DirectionalLight('#f6d8b3',3);key.position.set(-800,1600,2400);scene.add(key)
  const fill=new THREE.DirectionalLight('#acb4ff',2);fill.position.set(1600,-300,900);scene.add(fill)
  // Restrained, perspective graphite stage: shared visual language across all scenes.
  const stage=box(50,1440,2300,175,-35,'#1e1e23',24,18);stage.rotation.x=.16;stage.rotation.z=-.012
  for(let x=112;x<W;x+=136)line(x,450,x+130,1585,'#303038',-30,.2)
  for(let y=480;y<1640;y+=136)line(112,y,2290,y,'#303038',-30,.18)
  text('MODWERK / 2026',1980,1523,17,C.faint,400,true,350)
  header(number,['Overview','Community forum','Module documentation','SDK + supported devices'][number])
}
function overview() {
  text('A home for (all)',110,285,132,C.ink,650,false,2180)
  text('Elektron mods',110,437,132,C.ink,650,false,2180)
  text('Explore, discuss and build.\nA shared space for your machines.',116,618,34,C.soft,450,false,950)
  screen('all-machines',755,665,1480,{title:'MODWERK / ALL MACHINES',rx:.025,ry:-.035,rz:-.018})
  const features=[['01','Multi-device library'],['02','Community forum'],['03','Standardized SDK'],['04','Local firmware builder']]
  features.forEach(([n,label],i)=>{text(n,116,838+i*123,22,C.apricot,500,true,65);text(label,195,832+i*123,32,C.soft,520,false,650);line(116,915+i*123,658,915+i*123,'#3b3b43')})
  trigRow();footer(0,'SITE CAPTURES / LAUNCH-BRANCH PREVIEW')
}
function forum() {
  text('Talk mods.',110,285,119,C.ink,650,false,2000)
  text('Share discoveries.',110,422,119,C.ink,650,false,2100)
  text('A board for every Elektron machine.',115,575,35,C.soft,450,false,1700)
  screen('forum',590,705,1640,{crop:[276,127,956,515],title:'MODWERK / COMMUNITY FORUM',rx:.02,ry:-.032,rz:-.018,z:55})
  const labels=['General discussion','Module help','Bug reports','Shared configurations']
  labels.forEach((label,i)=>{text(String(i+1).padStart(2,'0'),114,818+i*141,21,C.apricot,500,true,65);text(label.includes(' ')?label.replace(' ','\n'):label,195,813+i*141,31,C.soft,520,false,450)})
  // This is a close crop of the actual category navigation, never recreated labels.
  screen('forum-categories',1145,1410,1035,{crop:[290,213,650,47],title:'DISCUSSION CATEGORIES / DETAIL',rx:0,ry:.01,z:130})
  footer(1,'LOCAL FORUM PREVIEW / NO STAGED ACTIVITY')
}
function modulePages() {
  text('Every mod, explained.',110,285,119,C.ink,650,false,2180)
  text('Know what you’re adding.',115,444,53,C.soft,500,false,2150)
  text('Controls, guides, source credits and resource estimates.',115,535,34,C.soft,450,false,2180)
  screen('tapeecho-page',115,690,1140,{crop:[256,126,1000,470],title:'MODULE PAGE / TAPE ECHO AS AN EXAMPLE',rx:.018,ry:.03,rz:.012,z:60})
  screen('tapeecho-media',1280,845,940,{crop:[260,80,752,313],title:'ACTUAL MONOCHROME EMULATOR CAPTURES',rx:.02,ry:-.03,rz:-.018,z:100})
  screen('tapeecho-controls',115,1250,930,{crop:[260,186,1000,313],title:'DOCUMENTED CONTROLS / DEFAULTS',rx:0,ry:.02,z:80})
  text('Screenshots + controls.\nSources + credits.',1430,1335,39,C.soft,540,false,800)
  pill('CLEAR MODULE DOCUMENTATION',1430,1470,C.apricot,625)
  text('Explore the details before you build.',1430,1540,27,C.soft,470,false,750)
  footer(2,'EXAMPLE MODULE PAGE / CAPTURE PROVENANCE RETAINED')
}
function groupedDevices(status) {
  // Owner-specified launch status; the captured registry stays unchanged.
  const rows=devices.filter(d=>(d.status==='preview'?'available':d.status)===status),groups=[]
  for(const device of rows){
    const same=groups.find(d=>d.name===device.name)
    if(same)same.variants.push(...(device.variants||[]))
    else groups.push({name:device.name,variants:[...(device.variants||[])]})
  }
  for(const device of groups){
    device.variants=[...new Set(device.variants)]
    if(device.name==='Analog Rytm'||device.name==='Analog Four')device.variants.sort()
  }
  return groups
}
function sharedSdk() {
  text('One shared SDK',110,285,132,C.ink,650,false,2180)
  text('A common module contract for every machine.',115,472,43,C.soft,500,false,2180)
  screen('sdk',110,655,1070,{crop:[32,82,1216,582],title:'DOCS / THE MODWERK SDK',rx:.015,ry:.025,rz:.008,z:60})
  const x=1250,w=1040
  box(x,655,w,260,10,'#202025',15,12)
  line(x+28,685,x+w-28,685,C.mint,35)
  text('Builds available',x+28,716,31,C.mint,590,false,w-50)
  groupedDevices('available').forEach((device,i)=>{
    text(device.name,x+28,772+i*47,32,C.ink,600,false,330)
    text(device.variants.join(' / '),x+380,780+i*47,23,C.soft,450,false,w-410)
  })
  box(x,945,w,148,10,'#202025',15,12)
  line(x+28,974,x+w-28,974,C.lavender,35)
  text('Research started',x+28,999,27,C.lavender,590,false,380)
  text(groupedDevices('research').map(device=>device.name).join(' / '),x+410,1001,30,C.ink,540,false,w-440)
  text('Help complete each platform, core and first mod.',x+28,1050,22,C.muted,430,false,w-50)
  box(x,1123,w,430,10,'#202025',15,12)
  line(x+28,1152,x+w-28,1152,C.soft,35)
  text('No mods yet — your machine next?',x+28,1180,27,C.soft,590,false,w-50)
  groupedDevices('open').forEach((device,i)=>{
    const col=Math.floor(i/5),row=i%5,tx=x+28+col*500,y=1242+row*56
    text(device.name,tx,y,26,C.ink,500,false,470)
    if(device.variants.length)text(device.variants.join(' / '),tx,y+31,18,C.muted,430,false,470)
  })
  text('ONE CONTRACT',115,1260,22,C.apricot,500,true,1070)
  text('Profile · controls · documentation · evidence',115,1310,27,C.soft,500,false,1070)
  text('Bring your machine to Modwerk.',115,1398,37,C.ink,580,false,1070)
  text('Platform + core → first mod → reviewed PR',115,1460,27,C.soft,450,false,1070)
  text('docs/SDK.md · docs/ADD_A_MACHINE.md',115,1522,22,C.apricot,450,true,1070)
  footer(3,'SHARED STANDARD / MODWERK LAUNCH LINEUP')
}
function disposeScene() {
  textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())
  textures=[];geometries=[];materials=[];panels=[]
}
function applyAngle() {panels.forEach(p=>p.group.rotation.set(p.rx*angle*2.86,p.ry*angle*2.86,p.rz*angle*2.86))}
function render() { if(renderer&&scene){applyAngle();renderer.render(scene,camera)} }
function selectScene(index) {
  current=index;disposeScene();background(index);[overview,forum,modulePages,sharedSdk][index]();render()
  document.querySelectorAll('[data-scene]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.scene)===index)))
  document.querySelector('#scene-description').textContent=definitions[index].description
  history.replaceState(null,'','#'+definitions[index].id)
  document.documentElement.dataset.scene=definitions[index].id
}
function resize() {
  const rect=canvas.parentElement.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.round(w*H/W)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(w,h,false);render()
}
async function exportScene(type) {
  const exportIndex=current,controls=[...document.querySelectorAll('[data-scene], #export-png, #export-jpg, #angle, #reset')]
  controls.forEach(control=>{control.disabled=true})
  const previousSize=renderer.getSize(new THREE.Vector2()),previousRatio=renderer.getPixelRatio()
  try {
    renderer.setPixelRatio(1);renderer.setSize(W,H,false);render()
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,type==='image/jpeg'?.97:undefined))
    if(!blob)throw new Error('The browser could not encode the scene.')
    const url=URL.createObjectURL(blob),a=document.createElement('a')
    a.href=url;a.download=`${String(exportIndex+1).padStart(2,'0')}-modwerk-${definitions[exportIndex].id}-2400.${type==='image/png'?'png':'jpg'}`;a.click();document.documentElement.dataset.exported=a.download;setTimeout(()=>URL.revokeObjectURL(url),10000)
  } finally {renderer.setPixelRatio(previousRatio);renderer.setSize(previousSize.x,previousSize.y,false);render();controls.forEach(control=>{control.disabled=false})}
}
try {
  await Promise.all([document.fonts.load('650 119px Archivo'),document.fonts.load('500 24px Mono')])
  const registry=await fetch('assets/device-status.json')
  if(!registry.ok)throw new Error('Device status source could not load.')
  devices=await registry.json()
  await Promise.all(names.map(async name=>{images[name]=await imageFile(`assets/${name}.jpg`)}))
  images.mark=await imageFile('assets/modwerk-mark.svg')
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,alpha:false})
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1
  document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>selectScene(Number(button.dataset.scene))))
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();selectScene(0)})
  document.querySelector('#angle').addEventListener('input',event=>{angle=Number(event.target.value)/100;render()})
  document.querySelector('#reset').addEventListener('click',()=>{angle=.35;document.querySelector('#angle').value='35';render()})
  document.querySelector('#export-png').addEventListener('click',()=>void exportScene('image/png').catch(error=>{document.querySelector('#scene-description').textContent=error.message}))
  document.querySelector('#export-jpg').addEventListener('click',()=>void exportScene('image/jpeg').catch(error=>{document.querySelector('#scene-description').textContent=error.message}))
  const requested=definitions.findIndex(s=>s.id===location.hash.slice(1))
  selectScene(requested<0?0:requested);resize();new ResizeObserver(resize).observe(canvas.parentElement)
  loading.hidden=true;document.querySelector('#export-png').disabled=false;document.querySelector('#export-jpg').disabled=false
  document.documentElement.dataset.ready='true'
} catch(error) {loading.textContent=error.message;document.documentElement.dataset.ready='error';console.error(error)}
