# -*- coding: utf-8 -*-
"""
Anonimizador de muestra para Spear Contact.

Uso:
    python anonimizar_muestra.py --columns      # solo imprime encabezados y estructura (sin valores)
    python anonimizar_muestra.py --anonimizar   # genera muestra anonimizada en data/sample/

Regla del proyecto: Claude nunca inspecciona el archivo original.
Este script imprime únicamente metadatos (nombres de columna, tipos, conteos)
y produce una copia anonimizada sobre la cual se trabaja.
"""
import sys
import re
import hashlib
from pathlib import Path

import pandas as pd

SRC = Path(r"C:\Users\Angel Reyna\Downloads\listas - 2026-06-11T154522.111.xls")
OUT_DIR = Path(r"C:\Users\Angel Reyna\spear-analytics\data\sample")
OUT = OUT_DIR / "muestra_anonimizada.csv"
SAMPLE_ROWS = 300

# Columnas que se consideran PII por nombre (regex, case-insensitive)
PII_NAME_PATTERNS = [
    r"gestor", r"\bobs\b",  # nombres de empleados y texto libre con posible PII
    r"nombre", r"apellido", r"cliente", r"deudor", r"titular", r"garante",
    r"conyuge", r"c[oó]nyuge", r"referencia",
    r"c[eé]dula", r"\bced\b", r"dni", r"ruc", r"identif", r"pasaporte",
    r"tel[eé]fono", r"\btel\b", r"celular", r"m[oó]vil", r"phone",
    r"correo", r"email", r"mail",
    r"direcci[oó]n", r"\bdir\b", r"domicilio",
    r"cuenta", r"\bcta\b", r"tarjeta", r"card", r"iban",
    r"empleador", r"trabajo", r"empresa",
]

# Patrones de valores que delatan PII aunque el nombre de columna no lo diga
VALUE_PATTERNS = {
    "email":   re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"),
    "cedula":  re.compile(r"\b(?:PE|E|N|\d{1,2})-\d{2,5}-\d{1,7}\b", re.I),
    "telefono": re.compile(r"\b(?:\+?507[- ]?)?[2369]\d{2}[- ]?\d{4}\b"),
    "digitos_largos": re.compile(r"\b\d{9,}\b"),  # posibles cuentas/tarjetas
}


def load(src: Path) -> pd.DataFrame:
    errors = []
    # 1) Excel binario clásico (.xls requiere xlrd)
    try:
        return pd.read_excel(src, dtype=str)
    except Exception as e:
        errors.append(f"read_excel: {e}")
    # 2) Muchos sistemas exportan "xls" que en realidad es una tabla HTML
    try:
        tables = pd.read_html(src)
        return tables[0].astype(str)
    except Exception as e:
        errors.append(f"read_html: {e}")
    # 3) Texto plano delimitado
    try:
        return pd.read_csv(src, sep=None, engine="python", dtype=str)
    except Exception as e:
        errors.append(f"read_csv: {e}")
    print("ERROR: no se pudo leer el archivo. Intentos:")
    for err in errors:
        print("  -", err)
    sys.exit(1)


def flag_pii_columns(df: pd.DataFrame) -> dict:
    """Devuelve {columna: razon} para columnas sospechosas de PII."""
    flags = {}
    for col in df.columns:
        col_str = str(col)
        for pat in PII_NAME_PATTERNS:
            if re.search(pat, col_str, re.I):
                flags[col] = f"nombre de columna coincide con '{pat}'"
                break
    # Detección por contenido (muestra de hasta 500 valores no nulos por columna)
    for col in df.columns:
        if col in flags:
            continue
        sample = df[col].dropna().astype(str).head(500)
        if sample.empty:
            continue
        for kind, rx in VALUE_PATTERNS.items():
            hits = sample.str.contains(rx).mean()
            if hits > 0.30:
                flags[col] = f"valores parecen '{kind}' ({hits:.0%} de coincidencia)"
                break
    return flags


def pseudo(val: str, prefix: str) -> str:
    """Reemplazo consistente: el mismo valor original siempre da el mismo alias."""
    h = hashlib.sha256(str(val).encode("utf-8")).hexdigest()[:8].upper()
    return f"{prefix}_{h}"


def scrub_cell(val):
    """Limpia patrones PII dentro de cualquier celda (capa extra de seguridad)."""
    if not isinstance(val, str):
        return val
    out = val
    out = VALUE_PATTERNS["email"].sub("EMAIL_OCULTO", out)
    out = VALUE_PATTERNS["cedula"].sub("CEDULA_OCULTA", out)
    out = VALUE_PATTERNS["telefono"].sub("TEL_OCULTO", out)
    out = VALUE_PATTERNS["digitos_largos"].sub("NUM_OCULTO", out)
    return out


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--columns"
    df = load(SRC)
    flags = flag_pii_columns(df)

    print(f"Archivo cargado: {SRC.name}")
    print(f"Filas: {len(df):,}  |  Columnas: {len(df.columns)}")
    print()
    print(f"{'#':>3}  {'COLUMNA':40} {'NO NULOS':>10}  PII")
    print("-" * 75)
    for i, col in enumerate(df.columns):
        nn = df[col].notna().sum()
        pii = flags.get(col, "")
        print(f"{i:>3}  {str(col)[:40]:40} {nn:>10,}  {('SI - ' + pii) if pii else ''}")

    if mode != "--anonimizar":
        print("\nModo --columns: no se generó ningún archivo. Revisa los flags y")
        print("vuelve a correr con --anonimizar (ajusta PII_NAME_PATTERNS si falta alguna).")
        return

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sample = df.head(SAMPLE_ROWS).copy()

    for col, reason in flags.items():
        prefix = "GESTOR" if re.search(r"gestor", str(col), re.I) else \
                 "ID" if re.search(r"c[eé]dula|cuenta|cta|tarjeta|identif|dni|ruc|documento", str(col), re.I) else \
                 "TEL" if re.search(r"tel|celular|m[oó]vil|phone", str(col), re.I) else \
                 "PERSONA" if re.search(r"nombre|apellido|cliente|deudor|titular|garante|conyuge|referencia", str(col), re.I) else \
                 "DATO"
        sample[col] = sample[col].map(lambda v: pseudo(v, prefix) if pd.notna(v) and str(v).strip() not in ("", "nan") else v)

    # Capa extra: limpiar patrones PII en TODAS las celdas restantes
    for col in sample.columns:
        sample[col] = sample[col].map(scrub_cell)

    sample.to_csv(OUT, index=False, encoding="utf-8-sig")
    print(f"\nMuestra anonimizada ({len(sample)} filas) escrita en:\n  {OUT}")


if __name__ == "__main__":
    main()
