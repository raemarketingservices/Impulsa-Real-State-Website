import { readFileSync } from 'node:fs';

const BASE = 'https://impulsa-real-estate.aqui-rd.workers.dev';
const creds = JSON.parse(readFileSync('data/local-access.json', 'utf8'));
const cookie = { value: '' };

function capture(res) {
  const sc = res.headers.getSetCookie?.() || [];
  const sess = sc.find(c => c.startsWith('impulsa_session='));
  if (sess) cookie.value = sess.split(';')[0];
}

// Minimal valid 1x1 JPEG
const jpg = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc' +
  'DyQqJCwkLCUsLSYwNDBAPDQyLC0wNDI/PDUyN//AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAB' +
  'AQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKC' +
  'CQoWFxgZGiUmJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqj' +
  'pQSqLqWoZaepo6mpoqinpqkErK6lpKYEp6ikpQjZKqkAAAD/2Q==',
  'base64'
);

const checks = [];
const ok = (name, cond, extra = '') => checks.push([name, !!cond, extra]);

async function main() {
  // 1. login
  let res = await fetch(BASE + '/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(creds.admin),
  });
  capture(res);
  const loginJson = await res.json().catch(() => ({}));
  ok('login 200', res.status === 200 && loginJson.user, 'status=' + res.status);
  ok('session cookie set', cookie.value.startsWith('impulsa_session='));

  const auth = { cookie: cookie.value };

  // 2. me
  res = await fetch(BASE + '/api/me', { headers: auth });
  const me = await res.json().catch(() => ({}));
  ok('me authenticated', res.status === 200 && me.user?.role, 'role=' + (me.user?.role));

  // 3. upload jpeg -> R2
  const fd = new FormData();
  fd.append('file', new Blob([jpg], { type: 'image/jpeg' }), 'test-live.jpg');
  fd.append('category', 'property-images');
  res = await fetch(BASE + '/api/upload', { method: 'POST', headers: auth, body: fd });
  const up = await res.json().catch(() => ({}));
  ok('upload 200', res.status === 200 && up.id, 'status=' + res.status + ' body=' + JSON.stringify(up).slice(0, 160));
  const fileId = up.id;
  const fileUrl = up.url;

  // 4. read back via /api/media (public path needs property published; use download for owner)
  res = await fetch(BASE + '/api/download/' + fileId, { headers: auth });
  const buf = Buffer.from(await res.arrayBuffer());
  ok('read-back 200', res.status === 200, 'status=' + res.status);
  ok('read-back bytes match', res.status === 200 && buf.length === jpg.length, 'got=' + buf.length + ' want=' + jpg.length);
  ok('read-back mime', (res.headers.get('content-type') || '') === 'image/jpeg', res.headers.get('content-type'));

  // 5. file record persisted in D1
  res = await fetch(BASE + '/api/files', { headers: auth });
  const files = await res.json().catch(() => []);
  const found = Array.isArray(files) && files.some(f => f.id === fileId);
  ok('file row in D1', found, 'files=' + (Array.isArray(files) ? files.length : typeof files));

  let pass = 0;
  for (const [name, o, extra] of checks) {
    console.log((o ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  [' + extra + ']' : ''));
    if (o) pass++;
  }
  console.log('\n' + pass + '/' + checks.length + ' passed. Uploaded file: ' + fileId + ' url=' + fileUrl);
  if (pass !== checks.length) process.exit(1);
}
main().catch(e => { console.error('ERROR', e); process.exit(1); });
