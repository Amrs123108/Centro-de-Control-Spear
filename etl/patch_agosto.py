# -*- coding: utf-8 -*-
"""Parche puntual: re-procesa agosto 2025 con filtro de monto y actualiza el JSON."""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from historico_mensual import agregar_mes, fallback_periodo, leer_mes, periodo_df, SALIDA

ARCHIVOS_AGO = [
    # "Productividad-2 Agosto.xlsx" contiene data de sept 2024, no agosto 2025
    Path(r"Z:\WORKFORCE\Hojas de Productividad\Productividad Agosto 2025.xlsx"),
]

dfs = []
for f in ARCHIVOS_AGO:
    df = leer_mes(f)
    if df is not None and len(df) > 0:
        periodo = periodo_df(df, fallback_periodo(f.name))
        print(f"{f.name} -> {periodo}: {len(df):,} filas")
        dfs.append(df)

df_ago = pd.concat(dfs, ignore_index=True)
agg = agregar_mes(df_ago, "2025-08")
monto = agg["monto_comprometido"]
print(f"Monto comprometido agosto corregido: {monto:,.2f}")

hist = json.loads(SALIDA.read_text(encoding="utf-8"))
for i, m in enumerate(hist["meses"]):
    if m["periodo"] == "2025-08":
        hist["meses"][i] = agg
        print("Reemplazado 2025-08 en el JSON")
        break

SALIDA.write_text(json.dumps(hist, ensure_ascii=False, indent=2), encoding="utf-8")
print("JSON actualizado correctamente.")
