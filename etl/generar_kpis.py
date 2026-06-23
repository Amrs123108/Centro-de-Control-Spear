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

# Meta diaria de monto comprometido (ajustable por la dirección)
META_MONTO_DIARIO = 150_000


def alias_gestor(nombre: str) -> str:
    h = hashlib.sha256(str(nombre).encode("utf-8")).hexdigest()[:4].upper()
    return f"Gestor {h}"


def construir_insights(df, por_proyecto, por_hora, total, efectivas, es_promesa):
    """Insights accionables tipo 'qué requiere mi atención hoy'."""
    insights = []

    # 1. Fuga por no-contacto
    no_contacto = int((~df["EFECTIVO"]).sum())
    pct_nc = no_contacto / total
    if pct_nc > 0.6:
        insights.append({
            "tipo": "alerta",
            "titulo": f"{pct_nc:.0%} de las gestiones no logra contacto efectivo",
            "detalle": f"{no_contacto:,} intentos sin hablar con el titular. Mejorar la calidad de las bases telefónicas y los horarios de marcación es la palanca de mayor impacto.".replace(",", " "),
        })

    # 2. Mejor franja horaria por conversión
    ph = por_hora[por_hora["gestiones"] >= 100].copy()
    if not ph.empty:
        ph["conv"] = ph["efectivas"] / ph["gestiones"]
        mejor = ph.loc[ph["conv"].idxmax()]
        insights.append({
            "tipo": "oportunidad",
            "titulo": f"La franja de {int(mejor['hora'])}:00 es la más efectiva ({mejor['conv']:.0%} de contacto)",
            "detalle": "Concentrar a los mejores gestores y las cuentas de mayor saldo en las franjas de alta contactabilidad eleva la recuperación sin aumentar nómina.",
        })

    # 3. Cartera rezagada en conversión (entre las de volumen relevante)
    pp = por_proyecto[por_proyecto["gestiones"] >= 300].copy()
    if len(pp) >= 2:
        pp["conv_efectiva"] = pp.apply(
            lambda x: (x["promesas"] / x["efectivas"]) if x["efectivas"] > 0 else 0, axis=1
        )
        rezagada = pp.loc[pp["conv_efectiva"].idxmin()]
        lider = pp.loc[pp["conv_efectiva"].idxmax()]
        insights.append({
            "tipo": "alerta",
            "titulo": f"{rezagada['proyecto']} convierte {rezagada['conv_efectiva']:.0%} de sus contactos en promesa",
            "detalle": f"Contra {lider['conv_efectiva']:.0%} de {lider['proyecto']}, la mejor cartera del día. Revisar guion, perfil de cuentas o gestores asignados.",
        })

    # 4. Concentración de volumen
    top3 = por_proyecto.head(3)
    pct_top3 = top3["gestiones"].sum() / total
    insights.append({
        "tipo": "info",
        "titulo": f"3 carteras concentran {pct_top3:.0%} de la operación",
        "detalle": f"{', '.join(top3['proyecto'].tolist())}. Diversificar reduce el riesgo de ingresos ante la salida de un cliente.",
    })

    # 5. Logro del día: conversión sobre contactos
    pagos = int((df["CATEGORIA"] == "PAGO_CONFIRMADO").sum())
    conv = (es_promesa.sum() + pagos) / max(efectivas, 1)
    if conv > 0.4:
        insights.append({
            "tipo": "logro",
            "titulo": f"{conv:.0%} de los contactos efectivos termina en promesa o pago",
            "detalle": "Cuando el equipo logra hablar con el titular, cierra. El cuello de botella no es la negociación: es la contactabilidad.",
        })

    return insights[:5]


