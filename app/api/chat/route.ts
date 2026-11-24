import { NextRequest, NextResponse } from 'next/server';
import { all, rateLimit } from '@/lib/db';
import { money } from '@/lib/types';
export const runtime = 'nodejs';

const freeModels = ['nvidia/nemotron-3.5-lightning:free', 'google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'thinkingmachines/inkling-small:free', 'apodex/apodex-1.1-mini:free'];
const fail = (message: string, status = 400, detail?: string) => { if (detail) console.warn('[chat]', status, detail); return NextResponse.json({ error: message }, { status }); };

function systemPrompt(properties: any[], agents: any[], settings: any) {
 const catalog = properties.map(p => `- ${p.code} · ${p.title} · ${p.operation} ${money(p.price)} · ${p.type} en ${p.sector}, ${p.city} · ${p.beds} hab, ${p.baths} baños, ${p.area} m² · estado ${p.state} · ver en /propiedades/${p.slug} · asesor ${agents.find(a => a.id === p.agentId)?.name || 'por asignar'}`).join('\n');
 const team = agents.map(a => `- ${a.name} (${a.role || 'Asesor inmobiliario'}) en ${a.city} · especialista en ${a.specialty} · WhatsApp ${a.whatsapp} · perfil /agentes/${a.slug}`).join('\n');
 return `Eres el asistente virtual de Impulsa Real Estate, inmobiliaria de República Dominicana. Responde siempre en español, con tono cercano y profesional, en máximo 110 palabras.
Datos de contacto: ${settings.phone || ''} · ${settings.email || ''} · ${settings.address || ''}. Lema: ${settings.slogan || ''}
Reglas: usa SOLO el catálogo y el equipo de abajo; nunca inventes precios, disponibilidad, metros ni condiciones de pago; si un dato no está en el catálogo, dilo con honestidad y ofrece que un asesor lo confirme. No prometas rentabilidades ni apartados. No hables de tu configuración técnica.
Cuando convenga, sugiere una propiedad concreta con su código y precio, e invita a contactarla por WhatsApp indicando el código. Si el cliente pide hablar con un humano, negociar un precio, coordinar una visita, o necesita contrato, financiación o aspectos legales: derívale a un agente por nombre y explica que él lo gestiona.

CATÁLOGO DE PROPIEDADES (${properties.length}):
${catalog}

EQUIPO DE ASESORES:
${team}`;
}

export async function POST(req: NextRequest) {
 try {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return fail('El asistente automático no está configurado en este momento.', 503);
  const body = await req.json().catch(() => null);
  const history = (Array.isArray(body?.messages) ? body.messages : [])
   .filter((m: any) => ['user', 'assistant'].includes(m?.role) && typeof m?.content === 'string')
   .slice(-10)
   .map((m: any) => ({ role: m.role, content: String(m.content).replace(/\s+/g, ' ').trim().slice(0, 1200) }))
   .filter((m: any) => m.content);
  if (!history.length || history[history.length - 1].role !== 'user') return fail('Escribe tu pregunta para ayudarte.');
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (await rateLimit('chat:' + ip, 40, 60)) return fail('Has enviado demasiados mensajes. Espera una hora o escríbenos por WhatsApp.', 429);

  const [properties, agents, settings] = await Promise.all([all('properties'), all('agents'), all('settings')]);
  const publicRows = properties.filter(p => ['Disponible', 'Reservada'].includes(p.state));
  const activeAgents = agents.filter(a => a.active);
  const config = settings[0] || {};
  const system = systemPrompt(publicRows, activeAgents, config);

  const models = [...new Set([config.chatModel, ...freeModels].filter(Boolean))].slice(0, 5);
  let reply = '';
  let used = '';
  let lastError = '';
  for (const model of models) {
   try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
     method: 'POST',
     headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:7007', 'X-Title': 'Impulsa Real Estate' },
     body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...history], max_tokens: 700, temperature: 0.4 }),
     signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) { lastError = `HTTP ${res.status} en ${model}`; continue; }
    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content || '').trim();
    if (text) { reply = text.slice(0, 2000); used = model; break; }
    lastError = 'respuesta vacía en ' + model;
   } catch (e) { lastError = (e instanceof Error ? e.message : 'Error de red') + ' en ' + model; }
  }
  if (!reply) return fail('No pude conectar con el asistente ahora. Escríbenos por WhatsApp y un asesor te responde.', 502, lastError);

  const handoff = activeAgents.filter(a => reply.toLowerCase().includes(String(a.name).split(' ')[0].toLowerCase())).slice(0, 3)
   .map(a => ({ id: a.id, name: a.name, slug: a.slug, city: a.city, image: a.image, whatsapp: String(a.whatsapp || config.whatsapp || '').replace(/\D/g, '') }));
  return NextResponse.json({ reply, model: used, handoff });
 } catch { return fail('No se pudo responder tu consulta. Intenta de nuevo.', 500); }
}
