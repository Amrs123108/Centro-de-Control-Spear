# -*- coding: utf-8 -*-
"""
Genera src/data/kpis.json a partir de un archivo diario de gestiones.

Protocolo PII: se leen SOLO columnas seguras. DOCUMENTO, NOMBRE, CUENTA,
EMAIL, TELEFONO nunca tocan memoria. GESTOR no es PII (aprobado).
MARLIN ZELEDON = sistema predictivo, excluido.

Uso:
    python etl/generar_kpis.py "<ruta archivo de gestiones>"
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from normalizar_clasificaciones import Normalizador  # noqa: E402

OUT = Path(__file__).parent.parent / "src" / "data" / "kpis.json"

COLS_SAFE = ["GESTOR", "CLASIFICACION", "FECHA_CLAS", "MONTO", "ESTADO",
             "TIPO_DE_TRAMITE", "PROYECTO"]
MONTO_MAX = 500_000.0
META_MONTO_DIARIO = 150_000
GESTOR_PREDICTIVO = "MARLIN ZELEDON"

PROYECTO_MAP: dict[str, str] = {
    "TIGO": "TIGO", "TIGO CICLO 1 (1-30)": "TIGO", "TIGO CICLO 6": "TIGO",
    "TIGO CICLO 15": "TIGO", "TIGO CICLO 21": "TIGO",
    "BANISTMO S.A.": "BANISTMO RECOVERY",
    "BANISTMO ACTIVA": "BANISTMO ACTIVA",
    "BANISTMO ACTIVA 61 A 90": "BANISTMO ACTIVA",
    "BANISTMO ACTIVA PREDICTIVO": "BANISTMO ACTIVA",
    "SURA CORREDORES": "SURA", "SURA BANCA INDIVIDUAL": "SURA", "SURA HCIS": "SURA",
    "MULTIBANK": "MULTIBANK", "MULTIBANK ACTIVA": "MULTIBANK",
    "BAC CASTIGADA": "BAC", "SOLVE": "SOLVE", "KREDIYA": "KREDIYA",
    "GLOBAL BANK": "GLOBAL BANK", "AFINITI FINANCIAL": "AFINITI", "JAMAR": "JAMAR",
}


def consolidar_proyecto(p: str) -> str:
    if not isinstance(p, str):
        return "OTRO"
    key = p.strip().upper()
    for orig, cons in PROYECTO_MAP.items():
        if orig.upper() == key:
            return cons
    return p.strip()


def leer_archivo_seguro(ruta: str) -> pd.DataFrame:
    """Lee solo columnas seguras — PII nunca toca memoria."""
    df = pd.read_excel(
        ruta,
        usecols=lambda c: c in COLS_SAFE,
        dtype=str,
        engine="openpyxl",
    )
    # Excluir sistema predictivo
    if "GESTOR" in df.columns:
        df = df[~df["GESTOR"].str.upper().str.contains(GESTOR_PREDICTIVO, na=False)]
    return df


def construir_insights(df, por_proyecto, por_hora_df, total, efectivas, es_promesa):
    insights = []

    # 1. Fuga por no-contacto
    no_contacto = int((~df["EFECTIVO"]).sum())
    pct_nc = no_contacto / total
    if pct_nc > 0.6:
        insights.append({
            "tipo": "alerta",
            "titulo": f"{pct_nc:.0%} de las gestiones no logra contacto efectivo",
            "detalle": (
                f"{no_contacto:,} intentos sin hablar con el titular. "
                "Mejorar la calidad de las bases telefónicas y los horarios "
                "de marcación es la palanca de mayor impacto."
            ).replace(",", " "),
        })

    # 2. Mejor franja horaria (solo si hay datos reales de hora)
    ph = por_hora_df[por_hora_df["gestiones"] >= 50].copy() if len(por_hora_df) > 1 else pd.DataFrame()
    if not ph.empty:
        ph["conv"] = ph["efectivas"] / ph["gestiones"]
        mejor = ph.loc[ph["conv"].idxmax()]
        insights.append({
            "tipo": "oportunidad",
            "titulo": f"La franja de {int(mejor['hora'])}:00 es la más efectiva ({mejor['conv']:.0%} contacto)",
            "detalle": "Concentrar los mejores gestores en las franjas de alta contactabilidad eleva la recuperación sin aumentar nómina.",
        })

    # 3. Cartera rezagada en conversión
    pp = por_proyecto[por_proyecto["gestiones"] >= 200].copy()
    if len(pp) >= 2:
        pp["ptp_rate"] = pp.apply(
            lambda x: x["promesas"] / x["efectivas"] if x["efectivas"] > 0 else 0, axis=1
        )
        rezagada = pp.loc[pp["ptp_rate"].idxmin()]
        lider = pp.loc[pp["ptp_rate"].idxmax()]
        insights.append({
            "tipo": "alerta",
            "titulo": f"{rezagada['proyecto']} convierte {rezagada['ptp_rate']:.0%} de contactos en promesa",
            "detalle": f"Contra {lider['ptp_rate']:.0%} de {lider['proyecto']}, la mejor cartera del día. Revisar guion, perfil de cuentas o gestores asignados.",
        })

    # 4. Concentración de volumen
    top3 = por_proyecto.head(3)
    pct_top3 = top3["gestiones"].sum() / total
    insights.append({
        "tipo": "info",
        "titulo": f"3 carteras concentran {pct_top3:.0%} de la operación",
        "detalle": f"{', '.join(top3['proyecto'].tolist())}. Diversificar reduce el riesgo ante la salida de un cliente.",
    })

    # 5. PTP Rate global
    ptp = es_promesa.sum() / max(efectivas, 1)
    if ptp > 0.35:
        insights.append({
            "tipo": "logro",
            "titulo": f"PTP Rate: {ptp:.0%} de contactos efectivos cierran en promesa",
            "detalle": "Cuando el equipo logra hablar con el titular, cierra. El cuello de botella no es la negociación: es la contactabilidad.",
        })
    else:
        insights.append({
            "tipo": "alerta",
            "titulo": f"PTP Rate bajo: solo {ptp:.0%} de contactos terminan en promesa",
            "detalle": "Revisar el guion de negociación y el perfil de cuentas asignadas. La contactabilidad no es el único problema.",
        })

    return insights[:5]


def main(ruta: str) -> None:
    df = leer_archivo_seguro(ruta)
    n = Normalizador()

    # Consolidar carteras
    df["PROYECTO"] = df["PROYECTO"].apply(consolidar_proyecto)

    df["CATEGORIA"] = df["CLASIFICACION"].map(n.normalizar)
    df["EFECTIVO"] = df["CATEGORIA"].map(lambda c: n.flags(c)["contacto_efectivo"])

    # Fecha y hora — los archivos sin hora (DD/MM/YYYY) tendrán HORA = 0
    # Se detecta si hay datos reales de hora por varianza de HORA
    df["FECHA_DT"] = pd.to_datetime(df["FECHA_CLAS"], dayfirst=True, errors="coerce")
    df["HORA_RAW"] = df["FECHA_DT"].dt.hour

    # Cap de monto
    df["MONTO_NUM"] = pd.to_numeric(df["MONTO"], errors="coerce").fillna(0.0)
    df.loc[(df["MONTO_NUM"] < 0) | (df["MONTO_NUM"] > MONTO_MAX), "MONTO_NUM"] = 0.0

    es_promesa = df["CATEGORIA"].isin(["PROMESA_PAGO", "SEGUIMIENTO_PTP"])
    es_pago = df["CATEGORIA"] == "PAGO_CONFIRMADO"

    total = len(df)
    efectivas = int(df["EFECTIVO"].sum())
    promesas = int(es_promesa.sum())
    pagos = int(es_pago.sum())
    monto = round(float(df["MONTO_NUM"].sum()), 2)
    ptp_rate = round(promesas / max(efectivas, 1), 4)

    # Fecha del corte
    fechas_validas = df["FECHA_DT"].dropna()
    fecha_corte = str(fechas_validas.dt.date.mode().iat[0]) if len(fechas_validas) > 0 else "—"

    # Hora de corte: si todos los registros tienen hora 0 → archivo sin hora
    horas_unicas = df["HORA_RAW"].dropna().nunique()
    tiene_hora = horas_unicas > 1
    if tiene_hora:
        hora_corte = str(fechas_validas.max().strftime("%H:%M"))
    else:
        hora_corte = "cierre del día"

    resumen = {
        "fecha": fecha_corte,
        "hora_corte": hora_corte,
        "total_gestiones": total,
        "gestores_activos": int(df["GESTOR"].nunique()),
        "carteras_activas": int(df["PROYECTO"].nunique()),
        "contactos_efectivos": efectivas,
        "tasa_contacto_efectivo": round(efectivas / total, 4),
        "promesas": promesas,
        "pagos_confirmados": pagos,
        "ptp_rate": ptp_rate,
        "tasa_conversion": round((promesas + pagos) / max(efectivas, 1), 4),
        "monto_comprometido": monto,
        "ticket_promedio": round(float(df["MONTO_NUM"][df["MONTO_NUM"] > 0].mean()) if (df["MONTO_NUM"] > 0).any() else 0, 2),
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

    # Ritmo por hora — solo incluir si el archivo tiene datos reales de hora
    if tiene_hora:
        por_hora_df = (
            df.dropna(subset=["HORA_RAW"])
            .groupby(df["HORA_RAW"].astype(int))
            .agg(gestiones=("CATEGORIA", "size"), efectivas=("EFECTIVO", "sum"))
            .reset_index()
            .rename(columns={"HORA_RAW": "hora"})
        )
        por_hora_df["efectivas"] = por_hora_df["efectivas"].astype(int)
        por_hora = por_hora_df.to_dict(orient="records")
    else:
        por_hora_df = pd.DataFrame(columns=["hora", "gestiones", "efectivas"])
        por_hora = []  # el componente mostrará "datos no disponibles"

    por_proyecto_df = (
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
    por_proyecto_df["efectivas"] = por_proyecto_df["efectivas"].astype(int)
    por_proyecto_df["monto"] = por_proyecto_df["monto"].fillna(0).round(2)
    por_proyecto_df["tasa_contacto"] = (por_proyecto_df["efectivas"] / por_proyecto_df["gestiones"]).round(4)
    por_proyecto_df["ptp_rate"] = por_proyecto_df.apply(
        lambda x: round(x["promesas"] / x["efectivas"], 4) if x["efectivas"] > 0 else 0.0, axis=1
    )
    por_proyecto_df["tasa_conversion"] = por_proyecto_df.apply(
        lambda x: round((x["promesas"] + x["pagos"]) / x["efectivas"], 4) if x["efectivas"] > 0 else 0.0, axis=1
    )

    # Top gestores — nombres reales (GESTOR no es PII por protocolo aprobado)
    top_gestores_df = (
        df.groupby("GESTOR")
        .agg(
            gestiones=("CATEGORIA", "size"),
            efectivas=("EFECTIVO", "sum"),
            promesas=("CATEGORIA", lambda s: int(s.isin(["PROMESA_PAGO", "SEGUIMIENTO_PTP"]).sum())),
            pagos=("CATEGORIA", lambda s: int((s == "PAGO_CONFIRMADO").sum())),
            monto=("MONTO_NUM", "sum"),
        )
        .reset_index()
        .rename(columns={"GESTOR": "gestor"})
    )
    top_gestores_df["efectivas"] = top_gestores_df["efectivas"].astype(int)
    top_gestores_df["monto"] = top_gestores_df["monto"].fillna(0).round(2)
    top_gestores_df["ptp_rate"] = (
        top_gestores_df["promesas"] / top_gestores_df["efectivas"].clip(lower=1) * 100
    ).round(1)
    top_gestores_df = top_gestores_df.sort_values(
        ["promesas", "ptp_rate"], ascending=False
    ).head(10)

    # Formato Title Case para presentación
    top_gestores_df["gestor"] = top_gestores_df["gestor"].apply(
        lambda n: " ".join(p.capitalize() for p in str(n).split())
    )

    insights = construir_insights(df, por_proyecto_df, por_hora_df, total, efectivas, es_promesa)

    salida = {
        "resumen": resumen,
        "meta": meta,
        "funnel": funnel,
        "insights": insights,
        "por_categoria": por_categoria,
        "por_hora": por_hora,
        "tiene_hora": tiene_hora,
        "por_proyecto": por_proyecto_df.to_dict(orient="records"),
        "top_gestores": top_gestores_df.to_dict(orient="records"),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"KPIs -> {OUT}")
    print(f"  Fecha: {fecha_corte} | Gestiones: {total:,} | Gestores: {resumen['gestores_activos']}")
    print(f"  Efectivas: {efectivas:,} | Promesas: {promesas:,} | PTP Rate: {ptp_rate:.1%}")
    print(f"  Monto: ${monto:,.2f} | Meta: {meta['avance']:.1%}")
    print(f"  Datos de hora: {'SI' if tiene_hora else 'NO (archivo sin timestamp)'}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
