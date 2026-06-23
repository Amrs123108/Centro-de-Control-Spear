import pandas as pd
import warnings
warnings.filterwarnings('ignore')

SAFE = ['GESTOR','CLASIFICACION','FECHA_CLAS','MONEDA','MONTO','FECHA','ESTADO','TIPO_DE_TRAMITE','PROYECTO']
t = pd.read_html(r'Z:\My Folders\General de Gestiones\2026\Junio\Gestiones\Reporte General de Gestiones 01 de Junio.xls')[0]
df = t[SAFE].copy()
print(f'Total filas: {len(df)}')
print()

for col in ['PROYECTO', 'ESTADO', 'TIPO_DE_TRAMITE', 'MONEDA']:
    vc = df[col].value_counts().head(10)
    print(f'=== {col} ({df[col].nunique()} unicos) ===')
    for v, c in vc.items():
        print(f'  {v}: {c}')
    print()

print('=== CLASIFICACION (top 20) ===')
for v, c in df['CLASIFICACION'].value_counts().head(20).items():
    print(f'  {c:>5}  {v}')
print()

df['FECHA_DT'] = pd.to_datetime(df['FECHA_CLAS'], errors='coerce')
print(f'Rango fechas: {df["FECHA_DT"].min()} a {df["FECHA_DT"].max()}')

monto = pd.to_numeric(df['MONTO'], errors='coerce')
monto_ok = monto[(monto > 0) & (monto < 500000)]
print(f'Monto: min={monto_ok.min():.2f}  max={monto_ok.max():.2f}  suma={monto_ok.sum():,.2f}  registros={len(monto_ok)}')
