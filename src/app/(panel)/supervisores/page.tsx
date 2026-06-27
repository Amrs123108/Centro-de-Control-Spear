import { cargarMTD } from "@/lib/datos";
import SupervisoresVista from "./vista";

export default async function SupervisoresPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const mtd = cargarMTD(periodo);
  return <SupervisoresVista key={mtd.periodo} mtd={mtd} />;
}
