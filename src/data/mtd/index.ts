import type { MTDData } from "@/types/mtd";

import p_2026_06 from "./2026-06.json";
import p_2026_05 from "./2026-05.json";
import p_2026_04 from "./2026-04.json";

export const DATASETS: Record<string, MTDData> = {
  "2026-06": p_2026_06 as unknown as MTDData,
  "2026-05": p_2026_05 as unknown as MTDData,
  "2026-04": p_2026_04 as unknown as MTDData,
};
