# -*- coding: utf-8 -*-
"""
ETL MTD (Month-to-Date) — Centro de Control Spear
==================================================
Lee todos los archivos de gestiones del mes en curso desde:
  Z:\\My Folders\\General de Gestiones\\{año}\\{mes}\\Gestiones\\*.xls

Lee metas desde OneDrive corporativo sincronizado:
  C:\\Users\\Angel Reyna\\OneDrive - Spear Contact\\METAS ASESORES.xlsx

Protocolo PII: solo se leen columnas seguras por nombre.
NUNCA se leen DOCUMENTO, NOMBRE, CUENTA, EMAIL, TELEFONO, OBS.
MARLIN ZELEDON = sistema predictivo → excluido del scoreboard.

Salida: src/data/mtd_gestores.json  (PII-free, se commitea al repo)

Uso:
    python etl/generar_mtd.py
    python etl/generar_mtd.py 2026 Junio   (año y mes explícito)
"""
import json
import re
import sys
from datetime import date as date_type
from datetime import datetime
from pathlib import Path

import pandas as pd

# Mapeo mes español → número (para extraer fecha del nombre del archivo)
_MESES_ES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}


def fecha_desde_nombre(nombre: str, anio: int) -> date_type | None:
    """Extrae la fecha de '...NN de Mes...' — inequívoco, sin problemas de locale."""
    m = re.search(r'(\d{1,2})\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)', nombre, re.IGNORECASE)
    if not m:
        return None
    dia = int(m.group(1))
    mes = _MESES_ES.get(m.group(2).strip().lower())
    if not mes:
        return None
    try:
        return date_type(anio, mes, dia)
    except ValueError:
        return None

sys.path.insert(0, str(Path(__file__).parent))
from normalizar_clasificaciones import Normalizador  # noqa: E402

# ── Rutas ────────────────────────────────────────────────────────────────────
BASE_GESTIONES = Path(r"Z:\My Folders\General de Gestiones")
METAS_PATH = Path(r"C:\Users\Angel Reyna\OneDrive - Spear Contact\METAS ASESORES.xlsx")
SALIDA = Path(__file__).parent.parent / "src" / "data" / "mtd_gestores.json"

# ── Columnas seguras (no PII) ─────────────────────────────────────────────────
COLS_SAFE = ["GESTOR", "CLASIFICACION", "FECHA_CLAS", "MONTO", "ESTADO", "TIPO_DE_TRAMITE", "PROYECTO"]
MONTO_MAX = 500_000.0

# ── Consolidación de proyectos ────────────────────────────────────────────────
PROYECTO_MAP: dict[str, str] = {
    "TIGO": "TIGO",
    "TIGO CICLO 1 (1-30)": "TIGO",
    "TIGO CICLO 6": "TIGO",
    "TIGO CICLO 15": "TIGO",
    "TIGO CICLO 21": "TIGO",
    "BANISTMO S.A.": "BANISTMO RECOVERY",
    "BANISTMO ACTIVA": "BANISTMO ACTIVA",
    "BANISTMO ACTIVA 61 A 90": "BANISTMO ACTIVA",
    "BANISTMO ACTIVA PREDICTIVO": "BANISTMO ACTIVA",
    "SURA CORREDORES": "SURA",
    "SURA BANCA INDIVIDUAL": "SURA",
    "SURA HCIS": "SURA",
    "MULTIBANK": "MULTIBANK",
    "MULTIBANK ACTIVA": "MULTIBANK",
    "BAC CASTIGADA": "BAC",
    "SOLVE": "SOLVE",
    "KREDIYA": "KREDIYA",
    "GLOBAL BANK": "GLOBAL BANK",
    "AFINITI FINANCIAL": "AFINITI",
    "JAMAR": "JAMAR",
}

NORM = Normalizador()
GESTOR_PREDICTIVO = "MARLIN ZELEDON"
# Cuentas que no son asesores reales: marcador predictivo, cuentas de práctica
# y personal que no gestiona (supervisión/coordinación). Se excluyen del
# scoreboard para no contaminar los benchmarks del equipo.
GESTORES_EXCLUIDOS = (
    "MARLIN ZELEDON", "CAPACITACION", "PRUEBA", "TEST", "DEMO",
    "EVER RODR", "ORIS JARAMILLO", "ANIBAL ABREGO", "ANÍBAL ABREGO",
)


def normalizar_gestor(nombre: str) -> str | None:
    if not isinstance(nombre, str) or not nombre.strip():
        return None
    upper = nombre.upper()
    if any(excl in upper for excl in GESTORES_EXCLUIDOS):
        return None  # excluir del scoreboard
    return nombre.strip().upper()


