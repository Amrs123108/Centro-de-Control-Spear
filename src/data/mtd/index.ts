import type { MTDData } from "@/types/mtd";

import p_2026_06 from "./2026-06.json";
import p_2026_05 from "./2026-05.json";
import p_2026_04 from "./2026-04.json";
import p_2026_03 from "./2026-03.json";
import p_2026_02 from "./2026-02.json";

export const DATASETS: Record<string, MTDData> = {
  "2026-06": p_2026_06 as unknown as MTDData,
  "2026-05": p_2026_05 as unknown as MTDData,
  "2026-04": p_2026_04 as unknown as MTDData,
  "2026-03": p_2026_03 as unknown as MTDData,
  "2026-02": p_2026_02 as unknown as MTDData,
};
