import { cargarMTD } from "@/lib/datos";
import CarterasVista from "./vista";

export default async function CarterasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const mtd = cargarMTD(periodo);
  return <CarterasVista key={mtd.periodo} mtd={mtd} />;
}
