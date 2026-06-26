/**
 * Identidad Spear Contact en vector propio.
 * - LogoSpear: recreación fiel del logo (SPEAR atravesado por la lanza azul,
 *   CONTACT debajo) para usarlo sobre fondo claro u oscuro sin fondo blanco.
 * - CascoGuerrero: la mascota espartana reinterpretada — casco corintio de
 *   perfil con cresta de cerdas y la estrella dorada de la frente.
 */

export function LogoSpear({
  className = "h-10 w-auto",
  tono = "claro",
}: {
  className?: string;
  tono?: "claro" | "oscuro";
}) {
  const letra = tono === "claro" ? "#ffffff" : "#3d4348";
  const azul = tono === "claro" ? "#3b6cf0" : "#1b4fd8";
  return (
    <svg viewBox="0 0 300 96" className={className} aria-label="Spear Contact">
      <text
        x="20"
        y="58"
        fontFamily="var(--font-dm-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="56"
        letterSpacing="2"
        fill={letra}
      >
        SPEAR
      </text>
      {/* Lanza que atraviesa el nombre */}
      <rect x="0" y="36" width="232" height="7" fill={azul} />
      <path d="M226 26 268 39.5 226 53 236 39.5Z" fill={azul} />
      <text
        x="222"
        y="82"
        textAnchor="end"
        fontFamily="var(--font-dm-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="22"
        letterSpacing="3"
        fill={azul}
      >
        CONTACT
      </text>
    </svg>
  );
}

/**
 * Logo que cobra vida: las letras suben, la lanza se traza, la punta se
 * dispara y un destello recorre el asta en bucle. Misma geometría que
 * LogoSpear — las clases logo-* viven en globals.css.
 */
export function LogoSpearAnimado({
  className = "h-12 w-auto",
  tono = "claro",
}: {
  className?: string;
  tono?: "claro" | "oscuro";
}) {
  const letra = tono === "claro" ? "#ffffff" : "#3d4348";
  const azul = tono === "claro" ? "#3b6cf0" : "#1b4fd8";
  return (
    <svg viewBox="0 0 300 96" className={className} aria-label="Spear Contact">
      <text
        className="logo-letras"
        x="20"
        y="58"
        fontFamily="var(--font-dm-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="56"
        letterSpacing="2"
        fill={letra}
      >
        SPEAR
      </text>
      <rect className="logo-lanza-asta" x="0" y="36" width="232" height="7" fill={azul} />
      <path className="logo-lanza-punta" d="M226 26 268 39.5 226 53 236 39.5Z" fill={azul} />
      <rect
        className="logo-brillo"
        x="0"
        y="36"
        width="34"
        height="7"
        rx="3"
        fill="rgba(255,255,255,0.8)"
      />
      <text
        className="logo-contact"
        x="222"
        y="82"
        textAnchor="end"
        fontFamily="var(--font-dm-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="22"
        letterSpacing="3"
        fill={azul}
      >
        CONTACT
      </text>
    </svg>
  );
}

/**
 * Marca de agua de fondo: el logo Spear gigante y muy tenue, con un PULSO DE LUZ
 * que recorre el asta de la lanza (de cola a punta) en bucle. El logo usa
 * currentColor a baja opacidad; el destello lleva su propio degradado brillante,
 * así la luz "viaja dentro de la flecha" sin que el watermark estorbe la lectura.
 */
export function MarcaFondo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 96"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* La luz se recorta a la unión asta + punta: viaja por el asta como una
            franja fina y enciende toda la cabeza de flecha al llegar a la punta. */}
        <clipPath id="marca-fondo-lanza">
          <rect x="0" y="36" width="232" height="7" />
          <path d="M226 26 268 39.5 226 53 236 39.5Z" />
        </clipPath>
        <linearGradient id="marca-fondo-luz-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(150,185,255,0)" />
          <stop offset="45%" stopColor="rgba(190,212,255,1)" />
          <stop offset="55%" stopColor="rgba(190,212,255,1)" />
          <stop offset="100%" stopColor="rgba(150,185,255,0)" />
        </linearGradient>
        <filter id="marca-fondo-halo" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* Halo claro detrás del logo: el fondo de las letras se ve más blanco */}
      <ellipse cx="140" cy="50" rx="160" ry="44" fill="rgba(255,255,255,0.06)" filter="url(#marca-fondo-halo)" />

      {/* Dos tonos del logo real: SPEAR blanco, lanza y CONTACT en azul de marca */}
      <text
        x="20"
        y="58"
        fontFamily="var(--font-dm-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="56"
        letterSpacing="2"
        fill="#ffffff"
        opacity="0.34"
      >
        SPEAR
      </text>
      <g fill="#3b6cf0" opacity="0.55">
        <rect x="0" y="36" width="232" height="7" />
        <path d="M226 26 268 39.5 226 53 236 39.5Z" />
      </g>
      <text
        x="222"
        y="82"
        textAnchor="end"
        fontFamily="var(--font-dm-sans), system-ui, sans-serif"
        fontWeight="800"
        fontSize="22"
        letterSpacing="3"
        fill="#3b6cf0"
        opacity="0.55"
      >
        CONTACT
      </text>

      {/* Pulso de luz que recorre la lanza hasta la punta */}
      <g clipPath="url(#marca-fondo-lanza)">
        <rect
          className="marca-fondo-luz"
          x="0"
          y="24"
          width="70"
          height="48"
          fill="url(#marca-fondo-luz-grad)"
        />
      </g>
    </svg>
  );
}

