import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const require = createRequire(import.meta.url);
const results = [];
async function check(name, operation) {
  try { const detail = await operation(); results.push({name,ok:true,detail}); }
  catch (error) { results.push({name,ok:false,detail:error.message}); }
}
await check('Node.js 24', () => { assert.equal(process.versions.node.split('.')[0],'24'); return process.version; });
await check('Declared dependencies', () => {
  const p=JSON.parse(fs.readFileSync('package.json','utf8'));
  for(const name of Object.keys({...p.dependencies,...p.devDependencies})) {
    if (name.startsWith('@types/')) assert.ok(fs.existsSync(path.join('node_modules',name,'package.json')),name);
    else require.resolve(name);
  }
  return 'All runtime and development dependencies resolve';
});
await check('Git outside Codex', () => execFileSync('C:/Program Files/Git/cmd/git.exe',['--version'],{encoding:'utf8',windowsHide:true}).trim());
await check('SQL Server service', () => {
  const s=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',"Get-Service MSSQLSERVER | Select-Object @{n='Status';e={$_.Status.ToString()}},@{n='StartType';e={$_.StartType.ToString()}} | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true}));
  assert.equal(s.Status,'Running'); return s;
});
await check('VS Code extensions', () => {
  const names=fs.readdirSync(path.join(process.env.USERPROFILE,'.vscode/extensions'));
  for (const prefix of ['dbaeumer.vscode-eslint-','ms-mssql.mssql-']) assert.ok(names.some(n=>n.startsWith(prefix)),prefix);
  return names.filter(n=>/^(dbaeumer|ms-mssql|ms-dotnettools)/.test(n));
});
await check('Frontend build', () => { assert.ok(fs.existsSync('dist/index.html')); return 'dist/index.html exists'; });
await check('SQL Server Windows Authentication', async () => {
  const {default:sql}=await import('../backend/src/sql-driver.js');
  const pool=await sql.connect({connectionString:'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=System_Restaurant;Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;'});
  try { return (await pool.request().query('SELECT DB_NAME() AS database_name, COUNT(*) AS dishes FROM dbo.Dishes')).recordset[0]; }
  finally { await pool.close(); }
});
await check('Local API', async () => {
  const r=await fetch('http://127.0.0.1:5001/health',{signal:AbortSignal.timeout(5000)});
  assert.equal(r.status,200); return r.json();
});
fs.mkdirSync('local-data/environment',{recursive:true});
fs.writeFileSync('local-data/environment/audit.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}: ${JSON.stringify(r.detail)}`);
if(results.some(r=>!r.ok))process.exitCode=1;
