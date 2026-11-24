'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="not-found"><h1>No pudimos cargar este espacio.</h1><p>Tus datos guardados siguen disponibles. Intenta nuevamente.</p><button className="button gold" onClick={reset}>Volver a intentar</button></main>;}