/** La lanza de la marca, sola — para divisores y lanzas en vuelo. */
export function LanzaSpear({
  className = "h-3 w-auto",
  color = "#3b6cf0",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 240 18" className={className} aria-hidden="true">
      <rect x="0" y="7" width="196" height="4" rx="2" fill={color} />
      <path d="M192 2 234 9 192 16 200 9Z" fill={color} />
    </svg>
  );
}

/** Lanzas que cruzan la pantalla en bucle, como proyectiles de fondo. */
export function LanzasVoladoras({
  lanzas,
  className = "",
}: {
  lanzas: {
    top: string;
    duracion: number;
    retraso?: number;
    ancho?: string;
    color?: string;
  }[];
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {lanzas.map((l, i) => (
        <div
          key={i}
          className="lanza-vuela absolute left-0"
          style={{
            top: l.top,
            animationDuration: `${l.duracion}s`,
            animationDelay: `${l.retraso ?? 0}s`,
          }}
        >
          <LanzaSpear
            className={l.ancho ?? "h-auto w-40"}
            color={l.color ?? "rgba(91,140,255,0.45)"}
          />
        </div>
      ))}
    </div>
  );
}

export function CascoGuerrero({
  className = "h-24 w-24",
  tono = "claro",
  animado = false,
}: {
  className?: string;
  tono?: "claro" | "oscuro";
  /** true: la mirada se enciende y la estrella destella */
  animado?: boolean;
}) {
  const casco = tono === "claro" ? "#1b4fd8" : "#143ba6";
  const ojo = "#0d1b2e";
  const cresta = tono === "claro" ? "#aeb6c2" : "#8d96a5";
  const crestaSombra = tono === "claro" ? "#7f8896" : "#666f7d";
  return (
    <svg viewBox="0 0 120 132" className={className} aria-hidden="true">
      {/* Cresta: cepillo de cerdas sobre el domo */}
      <g>
        {[
          [36, 16, -18],
          [44, 11, -11],
          [52, 8, -4],
          [60, 8, 4],
          [68, 11, 11],
          [76, 16, 18],
        ].map(([x, y, rot], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width="7"
            height="32"
            rx="3"
            fill={i % 2 === 0 ? cresta : crestaSombra}
            transform={`rotate(${rot} ${(x as number) + 3.5} ${(y as number) + 16})`}
          />
        ))}
        <path d="M34 46 Q60 28 86 46 L83 54 Q60 38 37 54 Z" fill={crestaSombra} />
      </g>
      {/* Domo y carrilleras en una sola pieza */}
      <path
        d="M60 36 C37 36 25 53 25 76 L25 100 C25 112 33 119 43 123 L50 126 C52 127 54 126 54 123 L54 112 L66 112 L66 123 C66 126 68 127 70 126 L77 123 C87 119 95 112 95 100 L95 76 C95 53 83 36 60 36 Z"
        fill={casco}
      />
      {/* Aberturas corintias: ojos y ranura nasal */}
      <path d="M37 86 Q45 79 53 86 Q45 94 37 86 Z" fill={ojo} />
      <path d="M67 86 Q75 79 83 86 Q75 94 67 86 Z" fill={ojo} />
      <rect x="55.5" y="96" width="9" height="18" rx="3.5" fill={ojo} />
      {animado && (
        <g className="casco-mirada" fill="#9cc4ff">
          <path d="M39 86 Q45 81.5 51 86 Q45 91 39 86 Z" />
          <path d="M69 86 Q75 81.5 81 86 Q75 91 69 86 Z" />
        </g>
      )}
      {/* Brillo del domo */}
      <path
        d="M33 76 C35 62 43 51 55 47 C45 53 38 64 36 77 Z"
        fill="rgba(255,255,255,0.30)"
      />
      {/* Estrella de la frente (la marca de las mascotas) */}
      <path
        className={animado ? "casco-estrella" : undefined}
        d="m60 56 2.4 4.2h4.8l-2.4 4.2 2.4 4.2h-4.8L60 73l-2.4-4.2h-4.8l2.4-4.2-2.4-4.2h4.8Z"
        fill="#e8b931"
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
