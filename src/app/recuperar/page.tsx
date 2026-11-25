import { AuthForm } from "@/components/auth-form";
import { backendConfigured } from "@/lib/env";
export default function Recover(){return <div className="form-shell"><h1>Recuperar acesso</h1><p>Informe seu e-mail para receber as instruções.</p><AuthForm mode="recover" configured={backendConfigured()}/></div>}
