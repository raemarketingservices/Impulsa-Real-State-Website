'use client';
import Link from 'next/link';
import Image from 'next/image';
import {X,ArrowUpRight,House,ChevronDown} from 'lucide-react';
import {useEffect,useRef} from 'react';
export function Logo({light=false}:{light?:boolean}){return <Link href="/" className={'brand '+(light?'light':'')} aria-label="Impulsa Real Estate, inicio"><Image src={light?'/images/logo-mark-gold.png':'/images/logo-mark.png'} alt="" width={955} height={604} priority/><span>IMPULSA<small>REAL ESTATE</small></span></Link>;}
export function Arrow({size=18}:{size?:number}){return <ArrowUpRight size={size}/>;}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current;d?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[]);return <dialog ref={ref} className="modal" onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}}><header><h3>{title}</h3><button onClick={onClose} className="icon-button" aria-label="Cerrar"><X size={21}/></button></header>{children}</dialog>;}
export function Field({label,children,className=''}:{label:string;children:React.ReactNode;className?:string}){return <label className={'field '+className}><span>{label}</span>{children}</label>;}
export function Empty({title='No encontramos exactamente lo que buscas.',children}:{title?:string;children?:React.ReactNode}){return <div className="empty"><House size={36}/><h3>{title}</h3>{children}</div>;}
export async function api(path:string,body?:unknown,method='POST'){const res=await fetch('/api/'+path,body===undefined?{cache:'no-store'}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(data.error||'No se pudo completar la solicitud.');return data;}
