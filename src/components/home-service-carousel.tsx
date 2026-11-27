"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Category } from "@/types/domain";

const serviceImages: Record<string, string> = {
  "casa-e-manutencao": "casa-e-manutencao",
  "construcao-e-reformas": "construcao-e-reformas",
  "limpeza-e-organizacao": "limpeza-e-organizacao",
  "beleza-e-cuidados-pessoais": "beleza-e-cuidados-pessoais",
  alimentacao: "alimentacao",
};

export function HomeServiceCarousel({ categories }: { categories: Category[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(categories.length > 1);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    function updateControls() {
      if (!element) return;
      setCanGoBack(element.scrollLeft > 2);
      setCanGoForward(element.scrollLeft + element.clientWidth < element.scrollWidth - 2);
    }
    updateControls();
    element.addEventListener("scroll", updateControls, { passive: true });
    const observer = new ResizeObserver(updateControls);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", updateControls);
      observer.disconnect();
    };
  }, [categories.length]);

  function move(direction: -1 | 1) {
    const element = track.current;
    const card = element?.firstElementChild;
    if (!element || !(card instanceof HTMLElement)) return;
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return (
    <section className="home-popular" aria-label="Principais serviços">
      <div className="home-popular-heading">
        <div><p className="home-label">O que você está procurando?</p><h2>Principais serviços</h2></div>
        <div className="home-carousel-controls">
          <button type="button" aria-label="Serviços anteriores" aria-controls="home-services" disabled={!canGoBack} onClick={() => move(-1)}><ArrowLeft size={19} aria-hidden="true" /></button>
          <button type="button" aria-label="Próximos serviços" aria-controls="home-services" disabled={!canGoForward} onClick={() => move(1)}><ArrowRight size={19} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="home-carousel" id="home-services" ref={track}>
        {categories.slice(0, 5).map(category => {
          const image = serviceImages[category.slug];
          return (
            <Link className="home-service-card" href={`/profissionais?${new URLSearchParams({ categoria: category.slug })}`} key={category.slug} aria-label={`Encontrar profissionais de ${category.name}`}>
              <div className={`home-service-photo${image ? "" : " home-service-photo-fallback"}`}>
                <Image src={image ? `/images/services/${image}.webp` : "/brand/hub-da-fe.png"} alt="" width={800} height={500} loading="lazy" />
              </div>
              <div className="home-service-content">
                <div><span className="home-service-kicker">Serviço</span><strong>{category.name}</strong></div>
                <span className="home-service-arrow"><ArrowRight size={20} aria-hidden="true" /></span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="home-directory-cta"><Link className="button home-directory-button" href="/profissionais">Ver mais <ArrowRight size={18} aria-hidden="true" /></Link></div>
    </section>
  );
}
