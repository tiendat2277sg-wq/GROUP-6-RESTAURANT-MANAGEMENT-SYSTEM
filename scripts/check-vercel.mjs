import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert.equal(config.services.frontend.framework,'vite');
assert.equal(config.services.backend.entrypoint,'backend/src/index.js');
assert.ok(config.rewrites.find(r=>r.source==='/api/:path*'));
assert.ok(config.rewrites.find(r=>r.source==='/socket.io/:path*'));
const ignore=fs.readFileSync('.vercelignore','utf8').split(/\r?\n/);
for(const value of ['.env','.env.*','runtime','local-data','backend/src/uploads'])assert.ok(ignore.includes(value),value);
assert.ok(fs.existsSync('frontend/dist/index.html'),'Run npm run build:vercel first');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.ok(pkg.optionalDependencies.msnodesqlv8);
assert.ok(!pkg.dependencies.msnodesqlv8);
process.env.VERCEL='1';
// Deliberately inject Windows flags: cloud bootstrap must override them.
process.env.LOCAL_ONLY='true';process.env.DB_TRUSTED_CONNECTION='true';
delete process.env.REDIS_URL;
const {default:server}=await import('../backend/src/index.js');
assert.equal(server.listening,false,'Import must not listen or start background intervals');
assert.equal(process.env.LOCAL_ONLY,'false');
assert.equal(process.env.DB_TRUSTED_CONNECTION,'false');
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base+'/health')).status,200);
  assert.equal((await fetch(base+'/api/cron/maintenance')).status,401);
  assert.equal((await fetch(base+'/uploads/reports/example.pdf')).status,403);
  const api=await fetch(base+'/api/menu');
  assert.equal(api.status,503,'Unconfigured cloud must fail clearly');
  const body=await api.json();assert.ok(body.missing.includes('REDIS_URL'));
} finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
const result={checkedAt:new Date().toISOString(),passed:true,checks:['Vercel routing and ignored secrets','Cloud import has no listener/timers','No Windows/offline settings in cloud','Health endpoint','Cron requires authentication','Reports are not publicly accessible','Missing cloud environment returns 503'],notTested:['Live Vercel deployment','Remote SQL Server','Redis cross-instance pub/sub','Blob cloud upload/download']};
fs.mkdirSync('local-data/environment',{recursive:true});
fs.writeFileSync('local-data/environment/vercel-check.json',JSON.stringify(result,null,2));
console.log('PASS: Vercel preparation checks. No deployment was created.');
