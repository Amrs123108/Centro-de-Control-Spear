# -*- coding: utf-8 -*-
"""
Genera src/data/kpis.json a partir de un archivo de gestiones.
Solo produce AGREGADOS sin PII: los gestores se pseudonimizan con hash
consistente y ningún dato de deudor sale del agregado.

Uso:
    python generar_kpis.py "<ruta archivo de gestiones>"
"""
import hashlib
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from normalizar_clasificaciones import Normalizador, _cargar_archivo  # noqa: E402

OUT = Path(__file__).parent.parent / "src" / "data" / "kpis.json"


def alias_gestor(nombre: str) -> str:
    h = hashlib.sha256(str(nombre).encode("utf-8")).hexdigest()[:4].upper()
    return f"Gestor {h}"


def main(ruta: str) -> None:
    df = _cargar_archivo(ruta)
    n = Normalizador()

    df["CATEGORIA"] = df["CLASIFICACION"].map(n.normalizar)
    df["EFECTIVO"] = df["CATEGORIA"].map(lambda c: n.flags(c)["contacto_efectivo"])
    df["POSITIVO"] = df["CATEGORIA"].map(lambda c: n.flags(c)["resultado_positivo"])
    df["FECHA_DT"] = pd.to_datetime(df["FECHA_CLAS"], errors="coerce")
    df["HORA"] = df["FECHA_DT"].dt.hour
    df["MONTO_NUM"] = pd.to_numeric(df["MONTO"], errors="coerce")
    df["GESTOR_ALIAS"] = df["GESTOR"].map(alias_gestor)

    es_promesa = df["CATEGORIA"].isin(["PROMESA_PAGO", "SEGUIMIENTO_PTP"])
    es_pago = df["CATEGORIA"] == "PAGO_CONFIRMADO"

    total = len(df)
    efectivas = int(df["EFECTIVO"].sum())

    resumen = {
        "fecha": str(df["FECHA_DT"].dt.date.mode().iat[0]),
        "total_gestiones": total,
        "gestores_activos": int(df["GESTOR"].nunique()),
        "deudores_gestionados": int(df["DOCUMENTO"].nunique()),
        "carteras_activas": int(df["PROYECTO"].nunique()),
        "contactos_efectivos": efectivas,
        "tasa_contacto_efectivo": round(efectivas / total, 4),
        "promesas": int(es_promesa.sum()),
        "pagos_confirmados": int(es_pago.sum()),
        "tasa_conversion": round((es_promesa.sum() + es_pago.sum()) / max(efectivas, 1), 4),
        "monto_comprometido": round(float(df["MONTO_NUM"].sum()), 2),
        "ticket_promedio": round(float(df["MONTO_NUM"].mean()), 2),
    }

    por_categoria = [
        {"categoria": c, "etiqueta": n.flags(c)["etiqueta"], "total": int(t)}
        for c, t in df["CATEGORIA"].value_counts().items()
    ]

    por_hora = (
        df.dropna(subset=["HORA"])
        .groupby(df["HORA"].astype(int))
        .agg(gestiones=("CATEGORIA", "size"), efectivas=("EFECTIVO", "sum"))
        .reset_index()
        .rename(columns={"HORA": "hora"})
    )
    por_hora["efectivas"] = por_hora["efectivas"].astype(int)

    por_proyecto = (
        df.groupby("PROYECTO")
        .agg(
            gestiones=("CATEGORIA", "size"),
            efectivas=("EFECTIVO", "sum"),
            promesas=("CATEGORIA", lambda s: int(s.isin(["PROMESA_PAGO", "SEGUIMIENTO_PTP"]).sum())),
            monto=("MONTO_NUM", "sum"),
        )
        .reset_index()
        .sort_values("gestiones", ascending=False)
        .rename(columns={"PROYECTO": "proyecto"})
    )
    por_proyecto["efectivas"] = por_proyecto["efectivas"].astype(int)
    por_proyecto["monto"] = por_proyecto["monto"].round(2)

    top_gestores = (
        df.groupby("GESTOR_ALIAS")
        .agg(
            gestiones=("CATEGORIA", "size"),
            efectivas=("EFECTIVO", "sum"),
            promesas=("CATEGORIA", lambda s: int(s.isin(["PROMESA_PAGO", "SEGUIMIENTO_PTP"]).sum())),
            pagos=("CATEGORIA", lambda s: int((s == "PAGO_CONFIRMADO").sum())),
            monto=("MONTO_NUM", "sum"),
        )
        .reset_index()
        .sort_values(["promesas", "gestiones"], ascending=False)
        .head(10)
        .rename(columns={"GESTOR_ALIAS": "gestor"})
    )
    top_gestores["efectivas"] = top_gestores["efectivas"].astype(int)
    top_gestores["monto"] = top_gestores["monto"].fillna(0).round(2)

    salida = {
        "resumen": resumen,
        "por_categoria": por_categoria,
        "por_hora": por_hora.to_dict(orient="records"),
        "por_proyecto": por_proyecto.to_dict(orient="records"),
        "top_gestores": top_gestores.to_dict(orient="records"),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"KPIs escritos en {OUT}")
    print(json.dumps(resumen, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
