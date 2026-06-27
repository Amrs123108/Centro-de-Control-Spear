@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo    ACTUALIZAR  -  Centro de Control Spear
echo ============================================================
echo.
echo Paso 1/2  Leyendo gestiones de Z: y metas de OneDrive...
echo (NO copia datos personales: solo columnas seguras, sin PII)
echo.

python etl\generar_mtd.py --all
if errorlevel 1 (
  echo.
  echo *** Error al generar los datos. Revisa el mensaje de arriba. ***
  echo.
  pause
  exit /b 1
)

echo.
echo Paso 2/2  Publicando a Vercel (subiendo el panel a GitHub)...
echo.

git add src/data
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Actualizar datos del panel"
  git push
  if errorlevel 1 (
    echo.
    echo *** No se pudo subir a GitHub. Revisa conexion/credenciales. ***
    echo     Los datos locales SI quedaron actualizados.
    echo.
    pause
    exit /b 1
  )
  echo.
  echo OK. Vercel redesplegara el panel en 1-2 minutos.
) else (
  echo No hubo datos nuevos que publicar (ya estaba al dia).
)

echo.
echo ============================================================
echo    LISTO.
echo ============================================================
echo.
echo - En tu PC (npm run dev): refresca la pagina para ver los cambios.
echo - En Vercel: espera ~1-2 min y recarga el sitio publicado.
echo.
pause
