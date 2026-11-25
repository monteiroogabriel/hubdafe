"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="container page empty"><h1>Não foi possível carregar</h1><p>Verifique sua conexão e tente novamente. Seus dados não foram alterados.</p><button className="primary" onClick={reset}>Tentar novamente</button></div>}
