export type RecordData = { id: string; [key: string]: any };
export type User = { id: string; name: string; email: string; role: 'super_admin' | 'admin' | 'agent'; agentId: string };
export const stages = ['Nuevo','Contactado','Calificado','Visita programada','Visitó','Negociación','Reservó','Cerrado ganado','Cerrado perdido','Seguimiento futuro'];
export const statuses = ['Borrador','En revisión','Disponible','Reservada','Vendida','Alquilada','Inactiva','Archivada'];
export const money = (n: number, currency = 'USD') => new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:0}).format(n).replace('$','US$ ');
export const slugify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
