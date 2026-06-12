import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { CursorSpear, IntroSpear, ScrollSuave } from "@/components/cinetica";
import "./globals.css";

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
    <html lang="es" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full font-sans">
        <IntroSpear />
        <ScrollSuave />
        <CursorSpear />
        {children}
      </body>
    </html>
  );
}
