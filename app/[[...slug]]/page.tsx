import { cookies } from 'next/headers';
import { redirect,notFound } from 'next/navigation';
import { all, sessionUser,localAccess } from '@/lib/db';
import PublicSite from '@/components/public-site';
import Workspace from '@/components/workspace';
import Login from '@/components/login';
import { slugify } from '@/lib/types';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug?:string[]}>}){const {slug=[]}=await params;const settings=(await all('settings'))[0];const profile=slug[0]==='agentes'&&slug[1]?(await all('agents')).find(a=>a.slug===slug[1]&&a.active):null;const property=slug[0]==='propiedades'&&slug[1]?(await all('properties')).find(p=>p.slug===slug[1]&&['Disponible','Reservada'].includes(p.state)):null;if(profile)return {title:profile.name+' | Asesor inmobiliario',description:profile.bio,openGraph:{images:[profile.image]}};if(!slug.length)return {title:settings.metaTitle,description:settings.metaDescription,openGraph:{images:[settings.heroImage]}};return property?{title:property.title,description:property.description,openGraph:{images:property.images}}:{title:slug.length?({propiedades:'Encuentra tu próxima propiedad',agentes:'Personas que impulsan tu futuro',nosotros:'Conoce Impulsa',unete:'Impulsa tu carrera inmobiliaria',admin:'Administración',portal:'Mi portal',login:'Acceso privado'} as Record<string,string>)[slug[0]]||'Tu próxima oportunidad':'Impulsa Real Estate | Propiedades que impulsan tu futuro'};}
export default async function Page({params}:{params:Promise<{slug?:string[]}>}){const {slug=[]}=await params;const user=await sessionUser((await cookies()).get('impulsa_session')?.value);
 if(slug[0]==='login')return <Login local={await localAccess()}/>;
 if(['admin','portal'].includes(slug[0])){if(!user)redirect('/login');if(slug[0]==='admin'&&user.role==='agent')redirect('/portal');return <Workspace key={slug.join('/')} user={user} section={slug[1]||'dashboard'} base={slug[0]}/>;}
 if(slug[0]==='training')redirect('/portal/training');
 const valid=['propiedades','comprar','alquilar','proyectos','nosotros','agentes','administracion-propiedades','vende-tu-propiedad','unete','contacto','encuentra-tu-propiedad','privacidad'];if(slug.length&&!valid.includes(slug[0]))notFound();
 const properties=(await all('properties')).filter(p=>['Disponible','Reservada'].includes(p.state)).map(({ownerId,...p})=>p as any);const agents=(await all('agents')).filter(a=>a.active);const locations=await all('locations');
 if(slug[0]==='propiedades'&&slug[1]&&!properties.find(p=>p.slug===slug[1])&&!locations.find(l=>slugify(l.name)===slug[1]))notFound();if(slug[0]==='agentes'&&slug[1]&&!agents.find(a=>a.slug===slug[1]))notFound();
 const schema={'@context':'https://schema.org','@type':'RealEstateAgent',name:'Impulsa Real Estate',url:process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:7007',areaServed:'República Dominicana'};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/><PublicSite key={slug.join('/')} path={slug} properties={properties} agents={agents} locations={locations} projects={await all('projects')} settings={(await all('settings'))[0]}/></>;
}
