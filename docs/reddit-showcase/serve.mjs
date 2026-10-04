/* global process, console */
// A loopback-only, read-only server for this standalone scene pack.
import http from 'node:http'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
const root = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.MODWERK_SCENES_PORT || 4176)
const types = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.png':'image/png', '.woff2':'font/woff2', '.md':'text/plain', '.txt':'text/plain', '.json':'application/json' }
const topLevel = new Set(['index.html','gallery.css','scenes.mjs','sdk.html','README.md','CREDITS.md','manifest.json'])
const server = http.createServer(async (req,res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
    const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).slice(1) || 'index.html'
    const parts = name.split('/')
    const allowed = topLevel.has(name) || (['assets','exports'].includes(parts[0]) && parts.length === 2) || (parts.length === 4 && parts.slice(0,3).join('/') === 'node_modules/three/build' && ['three.module.js','three.core.js'].includes(parts[3]))
    if (!allowed || parts.some(part => part.startsWith('.') || part.includes('\\'))) { res.writeHead(404); res.end(); return }
    const ext = path.extname(name)
    if (!types[ext]) { res.writeHead(404); res.end(); return }
    const data = await readFile(path.join(root,name))
    res.writeHead(200,{'Content-Type':types[ext] + (['.html','.mjs','.js','.css','.md','.txt','.json'].includes(ext)?'; charset=utf-8':''),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"})
    res.end(req.method === 'HEAD' ? undefined : data)
  } catch { res.writeHead(404); res.end() }
})
server.listen(port,'127.0.0.1',()=>console.log(`Modwerk scenes: http://127.0.0.1:${port}/`))
