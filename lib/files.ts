import { cfEnv, isCloudflare } from './db';

export async function saveFile(id: string, bytes: Uint8Array): Promise<void> {
 const env = await cfEnv();
 if (isCloudflare() && !env?.FILES) throw new Error('R2 binding FILES unavailable (env keys: ' + Object.keys(env || {}).join(',') + ')');
 if (env?.FILES) { await env.FILES.put(id, bytes, { httpMetadata: { contentType: 'application/octet-stream' } }); return; }
 const { mkdirSync, writeFileSync } = await import('node:fs');
 const { join } = await import('node:path');
 mkdirSync('./data/uploads', { recursive: true });
 writeFileSync(join('./data/uploads', id), bytes);
}

export async function readFile(id: string): Promise<Uint8Array | null> {
 const env = await cfEnv();
 if (env?.FILES) {
  const object = await env.FILES.get(id);
  if (!object) return null;
  return new Uint8Array(await object.arrayBuffer());
 }
 const { existsSync, readFileSync } = await import('node:fs');
 const { join } = await import('node:path');
 const path = join('./data/uploads', id);
 return existsSync(path) ? new Uint8Array(readFileSync(path)) : null;
}