def consolidar_proyecto(proyecto: str) -> str:
    """Unifica las variantes de cada cliente en una sola cartera."""
    if not isinstance(proyecto, str) or not proyecto.strip():
        return "OTRO"
    p = proyecto.strip().upper()
    # Reglas por palabra clave (cubren sufijos como CICLO, ACH, SUCURSALES, 31-60)
    if p.startswith("SURA"):
        return "SURA"
    if "AFINITI" in p:
        return "AFINITI"
    if "BANISTMO" in p:
        return "BANISTMO ACTIVA" if "ACTIVA" in p else "BANISTMO RECOVERY"
    if "TIGO" in p:
        return "TIGO"
    if "MULTIBANK" in p:
        return "MULTIBANK"
    if p.startswith("BAC"):
        return "BAC"
    # Mapa explícito para el resto
    for original, consolidado in PROYECTO_MAP.items():
        if original.upper() == p:
            return consolidado
    # Si no está en el mapa, conservar tal cual (nuevas carteras futuras)
    return proyecto.strip()


def leer_dia(filepath: Path, fecha_archivo: date_type | None = None) -> pd.DataFrame | None:
    try:
        # Leer solo columnas seguras (PII nunca toca memoria)
        df = pd.read_excel(
            filepath,
            usecols=lambda c: c in COLS_SAFE,
            dtype=str,
            engine="openpyxl",
        )
    except Exception as e:
        print(f"    FALLO {filepath.name}: {e}")
        return None

    cols_presentes = [c for c in COLS_SAFE if c in df.columns]
    if "GESTOR" not in cols_presentes or "CLASIFICACION" not in cols_presentes:
        print(f"    Sin columnas clave: {filepath.name}")
        return None

    df = df[cols_presentes].copy()

    # Limpiar gestor — None para Predictivo
    df["GESTOR"] = df["GESTOR"].apply(normalizar_gestor)
    df = df[df["GESTOR"].notna()]

    # Consolidar proyecto
    if "PROYECTO" in df.columns:
        df["PROYECTO"] = df["PROYECTO"].apply(consolidar_proyecto)
    else:
        df["PROYECTO"] = "OTRO"

    # Monto numérico con cap
    if "MONTO" in df.columns:
        df["MONTO"] = pd.to_numeric(df["MONTO"], errors="coerce").fillna(0.0)
        df.loc[(df["MONTO"] < 0) | (df["MONTO"] > MONTO_MAX), "MONTO"] = 0.0
    else:
        df["MONTO"] = 0.0

    # Fecha: se usa fecha_archivo (del nombre del archivo) para garantizar exactitud.
    # FECHA_CLAS tiene formatos mixtos entre archivos (ISO con hora vs DD/MM/YYYY),
    # lo que causa errores con cualquier dayfirst fijo.
    if fecha_archivo is not None:
        df["FECHA_ARCHIVO"] = pd.Timestamp(fecha_archivo)
    else:
        if "FECHA_CLAS" in df.columns:
            df["FECHA_ARCHIVO"] = pd.to_datetime(df["FECHA_CLAS"], errors="coerce")
        else:
            df["FECHA_ARCHIVO"] = pd.NaT

    # Hora: extraer de FECHA_CLAS cuando tiene formato ISO "YYYY-MM-DD HH:MM:SS"
    # Los archivos en formato "DD/MM/YYYY" (sin hora) quedarán como NaT
    if "FECHA_CLAS" in df.columns:
        dt_iso = pd.to_datetime(df["FECHA_CLAS"], format="%Y-%m-%d %H:%M:%S", errors="coerce")
        df["HORA"] = dt_iso.dt.hour.where(dt_iso.notna())
    else:
        df["HORA"] = pd.NA

    # Categorías y flags
    df["categoria"] = df["CLASIFICACION"].fillna("").map(NORM.normalizar)
    df["efectiva"] = df["categoria"].map(lambda c: NORM.flags(c)["contacto_efectivo"])
    df["es_promesa"] = df["categoria"].isin(["PROMESA_PAGO", "SEGUIMIENTO_PTP"])
    df["estado_clean"] = df["ESTADO"].fillna("").str.strip().str.upper() if "ESTADO" in df.columns else ""
    df["es_compromiso"] = df["estado_clean"] == "COMPROMISO"
    df["es_pago"] = df["estado_clean"] == "PAGO"

    return df


