import { cargarMTD, PERIODOS, periodoValido, resolverPeriodo } from "@/lib/datos";
import ComparativaVista from "./vista";

export default async function ComparativaPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const aKey = resolverPeriodo(a);
  // B por defecto: el período más reciente distinto de A (normalmente el mes anterior)
  const bKey =
    b && periodoValido(b) && b !== aKey
      ? b
      : PERIODOS.find((p) => p.periodo !== aKey)?.periodo ?? aKey;

  return (
    <ComparativaVista
      key={`${aKey}-${bKey}`}
      A={cargarMTD(aKey)}
      B={cargarMTD(bKey)}
      aKey={aKey}
      bKey={bKey}
    />
  );
}
