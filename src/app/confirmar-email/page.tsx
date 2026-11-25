import Link from "next/link";

export const metadata = { title: "Confirme seu e-mail", robots: { index: false, follow: false } };

export default function ConfirmEmail() {
  return (
    <div className="form-shell">
      <p className="eyebrow">Falta só mais um passo</p>
      <h1>Confirme seu e-mail.</h1>
      <p>Para um endereço ainda não cadastrado, o HUB envia uma mensagem de confirmação.</p>
      <p className="fine">Se você já confirmou este mesmo e-mail ao testar o HUB em outro ambiente, sua conta já está ativa. Basta entrar.</p>
      <ol>
        <li>Abra a mensagem enviada pelo Supabase Auth com o assunto “Confirm your email address”.</li>
        <li>Toque em “Confirm email address” para ativar sua conta.</li>
        <li>Depois da confirmação, volte ao HUB da Fé e entre com seu e-mail e senha.</li>
      </ol>
      <p className="fine">Não encontrou a mensagem? Confira a pasta de spam. Antes de confirmar, o acesso à conta fica bloqueado.</p>
      <Link className="button primary" href="/entrar" style={{ width: "100%", marginTop: 18 }}>Ir para entrar</Link>
      <p style={{ marginTop: 20 }}>Usou outro endereço? <Link href="/cadastro">Tente novamente</Link></p>
    </div>
  );
}
