# Centro de Control Spear

Plataforma ejecutiva de inteligencia operativa de **Spear Contact** (contact center y cobranzas, Panamá). Consolida indicadores de recuperación, productividad y comportamiento de cartera para directivos y gerencia.

## Arquitectura

```
PC local (privado)                        Nube (GitHub + Vercel)
┌────────────────────────────┐           ┌─────────────────────────────┐
│ Data cruda (FTP .txt, xls) │           │ Next.js 16 + TypeScript     │
│   ↓ etl/ (Python)          │  agregados│ Login con roles (JWT)       │
│ Normalización + KPIs       │ ────────▶ │ Dashboards ejecutivos       │
│ (sin PII hacia afuera)     │           │                             │
└────────────────────────────┘           └─────────────────────────────┘
```

**Regla de oro:** ningún dato personal (PII) sale de la PC local. A la plataforma solo suben agregados; los gestores aparecen pseudonimizados.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/app` | Aplicación Next.js (App Router): login, panel, dashboard |
| `src/data` | KPIs agregados (JSON, sin PII) generados por el ETL |
| `etl/` | Scripts Python: anonimización, catálogo de clasificaciones, generación de KPIs |
| `data/` | Data local (**ignorada por git** — nunca se commitea) |

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:3000
```

Credenciales: ver `.env.local` (no versionado). Para crear usuarios nuevos, agregar entradas al JSON de `CCS_USERS` con el hash SHA-256 de la contraseña (instrucciones en `.env.example`).

## ETL (Python 3.12)

```bash
# Anonimizar una muestra para desarrollo (nunca inspeccionar data cruda)
python etl/anonimizar_muestra.py --anonimizar

# Validar el catálogo contra un archivo nuevo (detecta clasificaciones sin mapear)
python etl/normalizar_clasificaciones.py --validar "<archivo>"

# Regenerar los KPIs del dashboard
python etl/generar_kpis.py "<archivo de gestiones>"
```

El catálogo `etl/catalogo_clasificaciones.json` es **extensible**: cuando una cartera nueva traiga clasificaciones desconocidas, el validador las reporta y se agregan reglas sin tocar código.

## Despliegue (Vercel)

1. Subir el repo a GitHub (la data está excluida por `.gitignore`).
2. Importar el proyecto en Vercel.
3. Configurar en *Project Settings → Environment Variables*: `AUTH_SECRET` y `CCS_USERS` (valores de `.env.local`).
4. Deploy. Cada push a `main` despliega automáticamente.
