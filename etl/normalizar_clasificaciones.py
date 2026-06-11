# -*- coding: utf-8 -*-
"""
Normalizador de clasificaciones de gestión — Centro de Control Spear.

Uso como librería:
    from normalizar_clasificaciones import Normalizador
    n = Normalizador()
    n.normalizar("TELÉFONO APAGADO >")   # -> "NO_CONTACTO"

Uso como CLI (gobernanza del catálogo):
    python normalizar_clasificaciones.py --validar <archivo>
    Imprime la distribución por categoría canónica y lista los valores
    SIN_MAPEAR con sus conteos, para agregar reglas al catálogo cuando
    una cartera nueva traiga clasificaciones nuevas.
"""
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

import pandas as pd

CATALOGO = Path(__file__).parent / "catalogo_clasificaciones.json"


def _limpiar(texto: str) -> str:
    """Mayúsculas, sin tildes, espacios colapsados — para que DÓLAR == DOLAR."""
    t = unicodedata.normalize("NFD", str(texto))
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", t.upper()).strip()


class Normalizador:
    def __init__(self, ruta_catalogo: Path = CATALOGO):
        cat = json.loads(Path(ruta_catalogo).read_text(encoding="utf-8"))
        self.categorias = cat["categorias"]
        self.default = cat["default"]
        self.reglas = [
            (re.compile(r["patron"]), r["categoria"]) for r in cat["reglas"]
        ]
        self._cache: dict[str, str] = {}

    def normalizar(self, valor) -> str:
        """Devuelve la categoría canónica para una clasificación cruda."""
        if valor is None or (isinstance(valor, float) and pd.isna(valor)):
            return self.default
        crudo = str(valor)
        if crudo in self._cache:
            return self._cache[crudo]
        limpio = _limpiar(crudo)
        resultado = self.default
        for rx, categoria in self.reglas:
            if rx.search(limpio):
                resultado = categoria
                break
        self._cache[crudo] = resultado
        return resultado

    def flags(self, categoria: str) -> dict:
        return self.categorias.get(categoria, self.categorias[self.default])


def _cargar_archivo(ruta: str) -> pd.DataFrame:
    """Lector tolerante: Excel real, 'xls' que es HTML, o texto delimitado."""
    intentos = []
    try:
        return pd.read_excel(ruta, dtype=str)
    except Exception as e:
        intentos.append(f"read_excel: {e}")
    try:
        return pd.read_html(ruta)[0].astype(str).replace("nan", pd.NA)
    except Exception as e:
        intentos.append(f"read_html: {e}")
    try:
        return pd.read_csv(ruta, sep=None, engine="python", dtype=str)
    except Exception as e:
        intentos.append(f"read_csv: {e}")
    raise SystemExit("No se pudo leer el archivo:\n" + "\n".join(intentos))


def validar(ruta: str, columna: str = "CLASIFICACION") -> None:
    df = _cargar_archivo(ruta)
    if columna not in df.columns:
        raise SystemExit(f"El archivo no tiene columna '{columna}'. Columnas: {list(df.columns)}")

    n = Normalizador()
    serie = df[columna]
    categorias = serie.map(n.normalizar)

    total = len(df)
    print(f"Registros: {total:,}\n")
    print(f"{'CATEGORIA':25} {'REGISTROS':>10}  {'%':>6}  CONTACTO_EF  POSITIVO")
    print("-" * 70)
    for cat, cnt in categorias.value_counts().items():
        f = n.flags(cat)
        print(f"{cat:25} {cnt:>10,}  {cnt/total:>5.1%}  "
              f"{'SI' if f['contacto_efectivo'] else 'no':>11}  "
              f"{'SI' if f['resultado_positivo'] else 'no':>8}")

    sin_mapear = Counter(
        str(v) for v, c in zip(serie, categorias) if c == "SIN_MAPEAR" and pd.notna(v)
    )
    if sin_mapear:
        print(f"\nVALORES SIN MAPEAR ({len(sin_mapear)} distintos) — agregar reglas al catálogo:")
        for valor, cnt in sin_mapear.most_common(50):
            print(f"  {cnt:>6,}  {valor}")
    else:
        print("\nSin valores pendientes de mapear (los nulos caen en SIN_MAPEAR).")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--validar":
        validar(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "CLASIFICACION")
    else:
        print(__doc__)
