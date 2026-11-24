import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const file = 'data/.pull.sql';
rmSync(file, { force: true });
execFileSync('npx', ['wrangler', 'd1', 'export', 'impulsa-db', '--remote', '--no-schema', '--output', file], { stdio: 'inherit' });
const sql = readFileSync(file, 'utf8').replace(/^\s*(BEGIN|COMMIT);?\s*$/gmi, '');
const db = new DatabaseSync(process.env.DATABASE_PATH || './data/impulsa.db');
db.exec('BEGIN IMMEDIATE');
try {
 for (const t of ['records', 'users', 'sessions', 'counters', 'audit', 'attempts']) db.exec('DELETE FROM ' + t);
 db.exec(sql);
 db.exec('COMMIT');
} catch (e) { db.exec('ROLLBACK'); throw e; }
rmSync(file, { force: true });
console.log('db:pull done');
