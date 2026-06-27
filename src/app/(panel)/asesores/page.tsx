import { cargarMTD } from "@/lib/datos";
import AsesoresVista from "./vista";

export default async function AsesoresPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const mtd = cargarMTD(periodo);
  return <AsesoresVista key={mtd.periodo} mtd={mtd} />;
}
