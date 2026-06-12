/**
 * Emblema Spear: escudo espartano con lanza ascendente y la estrella del
 * casco de las mascotas. Reinterpretación corporativa de la identidad
 * "somos guerreros" — vector propio, escalable y a juego con la paleta.
 */
export function EmblemaSpear({
  className = "h-9 w-9",
  tono = "claro",
}: {
  className?: string;
  tono?: "claro" | "oscuro";
}) {
  const escudo = tono === "claro" ? "#1b4fd8" : "#0d1b2e";
  const borde = tono === "claro" ? "#ffffff" : "#1b4fd8";
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden="true">
      {/* Escudo */}
      <path
        d="M24 1.5 45 9v19.2c0 12.4-8.6 21.4-21 25.8C11.6 49.6 3 40.6 3 28.2V9L24 1.5Z"
        fill={escudo}
      />
      <path
        d="M24 5.7 41 11.8v16.4c0 10.3-7 17.9-17 21.8C14 46.1 7 38.5 7 28.2V11.8L24 5.7Z"
        fill="none"
        stroke={borde}
        strokeOpacity="0.35"
        strokeWidth="1.4"
      />
      {/* Lanza ascendente */}
      <path
        d="M24 10.5 31 23h-4.6v17.5h-4.8V23H17L24 10.5Z"
        fill="#ffffff"
      />
      {/* Estrella del casco */}
      <path
        d="m24 42.2 1.5 2.6h3l-1.5 2.6 1.5 2.6h-3L24 52.6l-1.5-2.6h-3l1.5-2.6-1.5-2.6h3L24 42.2Z"
        fill="#e8b931"
        transform="translate(0 -3)"
      />
    </svg>
  );
}

/** Hexágono decorativo de la web de Spear, para atmósfera flotante. */
export function Hexagono({
  className = "h-6 w-6",
  color = "rgba(255,255,255,0.08)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 1.5 21.5 7v10L12 22.5 2.5 17V7L12 1.5Z"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
      />
    </svg>
  );
}