def leer_metas() -> pd.DataFrame:
    if not METAS_PATH.exists():
        print(f"ADVERTENCIA: No se encontro {METAS_PATH}. Metas omitidas.")
        return pd.DataFrame(columns=["ASESOR", "CARTERA", "META GESTIONES", "META PROMESAS", "META EFECTIVAS", "META RECAUDO"])
    try:
        df = pd.read_excel(METAS_PATH, dtype=str)
        df.columns = [c.strip().upper() for c in df.columns]
        df = df.dropna(subset=["ASESOR"])
        for col in ["META GESTIONES", "META PROMESAS", "META EFECTIVAS", "META RECAUDO"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
            else:
                df[col] = 0.0
        df["ASESOR"] = df["ASESOR"].str.strip().str.upper()
        return df
    except Exception as e:
        print(f"ADVERTENCIA: No se pudo leer metas: {e}")
        return pd.DataFrame(columns=["ASESOR", "CARTERA", "META GESTIONES", "META PROMESAS", "META EFECTIVAS", "META RECAUDO"])


def nivel_por_score(score: float) -> str:
    """Segmentación común para asesores y carteras."""
    if score >= 70:
        return "elite"
    if score >= 45:
        return "solido"
    if score >= 25:
        return "promedio"
    return "bajo"


def semaforo(pct: float, pct_esperado: float) -> str:
    if pct_esperado <= 0:
        return "sin_meta"
    ratio = pct / pct_esperado
    if ratio >= 0.85:
        return "cumpliendo"
    if ratio >= 0.50:
        return "cerca"
    return "lejos"


def construir_insights_mtd(resumen, carteras, agg, n_alertas) -> list[dict]:
    """Hallazgos accionables a partir del mes en curso."""
    ins = []
    total = resumen["total_gestores"]

    # 1. Contactabilidad — la palanca clave
    nc = 1 - resumen["tasa_contacto"]
    if nc > 0.6:
        ins.append({
            "tipo": "alerta",
            "titulo": f"{nc:.0%} de las gestiones no logra contacto efectivo",
            "detalle": "La contactabilidad es el cuello de botella del mes. Mejorar horarios de marcación y calidad de las bases telefónicas es la palanca de mayor impacto.",
        })

    # 2. Mejor vs peor cartera por conversión (PTP)
    cc = [c for c in carteras if c["efectivas"] >= 200]
    if len(cc) >= 2:
        lider = max(cc, key=lambda x: x["ptp_rate"])
        rezag = min(cc, key=lambda x: x["ptp_rate"])
        ins.append({
            "tipo": "oportunidad",
            "titulo": f"{lider['cartera']} convierte {lider['ptp_rate']:.0%} de contactos; {rezag['cartera']} solo {rezag['ptp_rate']:.0%}",
            "detalle": f"Hay {(lider['ptp_rate'] - rezag['ptp_rate']) * 100:.0f} puntos de diferencia entre la mejor y la peor cartera. Replicar el guion de {lider['cartera']} en {rezag['cartera']} eleva la recuperación sin más nómina.",
        })

    # 3. Asesores que requieren atención
    if n_alertas > 0:
        ins.append({
            "tipo": "alerta",
            "titulo": f"{n_alertas} de {total} asesores tienen al menos una alerta de desempeño",
            "detalle": "Baja actividad, baja conversión o baja contactabilidad respecto al equipo. Revisa la vista de Asesores para coaching dirigido.",
        })

    # 4. Top asesor del mes
    if len(agg) > 0:
        top = agg.iloc[0]
        ins.append({
            "tipo": "logro",
            "titulo": f"{str(top['GESTOR']).title()} lidera el mes con {int(top['promesas'])} promesas",
            "detalle": f"Score {top['score']:.0f}/100 · PTP {top['ptp_rate']:.0%} · {top['gestiones_dia']:.0f} gestiones/día. Documentar su método y replicarlo en el equipo.",
        })

    # 5. PTP global
    ptp = resumen["ptp_rate"]
    ins.append({
        "tipo": "logro" if ptp >= 0.35 else "alerta",
        "titulo": f"PTP Rate del mes: {ptp:.0%} de los contactos terminan en promesa",
        "detalle": (
            "Cuando el equipo logra hablar con el titular, cierra. El problema no es negociar: es contactar."
            if ptp >= 0.35 else
            "Revisar guion de negociación y perfil de cuentas asignadas: la contactabilidad no es el único problema."
        ),
    })

    return ins[:5]


def main(anio: str | None = None, mes: str | None = None) -> None:
    hoy = datetime.now()
    anio = anio or str(hoy.year)
    # Mapeo número → nombre de carpeta
    MESES_NUM = {
        "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
        "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
        "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
    }
    if mes and mes.isdigit() and mes.zfill(2) in MESES_NUM:
        mes_nombre = MESES_NUM[mes.zfill(2)]
        mes_num = mes.zfill(2)
    elif mes:
        mes_nombre = mes.capitalize()
        mes_num = {v.lower(): k for k, v in MESES_NUM.items()}.get(mes.lower(), hoy.strftime("%m"))
    else:
        mes_nombre = hoy.strftime("%B").capitalize()
        # strftime en español en Windows puede variar; usar número
        mes_num = hoy.strftime("%m")
        MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]
        mes_nombre = MESES_ES[int(mes_num) - 1].capitalize()

    carpeta = BASE_GESTIONES / anio / mes_nombre / "Gestiones"
    if not carpeta.exists():
        raise SystemExit(f"Carpeta no encontrada: {carpeta}")

    archivos = sorted(carpeta.glob("*.xls*"))  # cubre .xls y .xlsx
    if not archivos:
        raise SystemExit(f"Sin archivos .xls en {carpeta}")

    print(f"Periodo: {anio}-{mes_num} ({mes_nombre})")
    print(f"Archivos encontrados: {len(archivos)}")

    dias_fechas = set()
    frames = []
    for archivo in archivos:
        fecha_arch = fecha_desde_nombre(archivo.stem, int(anio))
        df = leer_dia(archivo, fecha_arch)
        if df is not None and len(df) > 0:
            if fecha_arch:
                dias_fechas.add(fecha_arch)
            else:
                fechas = df["FECHA_ARCHIVO"].dropna().dt.date.unique()
                dias_fechas.update(fechas)
            frames.append(df)
            print(f"  {archivo.name}: {len(df):,} filas")

    if not frames:
        raise SystemExit("No se pudo leer ningún archivo.")

    df_mes = pd.concat(frames, ignore_index=True)
    dias_procesados = sorted(dias_fechas)
    print(f"\nTotal filas MTD: {len(df_mes):,} | Dias: {len(dias_procesados)}")

    # ── Agregar por gestor ────────────────────────────────────────────────────
    agg = (
        df_mes.groupby("GESTOR")
        .agg(
            gestiones=("GESTOR", "size"),
            efectivas=("efectiva", "sum"),
            promesas=("es_promesa", "sum"),
            compromisos=("es_compromiso", "sum"),
            pagos=("es_pago", "sum"),
            recaudo=("MONTO", lambda s: round(float(s[df_mes.loc[s.index, "es_compromiso"] | df_mes.loc[s.index, "es_pago"]].sum()), 2)),
            dias_activos=("FECHA_ARCHIVO", lambda s: s.dt.date.nunique()),
        )
        .reset_index()
    )
    agg["efectivas"] = agg["efectivas"].astype(int)
    agg["promesas"] = agg["promesas"].astype(int)

    # Cartera principal por gestor (la de mayor volumen)
    cartera_principal = (
        df_mes.groupby(["GESTOR", "PROYECTO"])
        .size()
        .reset_index(name="n")
        .sort_values("n", ascending=False)
        .groupby("GESTOR")
        .first()
        .reset_index()[["GESTOR", "PROYECTO"]]
        .rename(columns={"PROYECTO": "cartera_principal"})
    )
    agg = agg.merge(cartera_principal, on="GESTOR", how="left")
    agg["cartera_principal"] = agg["cartera_principal"].fillna("OTRO")

    # ── KPIs derivados por asesor ─────────────────────────────────────────────
    agg["compromisos"] = agg["compromisos"].astype(int)
    agg["pagos"] = agg["pagos"].astype(int)
    g = agg["gestiones"].clip(lower=1)
    e = agg["efectivas"].clip(lower=1)
    d = agg["dias_activos"].clip(lower=1)
    agg["tasa_contacto"] = (agg["efectivas"] / g).round(4)          # RPC proxy
    agg["no_contacto"] = (1 - agg["tasa_contacto"]).round(4)
    agg["ptp_rate"] = (agg["promesas"] / e).round(4)               # promesa por contacto
    agg["conversion"] = (agg["promesas"] / g).round(4)             # promesa por gestión
    agg["gestiones_dia"] = (agg["gestiones"] / d).round(1)
    agg["promesas_dia"] = (agg["promesas"] / d).round(2)
    agg["ticket"] = (agg["recaudo"] / agg["promesas"].clip(lower=1)).round(2)

    # ── Metas ─────────────────────────────────────────────────────────────────
    metas_df = leer_metas()
    if len(metas_df) > 0:
        # Agregar metas por asesor (suma si tiene varias carteras)
        metas_agg = (
            metas_df.groupby("ASESOR")
            .agg(
                meta_gestiones=("META GESTIONES", "sum"),
                meta_efectivas=("META EFECTIVAS", "sum"),
                meta_promesas=("META PROMESAS", "sum"),
                meta_recaudo=("META RECAUDO", "sum"),
                cartera_meta=("CARTERA", lambda s: s.iloc[0] if len(s) == 1 else "VARIAS"),
            )
            .reset_index()
            .rename(columns={"ASESOR": "GESTOR"})
        )
        agg = agg.merge(metas_agg, on="GESTOR", how="left")
    else:
        for col in ["meta_gestiones", "meta_efectivas", "meta_promesas", "meta_recaudo"]:
            agg[col] = 0.0
        agg["cartera_meta"] = ""

    agg[["meta_gestiones", "meta_efectivas", "meta_promesas", "meta_recaudo"]] = (
        agg[["meta_gestiones", "meta_efectivas", "meta_promesas", "meta_recaudo"]].fillna(0.0)
    )

    # ── Semáforo ──────────────────────────────────────────────────────────────
    # Progreso esperado basado en días hábiles transcurridos vs mes completo
    # Estimamos ~22 días hábiles por mes; ajustar si se requiere más precisión
    dias_habiles_mes = 22
    dias_habiles_transcurridos = len(dias_procesados)
    pct_esperado = min(dias_habiles_transcurridos / dias_habiles_mes * 100, 100)

    def calcular_semaforo(row):
        kpis_con_meta = []
        for mtd, meta in [
            (row["gestiones"], row["meta_gestiones"]),
            (row["efectivas"], row["meta_efectivas"]),
            (row["promesas"], row["meta_promesas"]),
        ]:
            if meta > 0:
                kpis_con_meta.append(mtd / meta * 100)
        if not kpis_con_meta:
            return "sin_meta"
        pct_promedio = sum(kpis_con_meta) / len(kpis_con_meta)
        return semaforo(pct_promedio, pct_esperado)

    agg["estado"] = agg.apply(calcular_semaforo, axis=1)

    # ── Porcentajes de cumplimiento ───────────────────────────────────────────
    def pct(mtd, meta):
        return round(mtd / meta * 100, 1) if meta > 0 else None

    agg["pct_gestiones"] = agg.apply(lambda r: pct(r["gestiones"], r["meta_gestiones"]), axis=1)
    agg["pct_efectivas"] = agg.apply(lambda r: pct(r["efectivas"], r["meta_efectivas"]), axis=1)
    agg["pct_promesas"] = agg.apply(lambda r: pct(r["promesas"], r["meta_promesas"]), axis=1)
    agg["pct_recaudo"] = agg.apply(lambda r: pct(r["recaudo"], r["meta_recaudo"]), axis=1)

    # ── Motor de evaluación entre pares (benchmark de equipo) ─────────────────
    # Sin metas absolutas, evaluamos a cada asesor contra la mediana del equipo.
    # Para no sesgar la mediana con muestras minúsculas, se calcula sobre asesores
    # con actividad real (>=2 días y >=30 gestiones).
    validos = (agg["dias_activos"] >= 2) & (agg["gestiones"] >= 30)
    base = agg[validos] if validos.any() else agg
    bm = {
        "tasa_contacto": float(base["tasa_contacto"].median()),
        "ptp_rate": float(base["ptp_rate"].median()),
        "conversion": float(base["conversion"].median()),
        "gestiones_dia": float(base["gestiones_dia"].median()),
        "promesas_dia": float(base["promesas_dia"].median()),
    }

    # Percentiles dentro del equipo (0–1) para el score compuesto
    pr_vol = agg["gestiones_dia"].rank(pct=True)
    pr_con = agg["tasa_contacto"].rank(pct=True)
    pr_ptp = agg["ptp_rate"].rank(pct=True)
    pr_res = agg["promesas_dia"].rank(pct=True)
    # El resultado (promesas/día) y la conversión (PTP) pesan más que el volumen
    agg["score"] = (
        100 * (0.35 * pr_res + 0.30 * pr_ptp + 0.20 * pr_con + 0.15 * pr_vol)
    ).round(1)

    agg["nivel"] = agg["score"].apply(nivel_por_score)

    # Deltas vs la mediana del equipo (para la ficha del asesor)
    agg["delta_contacto"] = (agg["tasa_contacto"] - bm["tasa_contacto"]).round(4)
    agg["delta_ptp"] = (agg["ptp_rate"] - bm["ptp_rate"]).round(4)
    agg["delta_gestiones_dia"] = (agg["gestiones_dia"] - bm["gestiones_dia"]).round(1)

    def alertas_de(r) -> list[str]:
        a = []
        # Trabaja menos: volumen diario muy por debajo de la mediana
        if r["gestiones_dia"] < 0.5 * bm["gestiones_dia"]:
            a.append("actividad_baja")
        # Ausentismo: estuvo activo en menos de la mitad de los días del mes
        if r["dias_activos"] < 0.5 * len(dias_procesados):
            a.append("pocos_dias")
        # No convierte al contactar (con muestra suficiente)
        if r["efectivas"] >= 20 and r["ptp_rate"] < 0.5 * bm["ptp_rate"]:
            a.append("conversion_baja")
        # Marca mucho pero contacta poco
        if r["gestiones"] >= 100 and r["tasa_contacto"] < 0.6 * bm["tasa_contacto"]:
            a.append("contacto_bajo")
        # Pierde tiempo: mucho volumen, poco resultado
        if r["gestiones_dia"] > bm["gestiones_dia"] and r["promesas_dia"] < 0.5 * bm["promesas_dia"]:
            a.append("pierde_tiempo")
        return a

    agg["alertas"] = agg.apply(alertas_de, axis=1)

    # ── Ordenar por score desc ────────────────────────────────────────────────
    agg = agg.sort_values(["score", "promesas"], ascending=False).reset_index(drop=True)
    agg["ranking"] = agg.index + 1

    # ── Resumen general ───────────────────────────────────────────────────────
    total = len(agg)
    estados = agg["estado"].value_counts().to_dict()
    niveles = agg["nivel"].value_counts().to_dict()
    t_gest = int(agg["gestiones"].sum())
    t_efec = int(agg["efectivas"].sum())
    t_prom = int(agg["promesas"].sum())
    t_comp = int(agg["compromisos"].sum())
    t_pago = int(agg["pagos"].sum())
    t_recaudo = round(float(agg["recaudo"].sum()), 2)
    n_alertas = int(agg["alertas"].apply(lambda a: len(a) > 0).sum())
    resumen = {
        "total_gestores": total,
        "total_gestiones": t_gest,
        "total_efectivas": t_efec,
        "total_promesas": t_prom,
        "total_compromisos": t_comp,
        "total_pagos": t_pago,
        "total_recaudo": t_recaudo,
        "tasa_contacto": round(t_efec / max(t_gest, 1), 4),
        "ptp_rate": round(t_prom / max(t_efec, 1), 4),
        "conversion": round(t_prom / max(t_gest, 1), 4),
        "ticket_promedio": round(t_recaudo / max(t_prom, 1), 2),
        "gestiones_por_gestor": round(t_gest / max(total, 1), 1),
        "gestiones_por_dia": round(t_gest / max(len(dias_procesados), 1), 0),
        "gestores_elite": int(niveles.get("elite", 0)),
        "gestores_solido": int(niveles.get("solido", 0)),
        "gestores_promedio": int(niveles.get("promedio", 0)),
        "gestores_bajo": int(niveles.get("bajo", 0)),
        "gestores_con_alerta": n_alertas,
        "gestores_cumpliendo": int(estados.get("cumpliendo", 0)),
        "gestores_cerca": int(estados.get("cerca", 0)),
        "gestores_lejos": int(estados.get("lejos", 0)),
        "gestores_sin_meta": int(estados.get("sin_meta", 0)),
        "dias_procesados": len(dias_procesados),
        "dias_habiles_mes": dias_habiles_mes,
        "pct_mes_transcurrido": round(pct_esperado, 1),
    }

    benchmarks = {
        "tasa_contacto": round(bm["tasa_contacto"], 4),
        "ptp_rate": round(bm["ptp_rate"], 4),
        "conversion": round(bm["conversion"], 4),
        "gestiones_dia": round(bm["gestiones_dia"], 1),
        "promesas_dia": round(bm["promesas_dia"], 2),
    }

    # ── Construir lista final de gestores ─────────────────────────────────────
    gestores = []
    for _, r in agg.iterrows():
        gestores.append({
            "ranking": int(r["ranking"]),
            "gestor": r["GESTOR"],
            "cartera_principal": r["cartera_principal"],
            "nivel": r["nivel"],
            "score": float(r["score"]),
            "alertas": list(r["alertas"]),
            "estado": r["estado"],
            "gestiones": int(r["gestiones"]),
            "efectivas": int(r["efectivas"]),
            "promesas": int(r["promesas"]),
            "compromisos": int(r["compromisos"]),
            "pagos": int(r["pagos"]),
            "recaudo": round(float(r["recaudo"]), 2),
            "dias_activos": int(r["dias_activos"]),
            "tasa_contacto": float(r["tasa_contacto"]),
            "no_contacto": float(r["no_contacto"]),
            "ptp_rate": float(r["ptp_rate"]),
            "conversion": float(r["conversion"]),
            "gestiones_dia": float(r["gestiones_dia"]),
            "promesas_dia": float(r["promesas_dia"]),
            "ticket": float(r["ticket"]),
            "delta_contacto": float(r["delta_contacto"]),
            "delta_ptp": float(r["delta_ptp"]),
            "delta_gestiones_dia": float(r["delta_gestiones_dia"]),
            "meta_gestiones": int(r["meta_gestiones"]) if r["meta_gestiones"] > 0 else None,
            "meta_efectivas": int(r["meta_efectivas"]) if r["meta_efectivas"] > 0 else None,
            "meta_promesas": int(r["meta_promesas"]) if r["meta_promesas"] > 0 else None,
            "meta_recaudo": round(float(r["meta_recaudo"]), 2) if r["meta_recaudo"] > 0 else None,
            "pct_gestiones": r["pct_gestiones"],
            "pct_efectivas": r["pct_efectivas"],
            "pct_promesas": r["pct_promesas"],
            "pct_recaudo": r["pct_recaudo"],
        })

    # ── Ritmo por hora (MTD) — solo de archivos con formato ISO + hora ────────
    filas_con_hora = df_mes[df_mes["HORA"].notna()]
    if len(filas_con_hora) > 0:
        por_hora_mtd = (
            filas_con_hora.groupby(filas_con_hora["HORA"].astype(int))
            .agg(gestiones=("GESTOR", "size"), efectivas=("efectiva", "sum"), promesas=("es_promesa", "sum"))
            .reset_index()
            .rename(columns={"HORA": "hora"})
        )
        por_hora_mtd["efectivas"] = por_hora_mtd["efectivas"].astype(int)
        por_hora_mtd["promesas"] = por_hora_mtd["promesas"].astype(int)
        por_hora_list = por_hora_mtd.to_dict(orient="records")
    else:
        por_hora_list = []

    # ── Tendencia diaria (gestiones/promesas por día del mes) ─────────────────
    tendencia = (
        df_mes.groupby(df_mes["FECHA_ARCHIVO"].dt.date)
        .agg(gestiones=("GESTOR", "size"), efectivas=("efectiva", "sum"), promesas=("es_promesa", "sum"))
        .reset_index()
        .rename(columns={"FECHA_ARCHIVO": "fecha"})
        .sort_values("fecha")
    )
    tendencia["efectivas"] = tendencia["efectivas"].astype(int)
    tendencia["promesas"] = tendencia["promesas"].astype(int)
    tendencia_list = [
        {**r, "fecha": str(r["fecha"])} for r in tendencia.to_dict(orient="records")
    ]

    # ── Tendencia de promesas por cartera (sparkline) ─────────────────────────
    tend_cart = (
        df_mes.groupby(["PROYECTO", df_mes["FECHA_ARCHIVO"].dt.date])
        .agg(promesas=("es_promesa", "sum"))
        .reset_index()
        .rename(columns={"FECHA_ARCHIVO": "fecha"})
        .sort_values("fecha")
    )
    tend_por_cartera: dict[str, list] = {}
    for _, row in tend_cart.iterrows():
        tend_por_cartera.setdefault(row["PROYECTO"], []).append(
            {"fecha": str(row["fecha"]), "promesas": int(row["promesas"])}
        )

    # ── Detalle por cartera (con monto, pagos, asesores y score) ──────────────
    por_cartera = (
        df_mes.groupby("PROYECTO")
        .agg(
            gestiones=("GESTOR", "size"),
            efectivas=("efectiva", "sum"),
            promesas=("es_promesa", "sum"),
            compromisos=("es_compromiso", "sum"),
            pagos=("es_pago", "sum"),
            monto=("MONTO", lambda s: round(float(s[df_mes.loc[s.index, "es_compromiso"] | df_mes.loc[s.index, "es_pago"]].sum()), 2)),
            num_asesores=("GESTOR", "nunique"),
        )
        .reset_index()
        .sort_values("gestiones", ascending=False)
        .rename(columns={"PROYECTO": "cartera"})
    )
    for col in ["efectivas", "promesas", "compromisos", "pagos", "num_asesores"]:
        por_cartera[col] = por_cartera[col].astype(int)
    por_cartera["tasa_contacto"] = (por_cartera["efectivas"] / por_cartera["gestiones"].clip(lower=1)).round(4)
    por_cartera["ptp_rate"] = (por_cartera["promesas"] / por_cartera["efectivas"].clip(lower=1)).round(4)
    por_cartera["conversion"] = (por_cartera["promesas"] / por_cartera["gestiones"].clip(lower=1)).round(4)
    por_cartera["ticket"] = (por_cartera["monto"] / por_cartera["promesas"].clip(lower=1)).round(2)
    # Score de cartera: percentiles de contacto, conversión y volumen
    pc_con = por_cartera["tasa_contacto"].rank(pct=True)
    pc_ptp = por_cartera["ptp_rate"].rank(pct=True)
    pc_vol = por_cartera["gestiones"].rank(pct=True)
    por_cartera["score"] = (100 * (0.4 * pc_ptp + 0.35 * pc_con + 0.25 * pc_vol)).round(1)

    # Mejor asesor y conteo de alertas por cartera (vía cartera_principal del asesor)
    mejor_por_cartera = (
        agg.sort_values("promesas", ascending=False)
        .groupby("cartera_principal")["GESTOR"].first().to_dict()
    )
    alerta_por_cartera = (
        agg.assign(tiene_alerta=agg["alertas"].apply(lambda a: len(a) > 0))
        .groupby("cartera_principal")["tiene_alerta"].sum().to_dict()
    )

    por_cartera_list = []
    for _, r in por_cartera.iterrows():
        c = r["cartera"]
        por_cartera_list.append({
            "cartera": c,
            "gestiones": int(r["gestiones"]),
            "efectivas": int(r["efectivas"]),
            "promesas": int(r["promesas"]),
            "compromisos": int(r["compromisos"]),
            "pagos": int(r["pagos"]),
            "monto": float(r["monto"]),
            "num_asesores": int(r["num_asesores"]),
            "tasa_contacto": float(r["tasa_contacto"]),
            "ptp_rate": float(r["ptp_rate"]),
            "conversion": float(r["conversion"]),
            "ticket": float(r["ticket"]),
            "score": float(r["score"]),
            "nivel": nivel_por_score(float(r["score"])),
            "mejor_asesor": mejor_por_cartera.get(c, "—"),
            "asesores_alerta": int(alerta_por_cartera.get(c, 0)),
            "tendencia": tend_por_cartera.get(c, []),
        })

    # ── Distribución de categorías (global MTD) ───────────────────────────────
    categorias_list = [
        {
            "categoria": cat,
            "etiqueta": NORM.flags(cat)["etiqueta"],
            "contacto_efectivo": NORM.flags(cat)["contacto_efectivo"],
            "total": int(cnt),
        }
        for cat, cnt in df_mes["categoria"].value_counts().items()
    ]

    # ── Funnel de cobranza (MTD) ──────────────────────────────────────────────
    funnel = [
        {"etapa": "Gestiones", "valor": t_gest, "tasa": 1.0},
        {"etapa": "Contactos efectivos", "valor": t_efec, "tasa": round(t_efec / max(t_gest, 1), 4)},
        {"etapa": "Promesas de pago", "valor": t_prom, "tasa": round(t_prom / max(t_efec, 1), 4)},
        {"etapa": "Compromisos", "valor": t_comp, "tasa": round(t_comp / max(t_prom, 1), 4)},
        {"etapa": "Pagos", "valor": t_pago, "tasa": round(t_pago / max(t_comp, 1), 4)},
    ]

    # ── Insights automáticos (MTD) ────────────────────────────────────────────
    insights = construir_insights_mtd(resumen, por_cartera_list, agg, n_alertas)

    salida = {
        "generado": datetime.now().isoformat(timespec="seconds"),
        "periodo": f"{anio}-{mes_num}",
        "mes_nombre": mes_nombre,
        "dias_procesados": [str(d) for d in dias_procesados],
        "pct_mes_transcurrido": round(pct_esperado, 1),
        "resumen": resumen,
        "benchmarks": benchmarks,
        "gestores": gestores,
        "carteras": por_cartera_list,
        "categorias": categorias_list,
        "funnel": funnel,
        "insights": insights,
        "por_hora": por_hora_list,
        "tendencia_diaria": tendencia_list,
        # Compatibilidad con consumidores previos
        "por_cartera": por_cartera_list,
    }

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nListo -> {SALIDA}")
    print(f"Gestores: {total} | Elite: {niveles.get('elite',0)} | Solido: {niveles.get('solido',0)} | Promedio: {niveles.get('promedio',0)} | Bajo: {niveles.get('bajo',0)} | Con alerta: {n_alertas}")
    print(f"MTD: {t_gest:,} gestiones | {t_efec:,} efectivas | {t_prom:,} promesas | PTP {resumen['ptp_rate']:.1%} | Contacto {resumen['tasa_contacto']:.1%}")


if __name__ == "__main__":
    args = sys.argv[1:]
    main(args[0] if len(args) > 0 else None, args[1] if len(args) > 1 else None)
