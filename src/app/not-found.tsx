import Link from "next/link";
export default function NotFound(){return <div className="container page empty"><h1>Página indisponível</h1><p>Este perfil pode ter sido retirado da vitrine de profissionais ou o endereço não existe.</p><Link className="button" href="/profissionais">Encontrar profissionais</Link></div>}
