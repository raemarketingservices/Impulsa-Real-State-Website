import type { Metadata } from 'next';
import './globals.css';
import { all } from '@/lib/db';
import { themeCss, fontStylesheet } from '@/lib/theme';
export const dynamic='force-dynamic';
export const metadata: Metadata={title:{default:'Impulsa Real Estate | Propiedades que impulsan tu futuro',template:'%s | Impulsa Real Estate'},description:'Encuentra tu próximo hogar e invierte en las mejores zonas de República Dominicana.',metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:7007'),openGraph:{type:'website',locale:'es_DO',siteName:'Impulsa Real Estate',images:['/images/hero.jpg']}};
export default async function Layout({children}:{children:React.ReactNode}){const settings=((await all('settings').catch(()=>[]))[0]||{}) as Record<string,any>;const fonts=fontStylesheet(settings);return <html lang="es"><body>{fonts&&<link rel="stylesheet" href={fonts}/>}<style dangerouslySetInnerHTML={{__html:themeCss(settings)}}/>{children}</body></html>;}
