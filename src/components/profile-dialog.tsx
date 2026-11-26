"use client";

import { useEffect, useRef } from "react";
import { UserRound, X } from "lucide-react";

export function ProfileDialog({ children, autoOpen=false }: { children: React.ReactNode; autoOpen?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(()=>{if(autoOpen)dialog.current?.showModal();},[autoOpen]);

  return (
    <>
      <section className="dashboard-tile profile-entry">
        <span className="tile-icon"><UserRound aria-hidden="true" /></span>
        <h2>Apresente seus serviços</h2>
        <p>Preencha suas informações e envie para a liderança avaliar. Você pode fechar a janela e continuar de onde parou enquanto estiver nesta página.</p>
        <button className="primary" onClick={() => dialog.current?.showModal()}>Editar perfil</button>
      </section>
      <dialog className="profile-dialog" ref={dialog} aria-labelledby="profile-dialog-title">
        <div className="profile-dialog-header">
          <h2 id="profile-dialog-title">Meu perfil de prestador</h2>
          <button className="subtle-button" aria-label="Fechar formulário" onClick={() => dialog.current?.close()}><X size={20} /></button>
        </div>
        <div className="profile-dialog-body">{children}</div>
      </dialog>
    </>
  );
}
