import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { seedData, propertySeed, adminAgents } from './seed';
import type { RecordData, User } from './types';

export type Row = Record<string, any>;
interface Transport { q(sql: string, params?: any[]): Promise<Row[]>; run(sql: string, params?: any[]): Promise<void>; }

const SCHEMA = [
 'PRAGMA busy_timeout=10000',
 'PRAGMA journal_mode=WAL',
 'PRAGMA foreign_keys=ON',
 'CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id))',
 'CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,role TEXT NOT NULL,agent_id TEXT,password TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1)',
 'CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS counters(name TEXT PRIMARY KEY,value INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT,action TEXT,kind TEXT,record_id TEXT,before_data TEXT,after_data TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)',
 'CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL)',
];

let cached: Promise<Transport> | null = null;
let cloud = false;
let cloudEnv: any | null = null;
export function isCloudflare() { return cloud; }

export function transport(): Promise<Transport> {
 if (cached) return cached;
 cached = (async () => {
  // `next dev` authors in ./data/impulsa.db; CF_DEV=1 opts into the local D1/R2 bindings.
  const sqliteInDev = process.env.NODE_ENV === 'development' && process.env.CF_DEV !== '1';
  if (!sqliteInDev) try {
   const { getCloudflareContext } = await import('@opennextjs/cloudflare');
   const { env } = await getCloudflareContext({ async: true });
   if (env?.DB) {
    cloud = true;
    cloudEnv = env;
    const d1 = env.DB as any;
    return {
     q: async (sql, params = []) => (await d1.prepare(sql).bind(...params).all()).results as Row[],
     run: async (sql, params = []) => { await d1.prepare(sql).bind(...params).run(); },
    };
   }
  } catch { /* not running on Cloudflare Workers */ }
  const { DatabaseSync } = await import('node:sqlite');
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  const dbPath = process.env.DATABASE_PATH || './data/impulsa.db';
  mkdirSync(dirname(dbPath), { recursive: true });
  const globalDb = globalThis as unknown as { impulsaDb?: any };
  const db = globalDb.impulsaDb || new DatabaseSync(dbPath);
  globalDb.impulsaDb = db;
  for (const stmt of SCHEMA) db.exec(stmt);
  const local: Transport = {
   q: async (sql, params = []) => db.prepare(sql).all(...(params || [])) as Row[],
   run: async (sql, params = []) => { db.prepare(sql).run(...(params || [])); },
  };
  db.exec('BEGIN IMMEDIATE');
  if (!db.prepare('SELECT id FROM users LIMIT 1').get()) {
   const adminPass = process.env.SEED_ADMIN_PASSWORD || randomBytes(12).toString('base64url');
   const agentPass = process.env.SEED_AGENT_PASSWORD || 'Impulsa2026!';
   const putSync = (kind: string, record: RecordData) => db.prepare('INSERT INTO records(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind, record.id, JSON.stringify(record));
   try {
    for (const [kind, rows] of Object.entries(seedData())) for (const row of rows) putSync(kind, row as RecordData);
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,1)').run('user-admin', 'Administración Impulsa', 'admin@impulsa.local', 'super_admin', '', hash(adminPass));
    const agents = (db.prepare("SELECT data FROM records WHERE kind='agents'").all() as { data: string }[]).map(r => JSON.parse(r.data) as RecordData);
    agents.forEach((a, i) => db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,1)').run(`user-${i + 1}`, a.name, String(a.email).toLowerCase(), adminAgents.includes(String(a.name)) ? 'admin' : 'agent', a.id, hash(agentPass)));
    db.prepare('INSERT INTO counters VALUES(?,?)').run('property', propertySeed.length);
    db.exec('COMMIT');
    writeFileSync('./data/local-access.json', JSON.stringify({ admin: { email: 'admin@impulsa.local', password: adminPass }, agents: agents.map(a => ({ name: a.name, email: a.email, role: adminAgents.includes(String(a.name)) ? 'admin' : 'agent', password: agentPass })) }, null, 2), { mode: 0o600 });
   } catch (e) { db.exec('ROLLBACK'); throw e; }
  } else db.exec('COMMIT');
  return local;
 })();
 return cached;
}

export async function q(sql: string, params?: any[]) { return (await transport()).q(sql, params); }
export async function run(sql: string, params?: any[]) { return (await transport()).run(sql, params); }
export async function cfEnv(): Promise<any | null> {
 if (!(await transport()) || !cloud) return null;
 return cloudEnv;
}

export function hash(password: string) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password, salt, 64).toString('hex'); }
export function verify(password: string, hashed: string) { const [salt, value] = hashed.split(':'); return timingSafeEqual(Buffer.from(value, 'hex'), scryptSync(password, salt, 64)); }
export async function all(kind: string): Promise<RecordData[]> { return (await q('SELECT data FROM records WHERE kind=?', [kind])).map(r => JSON.parse(r.data as string)); }
export async function get(kind: string, id: string): Promise<RecordData | undefined> { const row = (await q('SELECT data FROM records WHERE kind=? AND id=?', [kind, id]))[0]; return row ? JSON.parse(row.data as string) : undefined; }
export async function put(kind: string, record: RecordData, user?: User) {
 const before = await get(kind, record.id);
 await run('INSERT INTO records(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data', [kind, record.id, JSON.stringify(record)]);
 if (user) await run('INSERT INTO audit(user_id,action,kind,record_id,before_data,after_data) VALUES(?,?,?,?,?,?)', [user.id, before ? 'Actualizar' : 'Crear', kind, record.id, before ? JSON.stringify(before) : null, JSON.stringify(record)]);
 return record;
}
export async function remove(kind: string, id: string, user: User) {
 const before = await get(kind, id);
 await run('DELETE FROM records WHERE kind=? AND id=?', [kind, id]);
 await run('INSERT INTO audit(user_id,action,kind,record_id,before_data) VALUES(?,?,?,?,?)', [user.id, 'Eliminar', kind, id, JSON.stringify(before)]);
}
export async function nextCode() { const r = (await q("UPDATE counters SET value=value+1 WHERE name='property' RETURNING value"))[0]; return 'IMP-' + String(r.value).padStart(6, '0'); }
export function publicUser(r: any): User { return { id: r.id, name: r.name, email: r.email, role: r.role, agentId: r.agent_id || '' }; }
export async function sessionUser(token?: string): Promise<User | null> {
 if (!token) return null;
 const r = (await q('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1', [createHash('sha256').update(token).digest('hex'), Date.now()]))[0];
 return r ? publicUser(r) : null;
}
export async function rateLimit(key: string, max = 12, minutes = 15) {
 const now = Date.now();
 await run('DELETE FROM attempts WHERE expires<?', [now]);
 await run('INSERT INTO attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1', [key, now + minutes * 60000]);
 return Number((await q('SELECT count FROM attempts WHERE key=?', [key]))[0]?.count) > max;
}
export async function scoped(kind: string, user: User) {
 const items = await all(kind);
 if (user.role !== 'agent') return items;
 if (['properties', 'leads', 'owners', 'activities'].includes(kind)) return items.filter(x => x.agentId === user.agentId);
 if (kind === 'progress') return items.filter(x => x.userId === user.id);
 if (kind === 'files') return items.filter(x => x.userId === user.id || x.agentId === user.agentId || x.category?.startsWith('training'));
 return items;
}
export async function localAccess() {
 if (cloud || process.env.NODE_ENV !== 'development') return null;
 const { existsSync, readFileSync } = await import('node:fs');
 return existsSync('./data/local-access.json') ? JSON.parse(readFileSync('./data/local-access.json', 'utf8')) : null;
}
