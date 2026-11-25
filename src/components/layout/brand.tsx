import Image from "next/image";
import Link from "next/link";

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Image src="/brand/hub-da-fe.png" alt="" width={size} height={size} />
    </span>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="wordmark" href={href} aria-label={href === "/" ? "HUB da Fé, início" : "HUB da Fé, meu painel"}>
      <BrandMark />
      <span>HUB <em>da Fé</em></span>
    </Link>
  );
}
