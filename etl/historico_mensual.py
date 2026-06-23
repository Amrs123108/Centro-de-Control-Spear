# -*- coding: utf-8 -*-
"""
ETL Histórico Mensual — Centro de Control Spear
================================================
Lee los archivos de productividad mensual de Z:\\WORKFORCE\\Hojas de Productividad
con PROTOCOLO PII COMPLETO:
  - Solo se leen 10 columnas seguras (por índice), las 9 columnas PII nunca
    tocan memoria (DOCUMENTO, NOMBRE, CUENTA, MONEDA, OBS, EMAIL, TELEFONO,
    BUSCAR TITULAR, BUSCAR TERCERO, BUSCAR PROMESA).
  - El gestor "MARLIN ZELEDON" es el marcador predictivo y se renombra a
    "Predictivo" para evitar que distorsione rankings humanos.
  - La salida es 100 % PII-free: solo conteos, tasas y montos agregados.

Salida: src/data/historico_mensual.json  (se commitea al repo)

Uso:
    python etl/historico_mensual.py
"""
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from normalizar_clasificaciones import Normalizador  # noqa: E402

CARPETA = Path(r"Z:\WORKFORCE\Hojas de Productividad")
SALIDA = Path(__file__).parent.parent / "src" / "data" / "historico_mensual.json"

# Archivos que NO son consolidados de gestión
ARCHIVOS_SKIP = {
    "Datos de metas para septiembre.xlsx",
    "Tabla de tipo de contacto.xlsx",
}
# Cédulas/teléfonos en columna MONTO generan valores fuera de rango.
# Cap individual: ninguna deuda de consumo supera $500k en este portafolio.
MONTO_MAX = 500_000.0

# Columnas seguras en hoja "Datos calculados" (0-based)
# 0=GESTOR  3=CLASIFICACION  4=FECHA_CLAS  5=HORAS_CLAS  8=MONTO
# 9=FECHA_PROMESA  11=ESTADO  12=TIPO_DE_TRAMITE  15=PROYECTO  19=TIPO_DE_CONTACTO
COLS_IDX = [0, 3, 4, 5, 8, 9, 11, 12, 15, 19]
COLS_NOM = [
    "gestor", "clasificacion", "fecha_clas", "horas_clas",
    "monto", "fecha_promesa", "estado", "tipo_tramite",
    "proyecto", "tipo_contacto",
]

NORM = Normalizador()


def limpiar(texto):
    t = unicodedata.normalize("NFD", str(texto))
    return re.sub(r"\s+", " ", "".join(c for c in t if unicodedata.category(c) != "Mn").upper()).strip()


def alias_gestor(nombre: str) -> str:
    if not isinstance(nombre, str):
        return None
    if "MARLIN" in nombre.upper() and "ZELEDON" in nombre.upper():
        return "Predictivo"
    return nombre.strip().title()


def leer_mes(filepath: Path) -> pd.DataFrame | None:
    """Lee solo columnas seguras de la hoja Datos calculados."""
    try:
        df = pd.read_excel(
            filepath,
            sheet_name="Datos calculados",
            usecols=COLS_IDX,
            header=0,
            dtype=str,
            engine="openpyxl",
        )
    except Exception as e:
        print(f"    FALLO leyendo {filepath.name}: {e}")
        return None

    df.columns = COLS_NOM
    df = df.dropna(subset=["gestor", "clasificacion"], how="all")
    df["gestor"] = df["gestor"].apply(alias_gestor)
    df = df[df["gestor"].notna()]

    df["monto"] = pd.to_numeric(df["monto"], errors="coerce").fillna(0.0)
    # Descarta valores fuera de rango (cédulas/teléfonos en columna equivocada)
    df.loc[(df["monto"] < 0) | (df["monto"] > MONTO_MAX), "monto"] = 0.0
    df["fecha_clas"] = pd.to_datetime(df["fecha_clas"], errors="coerce")
    df["clasificacion"] = df["clasificacion"].fillna("").astype(str)
    df["tipo_contacto"] = df["tipo_contacto"].fillna("").str.strip().str.upper()
    df["estado"] = df["estado"].fillna("").str.strip().str.upper()
    df["proyecto"] = df["proyecto"].fillna("SIN CARTERA").str.strip()

    df["categoria"] = df["clasificacion"].map(NORM.normalizar)
    df["efectiva"] = df["tipo_contacto"].isin(["TITULAR", "TERCERO"])
    df["es_promesa"] = df["tipo_contacto"] == "PROMESA"
    df["es_compromiso"] = df["estado"] == "COMPROMISO"
    df["es_pago"] = df["estado"] == "PAGO"

    return df


def periodo_df(df: pd.DataFrame, fallback: str) -> str:
    fechas = df["fecha_clas"].dropna()
    if len(fechas) >= 10:
        mode = fechas.dt.to_period("M").mode()
        if len(mode) > 0:
            return str(mode.iloc[0])
    return fallback


def fallback_periodo(nombre: str) -> str:
    MESES = {
        "ENERO": "01", "FEBRERO": "02", "MARZO": "03", "ABRIL": "04",
        "MAYO": "05", "JUNIO": "06", "JULIO": "07", "AGOSTO": "08",
        "SEPTIEMBRE": "09", "OCTUBRE": "10", "NOVIEMBRE": "11", "DICIEMBRE": "12",
    }
    up = limpiar(nombre)
    anio_m = re.search(r"\b(202\d)\b", up)
    mes_num = next((v for k, v in MESES.items() if k in up), None)
    if anio_m and mes_num:
        return f"{anio_m.group(1)}-{mes_num}"
    if mes_num:
        # Sin año: sep/oct/nov/dic → 2024; resto → 2025
        anio = "2024" if mes_num in ("09", "10", "11", "12") else "2025"
        return f"{anio}-{mes_num}"
    return "2025-03"  # "Productividad.xlsx" sin mes