def main(ruta: str) -> None:
    df = _cargar_archivo(ruta)
    n = Normalizador()

    df["CATEGORIA"] = df["CLASIFICACION"].map(n.normalizar)
    df["EFECTIVO"] = df["CATEGORIA"].map(lambda c: n.flags(c)["contacto_efectivo"])
    df["FECHA_DT"] = pd.to_datetime(df["FECHA_CLAS"], dayfirst=True, errors="coerce")
    df["HORA"] = df["FECHA_DT"].dt.hour
    df["MONTO_NUM"] = pd.to_numeric(df["MONTO"], errors="coerce")
    df["GESTOR_ALIAS"] = df["GESTOR"].map(alias_gestor)

    es_promesa = df["CATEGORIA"].isin(["PROMESA_PAGO", "SEGUIMIENTO_PTP"])
    es_pago = df["CATEGORIA"] == "PAGO_CONFIRMADO"

    total = len(df)
    efectivas = int(df["EFECTIVO"].sum())
    promesas = int(es_promesa.sum())
    pagos = int(es_pago.sum())
    monto = round(float(df["MONTO_NUM"].sum()), 2)

    resumen = {
        "fecha": str(df["FECHA_DT"].dt.date.mode().iat[0]),
        "hora_corte": str(df["FECHA_DT"].max().strftime("%H:%M")),
        "total_gestiones": total,
        "gestores_activos": int(df["GESTOR"].nunique()),
        "deudores_gestionados": int(df["DOCUMENTO"].nunique()),
        "carteras_activas": int(df["PROYECTO"].nunique()),
        "contactos_efectivos": efectivas,
        "tasa_contacto_efectivo": round(efectivas / total, 4),
        "promesas": promesas,
        "pagos_confirmados": pagos,
        "tasa_conversion": round((promesas + pagos) / max(efectivas, 1), 4),
        "monto_comprometido": monto,
        "ticket_promedio": round(float(df["MONTO_NUM"].mean()), 2),
        "gestiones_por_gestor": round(total / max(df["GESTOR"].nunique(), 1), 1),
    }

    meta = {
        "monto_diario": META_MONTO_DIARIO,
        "avance": round(monto / META_MONTO_DIARIO, 4),
    }

    funnel = [
        {"etapa": "Gestiones realizadas", "valor": total, "tasa": 1.0},
        {"etapa": "Contactos efectivos", "valor": efectivas, "tasa": round(efectivas / total, 4)},
        {"etapa": "Promesas de pago", "valor": promesas, "tasa": round(promesas / max(efectivas, 1), 4)},
        {"etapa": "Pagos confirmados", "valor": pagos, "tasa": round(pagos / max(promesas, 1), 4)},
    ]

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
            pagos=("CATEGORIA", lambda s: int((s == "PAGO_CONFIRMADO").sum())),
            monto=("MONTO_NUM", "sum"),
        )
        .reset_index()
        .sort_values("gestiones", ascending=False)
        .rename(columns={"PROYECTO": "proyecto"})
    )
    por_proyecto["efectivas"] = por_proyecto["efectivas"].astype(int)
    por_proyecto["monto"] = por_proyecto["monto"].fillna(0).round(2)
    por_proyecto["tasa_contacto"] = (por_proyecto["efectivas"] / por_proyecto["gestiones"]).round(4)
    por_proyecto["tasa_conversion"] = por_proyecto.apply(
        lambda x: round(x["promesas"] / x["efectivas"], 4) if x["efectivas"] > 0 else 0.0, axis=1
    )

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
        .rename(columns={"GESTOR_ALIAS": "gestor"})
    )
    top_gestores["efectivas"] = top_gestores["efectivas"].astype(int)
    top_gestores["monto"] = top_gestores["monto"].fillna(0).round(2)
    # Eficiencia: promesas+pagos por cada 100 gestiones
    top_gestores["eficiencia"] = (
        (top_gestores["promesas"] + top_gestores["pagos"]) / top_gestores["gestiones"] * 100
    ).round(1)
    top_gestores = top_gestores.sort_values(
        ["promesas", "eficiencia"], ascending=False
    ).head(10)

    insights = construir_insights(df, por_proyecto, por_hora, total, efectivas, es_promesa)

    # Flujo en vivo: eventos anónimos para el ticker (sin ningún dato del deudor)
    def evento(row, tipo):
        return {
            "hora": row["FECHA_DT"].strftime("%H:%M"),
            "tipo": tipo,
            "cartera": str(row["PROYECTO"]),
            "monto": round(float(row["MONTO_NUM"]), 2) if pd.notna(row["MONTO_NUM"]) else None,
        }

    con_fecha = df[df["FECHA_DT"].notna()]
    eventos = []
    for _, x in con_fecha[es_pago].iterrows():
        eventos.append(evento(x, "PAGO"))
    prom = con_fecha[es_promesa]
    for _, x in prom.sample(min(40, len(prom)), random_state=7).iterrows():
        eventos.append(evento(x, "PROMESA"))
    cont = con_fecha[con_fecha["EFECTIVO"] & ~es_promesa & ~es_pago]
    for _, x in cont.sample(min(15, len(cont)), random_state=7).iterrows():
        eventos.append(evento(x, "CONTACTO"))
    eventos.sort(key=lambda e: e["hora"], reverse=True)
    flujo_vivo = eventos[:60]

    salida = {
        "resumen": resumen,
        "meta": meta,
        "funnel": funnel,
        "insights": insights,
        "flujo_vivo": flujo_vivo,
        "por_categoria": por_categoria,
        "por_hora": por_hora.to_dict(orient="records"),
        "por_proyecto": por_proyecto.to_dict(orient="records"),
        "top_gestores": top_gestores.to_dict(orient="records"),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"KPIs escritos en {OUT}")
    print(json.dumps({**resumen, "meta_avance": meta["avance"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
