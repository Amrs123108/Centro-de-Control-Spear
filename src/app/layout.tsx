import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { IntroSpear, ScrollSuave } from "@/components/cinetica";
import { BotonTema, TemaProvider } from "@/components/tema";
import "./globals.css";

// Aplica la preferencia de tema antes del primer pintado para evitar parpadeo.
// Vidrio es el predeterminado; solo se usa Clásico si el usuario lo eligió antes.
const TEMA_INIT = `(function(){try{var t=localStorage.getItem('spear-tema');document.documentElement.dataset.tema=(t==='clasico')?'clasico':'vidrio';}catch(e){document.documentElement.dataset.tema='vidrio';}})();`;

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Centro de Control — Spear Contact",
  description: "Plataforma ejecutiva de inteligencia operativa de Spear Contact",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${dmSans.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <script dangerouslySetInnerHTML={{ __html: TEMA_INIT }} />
        <TemaProvider>
          <IntroSpear />
          <ScrollSuave />
          {children}
          <BotonTema />
        </TemaProvider>
      </body>
    </html>
  );
}
