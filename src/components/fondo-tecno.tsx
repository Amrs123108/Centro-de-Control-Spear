"use client";

import { useTema } from "@/components/tema";

/**
 * Fondo tecnológico del tema Vidrio: una placa de circuito (PCB) con ruteo real,
 * pads y chips, sobre la que viajan CARGAS DE ENERGÍA a lo largo de las trazas.
 * Cada carga lleva un glow fuerte: al pasar por detrás del cristal, lo ilumina.
 * Más unos blobs de luz ambiental que derivan lento. Solo se monta en "vidrio".
 *
 * Lienzo en viewBox 1600×1000, recortado para cubrir cualquier pantalla.
 */

// Rutas por las que fluye la energía (ortogonales con esquinas redondeadas).
const ENERGIA = [
  { d: "M-60 130 H260 Q300 130 300 170 V300 Q300 340 340 340 H720 Q760 340 760 380 V470 H1660", dur: "5s", delay: "0s" },
  { d: "M-60 800 H320 Q360 800 360 760 V600 Q360 560 400 560 H940 Q980 560 980 600 V700 H1320 Q1360 700 1360 660 V470 H1660", dur: "6.4s", delay: "1.2s" },
  { d: "M860 -60 V120 Q860 160 900 160 H1180 Q1220 160 1220 200 V470 H1660", dur: "4.6s", delay: "2.3s" },
  { d: "M-60 460 H140 Q180 460 180 500 V640 Q180 680 220 680 H520 Q560 680 560 720 V1060", dur: "5.8s", delay: "0.6s" },
  { d: "M60 -60 V220 Q60 260 100 260 H360 Q400 260 400 300 V520", dur: "4.2s", delay: "3.1s" },
  { d: "M1660 320 H1360 Q1320 320 1320 360 V520 Q1320 560 1280 560 H1040", dur: "5.4s", delay: "1.8s" },
];

// Trazas estáticas de relleno (densidad de la placa).
const TRAZAS = [
  "M-60 600 H180 Q200 600 200 580 V440",
  "M1660 880 H1420 Q1400 880 1400 860 V740",
  "M540 1060 V900 Q540 880 560 880 H780",
  "M1100 -60 V80 Q1100 100 1120 100 H1260",
  "M820 470 H980 Q1000 470 1000 490 V600",
  "M260 880 H460 Q480 880 480 860 V760",
  "M1500 130 H1300 Q1280 130 1280 150 V260",
  "M40 980 V820 Q40 800 60 800 H200",
];

// Pads (puntos de conexión) repartidos por las uniones del ruteo.
const PADS: [number, number][] = [
  [300, 170], [300, 340], [760, 340], [760, 380], [360, 560], [980, 560],
  [980, 600], [1360, 660], [1220, 160], [1220, 200], [180, 500], [560, 680],
  [400, 260], [1320, 360], [1280, 560], [200, 580], [1000, 490], [480, 860],
];

// Chips / componentes SMD.
const CHIPS = [
  { x: 1040, y: 740, w: 128, h: 74 },
  { x: 96, y: 300, w: 92, h: 56 },
  { x: 660, y: 96, w: 76, h: 48 },
];

export function FondoTecno() {
  const { tema } = useTema();
  if (tema !== "vidrio") return null;

  return (
    <div className="fondo-tecno absolute inset-0 overflow-hidden">
      {/* Luz ambiental que deriva */}
      <span className="blob-tecno blob-a" />
      <span className="blob-tecno blob-b" />

      <svg
        className="pcb-svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="glow-energia" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base: trazas estáticas (rutas de energía + relleno) */}
        <g className="trazas">
          {ENERGIA.map((e, i) => (
            <path key={`b${i}`} d={e.d} />
          ))}
          {TRAZAS.map((d, i) => (
            <path key={`t${i}`} d={d} />
          ))}
        </g>

        {/* Componentes */}
        <g className="pads">
          {CHIPS.map((c, i) => (
            <rect key={`c${i}`} x={c.x} y={c.y} width={c.w} height={c.h} rx="8" />
          ))}
          {PADS.map(([cx, cy], i) => (
            <circle key={`p${i}`} cx={cx} cy={cy} r="3.4" />
          ))}
        </g>

        {/* Cargas de energía que recorren las trazas */}
        <g className="flujo" filter="url(#glow-energia)">
          {ENERGIA.map((e, i) => (
            <path
              key={`e${i}`}
              d={e.d}
              pathLength={100}
              style={{ animationDuration: e.dur, animationDelay: e.delay }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