def agregar_mes(df: pd.DataFrame, periodo: str) -> dict:
    total = len(df)
    df_h = df[df["gestor"] != "Predictivo"]
    df_p = df[df["gestor"] == "Predictivo"]

    efectivas = int(df["efectiva"].sum())
    promesas = int(df["es_promesa"].sum())
    compromisos = int(df["es_compromiso"].sum())
    pagos = int(df["es_pago"].sum())
    monto = round(float(df.loc[df["es_compromiso"] | df["es_pago"], "monto"].sum()), 2)

    # Por cartera
    por_cartera = []
    for proyecto, g in df.groupby("proyecto"):
        if not proyecto or proyecto == "SIN CARTERA":
            continue
        t = len(g)
        ef = int(g["efectiva"].sum())
        pr = int(g["es_promesa"].sum())
        co = int((g["es_compromiso"] | g["es_pago"]).sum())
        mn = round(float(g.loc[g["es_compromiso"] | g["es_pago"], "monto"].sum()), 2)
        por_cartera.append({
            "proyecto": proyecto,
            "gestiones": t,
            "efectivas": ef,
            "tasa_efectividad": round(ef / t * 100, 1) if t else 0,
            "promesas": pr,
            "compromisos": co,
            "monto_comprometido": mn,
        })
    por_cartera.sort(key=lambda x: x["gestiones"], reverse=True)

    # Top gestores humanos
    top_gestores = []
    for gestor, g in df_h.groupby("gestor"):
        t = len(g)
        ef = int(g["efectiva"].sum())
        pr = int(g["es_promesa"].sum())
        co = int((g["es_compromiso"] | g["es_pago"]).sum())
        mn = round(float(g.loc[g["es_compromiso"] | g["es_pago"], "monto"].sum()), 2)
        top_gestores.append({
            "gestor": gestor,
            "gestiones": t,
            "efectivas": ef,
            "tasa_efectividad": round(ef / t * 100, 1) if t else 0,
            "promesas": pr,
            "compromisos": co,
            "monto_comprometido": mn,
        })
    top_gestores.sort(key=lambda x: x["promesas"], reverse=True)

    # Distribución tipo contacto
    tipo_dist = {
        k: int(v)
        for k, v in df["tipo_contacto"].value_counts().items()
        if k
    }

    # Top 10 categorías normalizadas
    cat_dist = {
        k: int(v)
        for k, v in df["categoria"].value_counts().head(10).items()
    }

    # Predictivo stats (separado para que no distorsione rankings)
    pred = {
        "gestiones": int(len(df_p)),
        "efectivas": int(df_p["efectiva"].sum()),
        "promesas": int(df_p["es_promesa"].sum()),
    }

    return {
        "periodo": periodo,
        "total_gestiones": total,
        "gestiones_humanas": int(len(df_h)),
        "gestiones_predictivo": pred["gestiones"],
        "efectivas": efectivas,
        "tasa_efectividad": round(efectivas / total * 100, 1) if total else 0,
        "promesas": promesas,
        "compromisos": compromisos,
        "pagos": pagos,
        "monto_comprometido": monto,
        "predictivo": pred,
        "por_cartera": por_cartera,
        "top_gestores": top_gestores,
        "tipo_contacto": tipo_dist,
        "categorias": cat_dist,
    }


def main():
    archivos = sorted(
        [
            f for f in CARPETA.glob("*.xlsx")
            if f.name not in ARCHIVOS_SKIP and not f.name.startswith("~$")
        ],
        key=lambda f: f.name,
    )
    print(f"Archivos a procesar: {len(archivos)}\n")

    acumulados: dict[str, list[pd.DataFrame]] = {}

    for archivo in archivos:
        print(f"  [{archivos.index(archivo)+1}/{len(archivos)}] {archivo.name}", flush=True)
        df = leer_mes(archivo)
        if df is None or len(df) == 0:
            print("    Saltando (vacío o error)")
            continue
        periodo = periodo_df(df, fallback_periodo(archivo.name))
        print(f"    -> periodo detectado: {periodo} | filas: {len(df):,}")
        acumulados.setdefault(periodo, []).append(df)

    print(f"\nCombinando {len(acumulados)} periodos...")
    meses = []
    for periodo in sorted(acumulados):
        df_mes = pd.concat(acumulados[periodo], ignore_index=True)
        print(f"  {periodo}: {len(df_mes):,} gestiones totales")
        meses.append(agregar_mes(df_mes, periodo))

    salida = {
        "generado": datetime.now().isoformat(timespec="seconds"),
        "total_meses": len(meses),
        "periodos": [m["periodo"] for m in meses],
        "meses": meses,
    }

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nListo -> {SALIDA}")
    print(f"Meses generados: {salida['periodos']}")
    for m in meses:
        print(
            f"  {m['periodo']}: {m['total_gestiones']:>7,} gestiones  "
            f"{m['tasa_efectividad']:>5.1f}% efectividad  "
            f"{m['promesas']:>5,} promesas  "
            f"${m['monto_comprometido']:>12,.2f} comprometido"
        )


if __name__ == "__main__":
    main()
