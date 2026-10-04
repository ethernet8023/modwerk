/* global console */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root=path.dirname(fileURLToPath(import.meta.url))
const scenes=[
  ['overview','A home for (all) Elektron mods'],
  ['forum','Talk mods. Share discoveries.'],
  ['module-pages','Every mod, explained.'],
  ['sdk','One shared SDK'],
]
const captures=[],exports=[],thumbs=[]
const checksum=data=>createHash('sha256').update(data).digest('hex')
for(const file of (await readdir(path.join(root,'assets'))).sort()) {
  const data=await readFile(path.join(root,'assets',file))
  const entry={file:'assets/'+file,bytes:data.length,sha256:checksum(data)}
  if(file.endsWith('.jpg')) {
    const metadata=await sharp(data).metadata(),stats=await sharp(data).stats()
    if(metadata.width!==1280||metadata.height!==720)throw new Error(`${file}: expected original 1280 × 720 browser capture`)
    if(Math.max(...stats.channels.map(channel=>channel.stdev))<5)throw new Error(`${file}: blank capture`)
    Object.assign(entry,{width:metadata.width,height:metadata.height})
  }
  captures.push(entry)
}
for(const [index,[id,title]] of scenes.entries()) {
  const base=`${String(index+1).padStart(2,'0')}-modwerk-${id}`
  const pngFile=path.join(root,'exports',base+'.png'),png=await readFile(pngFile)
  const metadata=await sharp(png).metadata()
  if(metadata.width!==2400||metadata.height!==1800)throw new Error(`${base}: expected 2400 × 1800 Three.js export`)
  const jpg=await sharp(png).jpeg({quality:97,chromaSubsampling:'4:4:4'}).toBuffer()
  await writeFile(path.join(root,'exports',base+'.jpg'),jpg)
  exports.push({order:index+1,id,title,width:2400,height:1800,png:{file:`exports/${base}.png`,bytes:png.length,sha256:checksum(png)},jpg:{file:`exports/${base}.jpg`,bytes:jpg.length,sha256:checksum(jpg)}})
  thumbs.push({input:await sharp(png).resize(960,720).png().toBuffer(),left:20+(index%2)*980,top:20+Math.floor(index/2)*740})
}
await sharp({create:{width:1980,height:1500,channels:3,background:'#141416'}}).composite(thumbs).png().toFile(path.join(root,'exports','contact-sheet.png'))
const manifest={
  formatVersion:1,
  capturedOn:'2026-10-04',
  intent:'Reddit gallery for the Modwerk launch',
  rendering:{engine:'Three.js',version:'0.183.2',angle:35,width:2400,height:1800,colorSpace:'sRGB'},
  sources:{
    site:{branch:'modwerk/elemod-engine',commit:'503c7db2fb73624d5ab936391ad3057d23e8c312',capture:'Isolated local React preview; no production API writes'},
    logo:{branch:'claude/elektron-thumbnail-redesign-btzzfu',commit:'33e224c6326f4ce0fd955f83ce7ad1cfbb0bd9e8',file:'public/modwerk-mark.svg'},
    sdk:{file:'docs/SDK.md',renderedExcerpt:'sdk.html',original:'assets/SDK-source.md'},
    deviceStatus:{original:'assets/device-status.json',launchPresentation:{available:['octatrack','digitakt','digitone'],authority:'Owner instruction on 4 October 2026: Digitakt and Digitone need to be in Builds available'},note:'The captured registry remains unmodified. The gallery presents the owner-specified launch lineup, without changing site build gates.'},
    moduleExample:{id:'tapeecho',version:'0.1.2-experimental',screenshots:'Original ot_emu LCD captures, as credited in the module page. Not hardware-test evidence.'},
  },
  captureNotes:['The new logo was applied only to the isolated local capture preview.','The original author is credited by the repeat98 handle and source link.','The forum uses an empty local database. No users or activity were staged.','No firmware was exported or included.','Screen crops are from actual browser JPEGs; only surrounding Three.js frames, editorial text and lighting are authored.'],
  credits:'CREDITS.md',assets:captures,exports,
}
await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log(`Verified ${captures.filter(file=>file.file.endsWith('.jpg')).length} real captures; prepared ${exports.length} PNG/JPEG pairs and a contact sheet.`)
