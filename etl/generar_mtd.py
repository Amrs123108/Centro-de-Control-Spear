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
    python etl/generar_mtd.py --all        (procesa TODOS los meses en Z:)  <- recomendado
    python etl/generar_mtd.py              (solo el mes en curso)
    python etl/generar_mtd.py 2026 Junio   (año y mes explícito)
"""
import calendar
import json
import re
import sys
import unicodedata
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
DATA_DIR = Path(__file__).parent.parent / "src" / "data"
DIR_MTD = DATA_DIR / "mtd"                       # un JSON por período: mtd/2026-06.json
SALIDA = DATA_DIR / "mtd_gestores.json"          # compatibilidad: copia del período más reciente

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
# MARLIN ZELEDON = sistema predictivo (no es un asesor). NO se borra: sus
# gestiones SÍ cuentan para los totales y las carteras, pero queda FUERA de la
# lista de asesores evaluados (ranking, fichas, alertas y mediana del equipo).
# Se identifica por su nombre normalizado (sin acentos, mayúsculas).
GESTOR_PREDICTIVO = "MARLIN ZELEDON"
# Cuentas que NO son asesores reales y que sí se descartan por completo (no
# suman a nada): cuentas de práctica/pruebas y personal que no gestiona
# (supervisión/coordinación). Se excluyen para no contaminar los benchmarks.
# OJO: las claves se comparan SIN acentos (CAPACITACIÓN -> CAPACITACION) y se
# incluye el typo "CAPATICATION" que aparece en algunos archivos.
GESTORES_EXCLUIDOS = (
    "CAPACITACION", "CAPATICATION", "PRUEBA", "TEST", "DEMO",
    "EVER RODR", "ORIS JARAMILLO", "ANIBAL ABREGO",
)


def es_gestor_predictivo(nombre) -> bool:
    """True si la fila pertenece al sistema predictivo (Marlin)."""
    return isinstance(nombre, str) and GESTOR_PREDICTIVO in norm_nombre(nombre)


def _sin_acentos(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def norm_nombre(s) -> str:
    """Clave canónica para cruzar nombres entre gestiones y metas:
    MAYÚSCULAS, sin acentos, espacios colapsados. El archivo de metas escribe
    sin tildes y con espacios irregulares; las gestiones traen tildes."""
    if not isinstance(s, str):
        return ""
    return " ".join(_sin_acentos(s.strip().upper()).split())


# Correcciones de typos en el archivo de metas -> nombre canónico de gestiones.
# Confirmados con Angel (jun 2026). Clave y valor en forma normalizada.
ALIAS_ASESOR_META = {
    "ARAMISM MARTINEZ": "ARAMIS MARTINEZ",   # typo "ARAMISM"
    "YINORIS RAMOS": "YINORI RAMOS",          # gestiones la traen sin la S final
}

# Nombre de cartera en META CARTERA -> cartera consolidada del panel.
ALIAS_CARTERA_META = {
    "BAC CASTIGO": "BAC",
    "CAJA DE AHORROS ACTIVA": "CAJA DE AHORROS",  # Recovery = castigo, ya calza
}


def normalizar_gestor(nombre: str) -> str | None:
    if not isinstance(nombre, str) or not nombre.strip():
        return None
    clave = norm_nombre(nombre)
    if any(excl in clave for excl in GESTORES_EXCLUIDOS):
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

    # Limpiar gestor — None para cuentas descartadas (práctica/no-asesor).
    # El predictivo (Marlin) NO se descarta: se conserva y se marca aparte.
    df["es_predictivo"] = df["GESTOR"].apply(es_gestor_predictivo)
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


def leer_metas(mes_nombre: str | None = None) -> pd.DataFrame:
    """Metas POR ASESOR (hoja 'META DE ASESORES'), filtradas al mes en proceso.

    El archivo trae una columna 'FECHA DE LA META' con el nombre del mes
    (p. ej. 'JUNIO'). Filtramos por ese mes para que las metas de un mes no
    contaminen otro. Metas gest/efec/prom son DIARIAS; recaudo es MENSUAL.
    Devuelve además SUPERVISOR y una clave de cruce '_KEY' (nombre normalizado,
    con typos corregidos) para unir con las gestiones sin fallar por acentos.
    """
    cols_base = ["ASESOR", "CARTERA", "META GESTIONES", "META PROMESAS",
                 "META EFECTIVAS", "META RECAUDO", "SUPERVISOR", "_KEY"]
    if not METAS_PATH.exists():
        print(f"ADVERTENCIA: No se encontro {METAS_PATH}. Metas omitidas.")
        return pd.DataFrame(columns=cols_base)
    try:
        df = pd.read_excel(METAS_PATH, sheet_name="META DE ASESORES", dtype=str)
        df.columns = [c.strip().upper() for c in df.columns]
        df = df.dropna(subset=["ASESOR"])

        # Filtrar al mes en proceso si el archivo trae la columna de fecha
        if "FECHA DE LA META" in df.columns and mes_nombre:
            objetivo = mes_nombre.strip().upper()
            mes_col = df["FECHA DE LA META"].fillna("").str.strip().str.upper()
            df = df[mes_col == objetivo]
            if len(df) == 0:
                print(f"ADVERTENCIA: Sin metas para {objetivo} en el archivo. Mes sin metas.")
                return pd.DataFrame(columns=cols_base)

        for col in ["META GESTIONES", "META PROMESAS", "META EFECTIVAS", "META RECAUDO"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
            else:
                df[col] = 0.0
        df["SUPERVISOR"] = (df["SUPERVISOR"].fillna("").str.strip()
                            if "SUPERVISOR" in df.columns else "")
        # Clave de cruce: normalizar + corregir typos confirmados
        df["_KEY"] = df["ASESOR"].map(lambda a: ALIAS_ASESOR_META.get(norm_nombre(a), norm_nombre(a)))
        return df
    except Exception as e:
        print(f"ADVERTENCIA: No se pudo leer metas de asesores: {e}")
        return pd.DataFrame(columns=cols_base)


def leer_metas_cartera(mes_nombre: str | None = None) -> dict[str, dict]:
    """Metas POR CARTERA (hoja 'META CARTERA'), filtradas al mes en proceso.

    Las metas de cartera son del MES COMPLETO (no diarias). Devuelve un dict
    {clave_cartera_normalizada -> {meta_gestiones, meta_efectivas, meta_promesas,
    meta_recaudo, supervisor}}. La clave aplica ALIAS_CARTERA_META para calzar
    con los nombres consolidados del panel.
    """
    if not METAS_PATH.exists():
        return {}
    try:
        df = pd.read_excel(METAS_PATH, sheet_name="META CARTERA", dtype=str)
        df.columns = [c.strip().upper() for c in df.columns]
        df = df.dropna(subset=["CARTERA"])
        if "FECHA DE LA META" in df.columns and mes_nombre:
            objetivo = mes_nombre.strip().upper()
            mes_col = df["FECHA DE LA META"].fillna("").str.strip().str.upper()
            df = df[mes_col == objetivo]
        if len(df) == 0:
            return {}
        ren = {
            "META GESTIONES #": "meta_gestiones",
            "META PROMESAS #": "meta_promesas",
            "META EFECTIVAS #": "meta_efectivas",
            "META RECAUDO TOTAL": "meta_recaudo",
        }
        out: dict[str, dict] = {}
        for _, r in df.iterrows():
            clave = ALIAS_CARTERA_META.get(norm_nombre(r["CARTERA"]), norm_nombre(r["CARTERA"]))
            def num(col):
                return float(pd.to_numeric(r.get(col), errors="coerce")) if pd.notna(r.get(col)) else 0.0
            out[clave] = {
                "meta_gestiones": num("META GESTIONES #"),
                "meta_efectivas": num("META EFECTIVAS #"),
                "meta_promesas": num("META PROMESAS #"),
                "meta_recaudo": num("META RECAUDO TOTAL"),
                "supervisor": str(r.get("SUPERVISOR", "") or "").strip(),
            }
        return out
    except Exception as e:
        print(f"ADVERTENCIA: No se pudo leer metas de cartera: {e}")
        return {}


def peso_dia(d: date_type) -> float:
    """Peso de un día hábil: L-V = 1.0, sábado = 0.5, domingo = 0.
    Los sábados se trabajan a media jornada (lo confirma el volumen ~mitad)."""
    wd = d.weekday()  # 0=lunes ... 5=sábado, 6=domingo
    if wd == 6:
        return 0.0
    if wd == 5:
        return 0.5
    return 1.0


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


def regenerar_indices() -> None:
    """Reconstruye, a partir de los JSON en src/data/mtd/:
       - periodos-manifest.json : lista liviana de períodos (para el selector)
       - mtd/index.ts           : barrel con los datasets completos (server)
       - mtd_gestores.json      : copia del período más reciente (compatibilidad)
    """
    archivos = sorted(DIR_MTD.glob("20*.json"))
    periodos = []
    for f in archivos:
        d = json.loads(f.read_text(encoding="utf-8"))
        dias = d.get("dias_procesados", [])
        r = d.get("resumen", {})
        periodos.append({
            "periodo": d["periodo"],
            "mes_nombre": d["mes_nombre"],
            "anio": d["periodo"][:4],
            "dias": len(dias),
            "primer_dia": dias[0] if dias else None,
            "ultimo_dia": dias[-1] if dias else None,
            "generado": d.get("generado"),
            "total_gestores": r.get("total_gestores", 0),
            "total_gestiones": r.get("total_gestiones", 0),
            "total_efectivas": r.get("total_efectivas", 0),
            "total_promesas": r.get("total_promesas", 0),
            "total_recaudo": r.get("total_recaudo", 0),
            "tasa_contacto": r.get("tasa_contacto", 0),
            "ptp_rate": r.get("ptp_rate", 0),
            "con_metas": r.get("gestores_sin_meta", 0) < r.get("total_gestores", 0),
        })
    periodos.sort(key=lambda x: x["periodo"], reverse=True)  # más reciente primero

    manifest = {
        "generado": datetime.now().isoformat(timespec="seconds"),
        "default": periodos[0]["periodo"] if periodos else None,
        "periodos": periodos,
    }
    (DATA_DIR / "periodos-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Barrel TS (import estático de cada período → bundle de Next)
    lineas = ['import type { MTDData } from "@/types/mtd";', ""]
    mapeo = []
    for p in periodos:
        var = "p_" + p["periodo"].replace("-", "_")
        lineas.append(f'import {var} from "./{p["periodo"]}.json";')
        mapeo.append((p["periodo"], var))
    lineas += ["", "export const DATASETS: Record<string, MTDData> = {"]
    for periodo, var in mapeo:
        lineas.append(f'  "{periodo}": {var} as unknown as MTDData,')
    lineas.append("};")
    (DIR_MTD / "index.ts").write_text("\n".join(lineas) + "\n", encoding="utf-8")

    # Compatibilidad: el archivo único apunta al período más reciente
    if periodos:
        ultimo = DIR_MTD / f'{periodos[0]["periodo"]}.json'
        SALIDA.write_text(ultimo.read_text(encoding="utf-8"), encoding="utf-8")

    print(f"Indices regenerados: {[p['periodo'] for p in periodos]} | default {manifest['default']}")


def descubrir_periodos() -> list[tuple[str, str]]:
    """Encuentra TODAS las carpetas {anio}/{mes}/Gestiones con archivos .xls(x).

    Devuelve [(anio, mes_nombre), ...] ordenado cronológicamente. Es lo que
    permite que el actualizador tome cualquier mes nuevo que el usuario suba a
    Z: sin tener que indicarlo a mano.
    """
    encontrados: list[tuple[str, str]] = []
    if not BASE_GESTIONES.exists():
        return encontrados
    for anio_dir in sorted(BASE_GESTIONES.iterdir()):
        if not (anio_dir.is_dir() and anio_dir.name.isdigit() and len(anio_dir.name) == 4):
            continue
        for mes_dir in sorted(anio_dir.iterdir()):
            if not mes_dir.is_dir():
                continue
            if mes_dir.name.strip().lower() not in _MESES_ES:
                continue  # ignora carpetas que no son meses
            gestiones = mes_dir / "Gestiones"
            if gestiones.is_dir() and any(gestiones.glob("*.xls*")):
                encontrados.append((anio_dir.name, mes_dir.name))
    encontrados.sort(key=lambda am: (am[0], _MESES_ES[am[1].strip().lower()]))
    return encontrados


def procesar_todos() -> None:
    """Procesa todos los meses presentes en Z: y regenera los índices.

    Es el punto de entrada del actualizador de un clic: el usuario sube data a
    las carpetas y este recorre cada mes con datos, sin omisiones.
    """
    periodos = descubrir_periodos()
    if not periodos:
        raise SystemExit(f"Sin carpetas con gestiones bajo {BASE_GESTIONES}")
    print(f"Periodos detectados: {', '.join(f'{a}/{m}' for a, m in periodos)}\n")
    ok: list[str] = []
    fallidos: list[str] = []
    for anio, mes in periodos:
        print(f"---------- {anio} / {mes} ----------")
        try:
            main(anio, mes)
            ok.append(f"{anio}-{mes}")
        except SystemExit as e:
            # Mes sin carpeta/archivos: se salta sin marcarlo como error.
            print(f"  >> Saltado {anio}/{mes}: {e}")
        except Exception as e:
            # Un mes con un Excel abierto/bloqueado o corrupto NO debe abortar los
            # demás. Se reporta y se continúa con el resto de las carpetas.
            import traceback
            print(f"  >> ERROR en {anio}/{mes}: {e}")
            traceback.print_exc()
            fallidos.append(f"{anio}-{mes}")
        print()
    # main() ya regenera índices en cada vuelta; aunque alguno falle, los demás
    # quedan reflejados. Si nada se procesó, igualamos los índices a lo que haya.
    if not ok:
        regenerar_indices()
    print(f"== Actualizacion completa: {len(ok)} periodos OK -> {', '.join(ok) or '(ninguno)'} ==")
    if fallidos:
        print(f"== ATENCION: {len(fallidos)} periodo(s) con error -> {', '.join(fallidos)} ==")
        print("   Causa frecuente: un archivo .xlsx de ese mes esta ABIERTO en Excel "
              "o bloqueado. Cierralo y vuelve a ejecutar.")


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
    if "es_predictivo" not in df_mes.columns:
        df_mes["es_predictivo"] = False
    df_mes["es_predictivo"] = df_mes["es_predictivo"].fillna(False)
    dias_procesados = sorted(dias_fechas)
    n_pred = int(df_mes["es_predictivo"].sum())
    print(f"\nTotal filas MTD: {len(df_mes):,} | Dias: {len(dias_procesados)} | "
          f"Predictivo (Marlin): {n_pred:,} filas")

    # df_mes  = TODO (asesores + predictivo) -> totales, carteras, embudo, tendencias.
    # df_ases = SOLO asesores reales (sin Marlin) -> ranking, fichas, alertas, mediana.
    # df_pred = SOLO el predictivo (Marlin) -> línea aparte por cartera y total.
    df_ases = df_mes[~df_mes["es_predictivo"]].copy()
    df_pred = df_mes[df_mes["es_predictivo"]].copy()

    def _resumen_pred(df: pd.DataFrame) -> dict | None:
        """Bloque de números del predictivo (Marlin) para una porción de datos.
        Devuelve None si no hubo actividad del predictivo en esa porción."""
        if len(df) == 0:
            return None
        g = int(len(df))
        e = int(df["efectiva"].sum())
        p = int(df["es_promesa"].sum())
        comp = int(df["es_compromiso"].sum())
        pag = int(df["es_pago"].sum())
        monto = round(float(df.loc[df["es_compromiso"] | df["es_pago"], "MONTO"].sum()), 2)
        return {
            "gestiones": g,
            "efectivas": e,
            "promesas": p,
            "compromisos": comp,
            "pagos": pag,
            "monto": monto,
            "tasa_contacto": round(e / max(g, 1), 4),
            "ptp_rate": round(p / max(e, 1), 4),
            "conversion": round(p / max(g, 1), 4),
        }

    # ── Agregar por gestor (SOLO asesores; el predictivo va aparte) ────────────
    agg = (
        df_ases.groupby("GESTOR")
        .agg(
            gestiones=("GESTOR", "size"),
            efectivas=("efectiva", "sum"),
            promesas=("es_promesa", "sum"),
            compromisos=("es_compromiso", "sum"),
            pagos=("es_pago", "sum"),
            recaudo=("MONTO", lambda s: round(float(s[df_ases.loc[s.index, "es_compromiso"] | df_ases.loc[s.index, "es_pago"]].sum()), 2)),
            dias_activos=("FECHA_ARCHIVO", lambda s: s.dt.date.nunique()),
        )
        .reset_index()
    )
    agg["efectivas"] = agg["efectivas"].astype(int)
    agg["promesas"] = agg["promesas"].astype(int)

    # Cartera principal por gestor (la de mayor volumen) — solo asesores
    cartera_principal = (
        df_ases.groupby(["GESTOR", "PROYECTO"])
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

    # ── Metas por asesor ──────────────────────────────────────────────────────
    # El cruce se hace por '_KEY' (nombre normalizado sin acentos + typos
    # corregidos), NO por el string exacto, para no perder metas por tildes.
    agg["_KEY"] = agg["GESTOR"].map(norm_nombre)
    metas_df = leer_metas(mes_nombre)
    if len(metas_df) > 0:
        def primer_no_vacio(s):
            return next((x for x in s if isinstance(x, str) and x.strip()), "")
        metas_agg = (
            metas_df.groupby("_KEY")
            .agg(
                meta_gestiones=("META GESTIONES", "sum"),
                meta_efectivas=("META EFECTIVAS", "sum"),
                meta_promesas=("META PROMESAS", "sum"),
                meta_recaudo=("META RECAUDO", "sum"),
                supervisor=("SUPERVISOR", primer_no_vacio),
                cartera_meta=("CARTERA", lambda s: s.iloc[0] if s.nunique() == 1 else "VARIAS"),
            )
            .reset_index()
        )
        agg = agg.merge(metas_agg, on="_KEY", how="left")
    else:
        for col in ["meta_gestiones", "meta_efectivas", "meta_promesas", "meta_recaudo"]:
            agg[col] = 0.0
        agg["supervisor"] = ""
        agg["cartera_meta"] = ""

    agg[["meta_gestiones", "meta_efectivas", "meta_promesas", "meta_recaudo"]] = (
        agg[["meta_gestiones", "meta_efectivas", "meta_promesas", "meta_recaudo"]].fillna(0.0)
    )
    agg["supervisor"] = agg["supervisor"].fillna("") if "supervisor" in agg.columns else ""
    agg["cartera_meta"] = agg["cartera_meta"].fillna("") if "cartera_meta" in agg.columns else ""

    # ── Cumplimiento "a la fecha" (ritmo) ─────────────────────────────────────
    # IMPORTANTE: las metas del archivo tienen unidades MIXTAS:
    #   · META GESTIONES / EFECTIVAS / PROMESAS  -> son DIARIAS (por día)
    #   · META RECAUDO                           -> es MENSUAL (mes completo)
    # Por eso el % de cumplimiento se mide contra lo ESPERADO A LA FECHA:
    #   - diarias  : esperado = meta_diaria × días procesados
    #   - mensual  : esperado = meta_mensual × (días procesados ÷ días hábiles)
    # 100 % = el asesor va exactamente al ritmo necesario para cumplir la meta.
    # Días hábiles ponderados: L-V = 1.0, sábado = 0.5, domingo = 0.
    #   · dias_habiles_mes  = total del mes (denominador de las metas mensuales)
    #   · dias_transcurridos = lo que va corrido (con sábados a 0.5)
    ndias_cal = calendar.monthrange(int(anio), int(mes_num))[1]
    dias_habiles_mes = sum(peso_dia(date_type(int(anio), int(mes_num), dd)) for dd in range(1, ndias_cal + 1))
    dias_transcurridos = sum(peso_dia(d) for d in dias_procesados) or 1.0
    frac_mes = min(dias_transcurridos / dias_habiles_mes, 1.0) if dias_habiles_mes else 1.0

    def pct_diaria(mtd, meta_diaria):
        """% del ritmo esperado a la fecha para una meta DIARIA.
        Esperado = meta_diaria × días hábiles transcurridos (sábados a 0.5)."""
        if meta_diaria and meta_diaria > 0:
            esperado = meta_diaria * dias_transcurridos
            return round(mtd / max(esperado, 1e-9) * 100, 1)
        return None

    def pct_mensual(mtd, meta_mensual):
        """% del ritmo esperado a la fecha para una meta MENSUAL.
        Esperado = meta_mensual × (días transcurridos ÷ días hábiles del mes)."""
        if meta_mensual and meta_mensual > 0:
            esperado = meta_mensual * frac_mes
            return round(mtd / max(esperado, 1e-9) * 100, 1)
        return None

    agg["pct_gestiones"] = agg.apply(lambda r: pct_diaria(r["gestiones"], r["meta_gestiones"]), axis=1)
    agg["pct_efectivas"] = agg.apply(lambda r: pct_diaria(r["efectivas"], r["meta_efectivas"]), axis=1)
    agg["pct_promesas"] = agg.apply(lambda r: pct_diaria(r["promesas"], r["meta_promesas"]), axis=1)
    agg["pct_recaudo"] = agg.apply(lambda r: pct_mensual(r["recaudo"], r["meta_recaudo"]), axis=1)

    # ── Cumplimiento global del asesor (promedio de los % a la fecha) ──────────
    # Confirmado con Angel: por ahora entran gestiones, efectivas y promesas
    # (peso igual). El RECAUDO NO entra al score todavía: el "recaudo" actual es
    # monto comprometido+pagado (no caja real cobrada), por eso da %s inflados;
    # se incorporará en Etapa 4 con las carpetas de Pagos. SIN tope: así un %
    # disparado delata metas mal cargadas para corregirlas. 100 % = al ritmo.
    def cumplimiento_de(row):
        pcts = [p for p in (row["pct_gestiones"], row["pct_efectivas"],
                            row["pct_promesas"]) if pd.notna(p)]
        return round(sum(pcts) / len(pcts), 1) if pcts else None

    agg["cumplimiento"] = agg.apply(cumplimiento_de, axis=1)

    def estado_de(c):
        if pd.isna(c):
            return "sin_meta"
        if c >= 90:
            return "cumpliendo"
        if c >= 70:
            return "cerca"
        return "lejos"

    agg["estado"] = agg["cumplimiento"].apply(estado_de)

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
    agg["score_equipo"] = (
        100 * (0.35 * pr_res + 0.30 * pr_ptp + 0.20 * pr_con + 0.15 * pr_vol)
    ).round(1)

    # ── Score final: por META si la tiene; si no, por mediana del equipo ──────
    # Confirmado con Angel: meses sin metas (abril/mayo) usan la mediana.
    # Niveles por cumplimiento de meta: elite ≥110, sólido ≥90, promedio ≥70.
    def nivel_meta(c):
        if c >= 110:
            return "elite"
        if c >= 90:
            return "solido"
        if c >= 70:
            return "promedio"
        return "bajo"

    tiene_meta = agg["cumplimiento"].notna()
    agg["score"] = agg["score_equipo"]
    agg["score_base"] = "equipo"
    agg["nivel"] = agg["score_equipo"].apply(nivel_por_score)
    if tiene_meta.any():  # meses sin metas (p. ej. marzo) quedan solo con mediana
        agg.loc[tiene_meta, "score"] = agg.loc[tiene_meta, "cumplimiento"].astype(float)
        agg.loc[tiene_meta, "score_base"] = "meta"
        agg.loc[tiene_meta, "nivel"] = agg.loc[tiene_meta, "cumplimiento"].apply(nivel_meta)

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
    # Totales de la OPERACIÓN: incluyen al sistema predictivo (Marlin), por eso
    # se calculan sobre df_mes (todo) y NO sobre agg (que es solo asesores).
    total = len(agg)  # asesores evaluados (sin el predictivo)
    estados = agg["estado"].value_counts().to_dict()
    niveles = agg["nivel"].value_counts().to_dict()
    t_gest = int(len(df_mes))
    t_efec = int(df_mes["efectiva"].sum())
    t_prom = int(df_mes["es_promesa"].sum())
    t_comp = int(df_mes["es_compromiso"].sum())
    t_pago = int(df_mes["es_pago"].sum())
    t_recaudo = round(float(df_mes.loc[df_mes["es_compromiso"] | df_mes["es_pago"], "MONTO"].sum()), 2)
    # Volumen solo de asesores (para el promedio por asesor de la fuerza laboral)
    t_gest_ases = int(agg["gestiones"].sum())
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
        "gestiones_por_gestor": round(t_gest_ases / max(total, 1), 1),
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
        "dias_habiles_mes": round(dias_habiles_mes, 1),
        "dias_transcurridos": round(dias_transcurridos, 1),
        "pct_mes_transcurrido": round(frac_mes * 100, 1),
        # Aporte del sistema predictivo (Marlin), ya incluido en los totales de
        # arriba. Se expone aparte para poder mostrarlo etiquetado.
        "predictivo": _resumen_pred(df_pred),
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
            "pct_gestiones": None if pd.isna(r["pct_gestiones"]) else float(r["pct_gestiones"]),
            "pct_efectivas": None if pd.isna(r["pct_efectivas"]) else float(r["pct_efectivas"]),
            "pct_promesas": None if pd.isna(r["pct_promesas"]) else float(r["pct_promesas"]),
            "pct_recaudo": None if pd.isna(r["pct_recaudo"]) else float(r["pct_recaudo"]),
            "cumplimiento": None if pd.isna(r["cumplimiento"]) else float(r["cumplimiento"]),
            "score_base": str(r["score_base"]),
            "supervisor": str(r.get("supervisor", "") or ""),
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

    # ── Tendencia diaria (gestiones/efectivas/promesas/recaudo por día) ───────
    # Se incluye recaudo por día para poder comparar mes vs mes al mismo punto
    # del mes (líneas diarias en la vista de Comparativa).
    tendencia = (
        df_mes.groupby(df_mes["FECHA_ARCHIVO"].dt.date)
        .agg(
            gestiones=("GESTOR", "size"),
            efectivas=("efectiva", "sum"),
            promesas=("es_promesa", "sum"),
            recaudo=("MONTO", lambda s: round(float(s[df_mes.loc[s.index, "es_compromiso"] | df_mes.loc[s.index, "es_pago"]].sum()), 2)),
        )
        .reset_index()
        .rename(columns={"FECHA_ARCHIVO": "fecha"})
        .sort_values("fecha")
    )
    tendencia["efectivas"] = tendencia["efectivas"].astype(int)
    tendencia["promesas"] = tendencia["promesas"].astype(int)
    tendencia_list = [
        {**r, "fecha": str(r["fecha"]), "recaudo": round(float(r["recaudo"]), 2)}
        for r in tendencia.to_dict(orient="records")
    ]

    # ── Tendencia diaria por cartera (gestiones/efectivas/promesas) ───────────
    # Antes solo promesas; ahora las tres métricas para poder comparar el trabajo
    # de cada día por cartera y detectar días de baja producción.
    tend_cart = (
        df_mes.groupby(["PROYECTO", df_mes["FECHA_ARCHIVO"].dt.date])
        .agg(gestiones=("GESTOR", "size"), efectivas=("efectiva", "sum"), promesas=("es_promesa", "sum"))
        .reset_index()
        .rename(columns={"FECHA_ARCHIVO": "fecha"})
        .sort_values("fecha")
    )
    tend_por_cartera: dict[str, list] = {}
    for _, row in tend_cart.iterrows():
        tend_por_cartera.setdefault(row["PROYECTO"], []).append(
            {
                "fecha": str(row["fecha"]),
                "gestiones": int(row["gestiones"]),
                "efectivas": int(row["efectivas"]),
                "promesas": int(row["promesas"]),
            }
        )

    # ── Detalle por cartera (con monto, pagos, asesores y score) ──────────────
    # Las métricas de cartera SÍ incluyen al predictivo (df_mes). El conteo de
    # asesores, en cambio, se toma solo de los asesores reales (df_ases): Marlin
    # no suma como "1 asesor" de la cartera aunque sí aporte gestiones.
    por_cartera = (
        df_mes.groupby("PROYECTO")
        .agg(
            gestiones=("GESTOR", "size"),
            efectivas=("efectiva", "sum"),
            promesas=("es_promesa", "sum"),
            compromisos=("es_compromiso", "sum"),
            pagos=("es_pago", "sum"),
            monto=("MONTO", lambda s: round(float(s[df_mes.loc[s.index, "es_compromiso"] | df_mes.loc[s.index, "es_pago"]].sum()), 2)),
        )
        .reset_index()
        .sort_values("gestiones", ascending=False)
        .rename(columns={"PROYECTO": "cartera"})
    )
    asesores_por_cartera = df_ases.groupby("PROYECTO")["GESTOR"].nunique()
    por_cartera["num_asesores"] = (
        por_cartera["cartera"].map(asesores_por_cartera).fillna(0).astype(int)
    )
    # Aporte del predictivo (Marlin) por cartera, para la línea etiquetada.
    pred_por_cartera = {c: _resumen_pred(g) for c, g in df_pred.groupby("PROYECTO")}
    for col in ["efectivas", "promesas", "compromisos", "pagos"]:
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

    # Metas de cartera (mensuales) + supervisor de cada cartera.
    metas_cartera = leer_metas_cartera(mes_nombre)
    # Supervisor por cartera de respaldo: el más frecuente entre sus asesores.
    sup_por_cartera: dict[str, str] = {}
    con_sup = agg[agg["supervisor"].astype(str).str.strip() != ""]
    if len(con_sup) > 0:
        sup_por_cartera = (
            con_sup.groupby("cartera_principal")["supervisor"]
            .agg(lambda s: s.value_counts().idxmax()).to_dict()
        )

    por_cartera_list = []
    for _, r in por_cartera.iterrows():
        c = r["cartera"]
        # Cumplimiento de cartera: metas MENSUALES -> esperado = meta × frac_mes
        mc = metas_cartera.get(norm_nombre(c))
        if mc:
            mcg, mce = mc["meta_gestiones"], mc["meta_efectivas"]
            mcp, mcr = mc["meta_promesas"], mc["meta_recaudo"]
            p_g = pct_mensual(r["gestiones"], mcg)
            p_e = pct_mensual(r["efectivas"], mce)
            p_p = pct_mensual(r["promesas"], mcp)
            p_r = pct_mensual(r["monto"], mcr)
            # Recaudo NO entra al cumplimiento de cartera (igual que el asesor): Etapa 4.
            pcts_c = [p for p in (p_g, p_e, p_p) if p is not None]
            cumpl_c = round(sum(pcts_c) / len(pcts_c), 1) if pcts_c else None
            sup_c = mc["supervisor"] or sup_por_cartera.get(c, "")
        else:
            mcg = mce = mcp = mcr = 0.0
            p_g = p_e = p_p = p_r = None
            cumpl_c = None
            sup_c = sup_por_cartera.get(c, "")
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
            # Metas de cartera (mensuales) y cumplimiento a la fecha
            "meta_gestiones": int(mcg) if mcg > 0 else None,
            "meta_efectivas": int(mce) if mce > 0 else None,
            "meta_promesas": int(mcp) if mcp > 0 else None,
            "meta_recaudo": round(mcr, 2) if mcr > 0 else None,
            "pct_gestiones": p_g,
            "pct_efectivas": p_e,
            "pct_promesas": p_p,
            "pct_recaudo": p_r,
            "cumplimiento": cumpl_c,
            "estado": estado_de(cumpl_c),
            "supervisor": sup_c,
            # Aporte del sistema predictivo (Marlin) en esta cartera, ya incluido
            # en las cifras de arriba. None si el predictivo no trabajó la cartera.
            "predictivo": pred_por_cartera.get(c),
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

    # ── Supervisores: cumplimiento de sus asesores Y de sus carteras ──────────
    # Confirmado con Angel: el supervisor se mide por AMBAS cosas. Promedio
    # 50/50 por ahora (ajustable). Solo aplica a meses con metas cargadas.
    sup_set = {g["supervisor"] for g in gestores if g.get("supervisor")}
    sup_set |= {c["supervisor"] for c in por_cartera_list if c.get("supervisor")}
    supervisores_list = []
    for sup in sorted(sup_set):
        ases = [g for g in gestores if g.get("supervisor") == sup and g.get("cumplimiento") is not None]
        carts = [c for c in por_cartera_list if c.get("supervisor") == sup and c.get("cumplimiento") is not None]
        cmpl_ase = round(sum(g["cumplimiento"] for g in ases) / len(ases), 1) if ases else None
        cmpl_car = round(sum(c["cumplimiento"] for c in carts) / len(carts), 1) if carts else None
        partes = [x for x in (cmpl_ase, cmpl_car) if x is not None]
        score_sup = round(sum(partes) / len(partes), 1) if partes else None
        supervisores_list.append({
            "supervisor": sup,
            "n_asesores": len(ases),
            "cumplimiento_asesores": cmpl_ase,
            "asesores_cumpliendo": sum(1 for g in ases if g["cumplimiento"] >= 90),
            "n_carteras": len(carts),
            "cumplimiento_carteras": cmpl_car,
            "carteras": sorted({c["cartera"] for c in carts}),
            "score": score_sup,
            "nivel": nivel_meta(score_sup) if score_sup is not None else "sin_meta",
        })
    supervisores_list.sort(key=lambda x: (x["score"] is None, -(x["score"] or 0)))

    # ── Insights automáticos (MTD) ────────────────────────────────────────────
    insights = construir_insights_mtd(resumen, por_cartera_list, agg, n_alertas)

    salida = {
        "generado": datetime.now().isoformat(timespec="seconds"),
        "periodo": f"{anio}-{mes_num}",
        "mes_nombre": mes_nombre,
        "dias_procesados": [str(d) for d in dias_procesados],
        "pct_mes_transcurrido": round(frac_mes * 100, 1),
        "resumen": resumen,
        "benchmarks": benchmarks,
        "gestores": gestores,
        "carteras": por_cartera_list,
        "categorias": categorias_list,
        "funnel": funnel,
        "insights": insights,
        "por_hora": por_hora_list,
        "tendencia_diaria": tendencia_list,
        "supervisores": supervisores_list,
        # Compatibilidad con consumidores previos
        "por_cartera": por_cartera_list,
    }

    DIR_MTD.mkdir(parents=True, exist_ok=True)
    periodo_key = f"{anio}-{mes_num}"
    archivo_periodo = DIR_MTD / f"{periodo_key}.json"
    archivo_periodo.write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nListo -> {archivo_periodo}")

    # Regenerar manifiesto + barrel + copia de compatibilidad a partir de TODOS
    # los períodos presentes en la carpeta (el orden de ejecución no importa).
    regenerar_indices()

    print(f"Gestores: {total} | Elite: {niveles.get('elite',0)} | Solido: {niveles.get('solido',0)} | Promedio: {niveles.get('promedio',0)} | Bajo: {niveles.get('bajo',0)} | Con alerta: {n_alertas}")
    print(f"MTD: {t_gest:,} gestiones | {t_efec:,} efectivas | {t_prom:,} promesas | PTP {resumen['ptp_rate']:.1%} | Contacto {resumen['tasa_contacto']:.1%}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0].lower() in ("--all", "-a", "all", "todos"):
        procesar_todos()
    else:
        main(args[0] if len(args) > 0 else None, args[1] if len(args) > 1 else None)
