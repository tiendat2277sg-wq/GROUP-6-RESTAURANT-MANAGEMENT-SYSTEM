import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Never bake the Windows .env or offline-only flags into a cloud build.
process.env.VITE_LOCAL_ONLY = 'false';
process.env.VITE_API_BASE_URL = '/api';
process.env.VITE_API_URL = '/api';
process.env.VITE_SOCKET_URL = '';
process.env.PHURAI_VERCEL_BUILD = 'true';
process.chdir(path.join(root,'frontend'));
await build({configFile:path.join(root,'frontend/vite.config.js')});
const menu = path.join(root,'frontend/src/assets/images/menu');
const target = path.join(root,'frontend/dist/menu');
fs.mkdirSync(target,{recursive:true});
for(const entry of fs.readdirSync(menu,{withFileTypes:true})) {
  if (!entry.isFile()) continue;
  fs.copyFileSync(path.join(menu,entry.name),path.join(target,entry.name));
  if(entry.name.startsWith('menu-')) fs.copyFileSync(path.join(menu,entry.name),path.join(target,entry.name.slice(5)));
}
