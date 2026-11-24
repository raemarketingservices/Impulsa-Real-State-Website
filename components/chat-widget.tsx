'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';
import { api } from './ui';

type Agent = { id: string; name: string; slug: string; city: string; image: string; whatsapp: string };
type Msg = { role: 'user' | 'assistant'; content: string; error?: boolean; handoff?: Agent[] };
const chips = ['¿Qué hay disponible en Santiago?', 'Opciones para alquilar', 'Busco casa de 3 habitaciones hasta US$300.000', 'Quiero hablar con un asesor'];

export default function ChatWidget({ settings }: { settings: Record<string, any> }) {
 const [open, setOpen] = useState(false);
 const [msgs, setMsgs] = useState<Msg[]>([]);
 const [text, setText] = useState('');
 const [busy, setBusy] = useState(false);
 const log = useRef<HTMLDivElement>(null);
 useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [msgs, busy, open]);

 async function ask(question: string) {
  const q = question.trim();
  if (!q || busy) return;
  const history: Msg[] = [...msgs.filter(m => !m.error), { role: 'user', content: q }];
  setMsgs(history); setText(''); setBusy(true);
  try { const r = await api('chat', { messages: history.map(m => ({ role: m.role, content: m.content })) }); setMsgs(h => [...h, { role: 'assistant', content: r.reply, handoff: r.handoff }]); }
  catch (e) { setMsgs(h => [...h, { role: 'assistant', content: (e as Error).message, error: true }]); }
  finally { setBusy(false); }
 }

 const waLink = (a: Agent) => a.whatsapp ? 'https://wa.me/' + a.whatsapp + '?text=' + encodeURIComponent(String(settings.whatsappTemplate).replace('{agente}', a.name).replace('{propiedad}', 'una propiedad').replace('{codigo}', '')) : '/agentes/' + a.slug;
 const last = msgs[msgs.length - 1];
 const handoff: Agent[] = last && last.role === 'assistant' && !last.error && !busy
  ? last.handoff?.length ? last.handoff : (String(settings.whatsapp).replace(/\D/g, '') ? [{ id: 'team', name: (settings.name || 'Impulsa Real Estate') + ' · equipo', slug: 'agentes', city: '', image: '/images/logo-mark-gold.png', whatsapp: String(settings.whatsapp).replace(/\D/g, '') }] : [])
  : [];

 return <>
  {open && <section className="chat-panel" role="dialog" aria-label="Asistente de propiedades">
   <header className="chat-head"><img src="/images/logo-mark-gold.png" alt=""/><div><strong>Asistente Impulsa</strong><small>{settings.slogan || 'Te ayudamos a encontrar tu próxima propiedad.'}</small></div><button className="icon-button" aria-label="Cerrar chat" onClick={() => setOpen(false)}><X size={19}/></button></header>
   <div className="chat-log" ref={log}>
    <p className="chat-msg bot">{`Hola. Soy el asistente de ${settings.name || 'Impulsa Real Estate'}. Cuéntame qué buscas —ciudad, presupuesto, tipo de propiedad— y te muestro opciones reales de nuestra cartera.`}</p>
    {msgs.map((m, i) => <p key={i} className={'chat-msg ' + m.role + (m.error ? ' err' : '')}>{m.content}</p>)}
    {busy && <p className="chat-typing">Buscando entre nuestras propiedades…</p>}
    {handoff.length > 0 && <div className="chat-handoff"><p>ACOMPAÑAMIENTO HUMANO</p>{handoff.map(a => <a key={a.id} target="_blank" rel="noreferrer" href={waLink(a)}>{a.image && <img src={a.image} alt=""/>}{a.name.split(' ')[0]} por WhatsApp{a.city && <span>{a.city}</span>}</a>)}</div>}
   </div>
   {!msgs.length && <div className="chat-chips">{chips.map(c => <button key={c} onClick={() => ask(c)}>{c}</button>)}</div>}
   <form className="chat-form" onSubmit={e => { e.preventDefault(); ask(text); }}><textarea rows={2} aria-label="Escribe tu pregunta" placeholder="Escribe tu pregunta…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(text); } }}/><button className="button gold" disabled={busy || !text.trim()} aria-label="Enviar pregunta"><Send size={16}/></button></form>
  </section>}
  <button className="chat-launcher" onClick={() => setOpen(!open)} aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de propiedades'} aria-expanded={open}>{open ? <X size={22}/> : <img src="/images/logo-mark-gold.png" alt=""/>}<span><MessageCircle size={13}/> ¿Te ayudamos?</span></button>
 </>;
}
