import {all} from '@/lib/db';
export const dynamic='force-dynamic';
export default async function sitemap(){const base=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:7007';return [...['','/propiedades','/agentes','/nosotros','/proyectos','/unete','/contacto'].map(p=>({url:base+p,lastModified:new Date()})),...(await all('properties')).filter(p=>p.state==='Disponible').map(p=>({url:base+'/propiedades/'+p.slug,lastModified:new Date(p.createdAt)}))];}
