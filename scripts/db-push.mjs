import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const db = new DatabaseSync(process.env.DATABASE_PATH || './data/impulsa.db', { readOnly: true });
const esc = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const out = [];
for (const row of db.prepare('SELECT kind,id,data FROM records').all())
 out.push(`INSERT INTO records(kind,id,data) VALUES(${esc(row.kind)},${esc(row.id)},${esc(row.data)}) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data;`);
for (const row of db.prepare('SELECT id,name,email,role,agent_id,password,active FROM users').all())
 out.push(`INSERT INTO users(id,name,email,role,agent_id,password,active) VALUES(${esc(row.id)},${esc(row.name)},${esc(row.email)},${esc(row.role)},${esc(row.agent_id)},${esc(row.password)},${esc(row.active)}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,role=excluded.role,agent_id=excluded.agent_id,password=excluded.password,active=excluded.active;`);
for (const row of db.prepare('SELECT token,user_id,expires FROM sessions').all())
 out.push(`INSERT INTO sessions(token,user_id,expires) VALUES(${esc(row.token)},${esc(row.user_id)},${esc(row.expires)}) ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,expires=excluded.expires;`);
for (const row of db.prepare('SELECT name,value FROM counters').all())
 out.push(`INSERT INTO counters(name,value) VALUES(${esc(row.name)},${esc(row.value)}) ON CONFLICT(name) DO UPDATE SET value=excluded.value;`);
for (const row of db.prepare('SELECT id,user_id,action,kind,record_id,before_data,after_data,created_at FROM audit').all())
 out.push(`INSERT INTO audit(id,user_id,action,kind,record_id,before_data,after_data,created_at) VALUES(${esc(row.id)},${esc(row.user_id)},${esc(row.action)},${esc(row.kind)},${esc(row.record_id)},${esc(row.before_data)},${esc(row.after_data)},${esc(row.created_at)}) ON CONFLICT(id) DO UPDATE SET before_data=excluded.before_data,after_data=excluded.after_data;`);
for (const row of db.prepare('SELECT key,count,expires FROM attempts').all())
 out.push(`INSERT INTO attempts(key,count,expires) VALUES(${esc(row.key)},${esc(row.count)},${esc(row.expires)}) ON CONFLICT(key) DO UPDATE SET count=excluded.count,expires=excluded.expires;`);

const file = 'data/.push.sql';
writeFileSync(file, out.join('\n') + '\n');
console.log(`pushing ${out.length} statements to D1…`);
execFileSync('npx', ['wrangler', 'd1', 'execute', 'impulsa-db', '--remote', '--file', file], { stdio: 'inherit' });
console.log('db:push done');
