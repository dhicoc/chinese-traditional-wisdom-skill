@echo off
setlocal
chcp 65001 >nul
set "ROOT=%~dp0.."

echo === Chinese Traditional Wisdom AI Agent Workflow - Setup ===
echo.
echo [1/5] Installing Python offline-oracle dependencies...
python -m pip install -r "%ROOT%\requirements.txt"
if errorlevel 1 exit /b 1

echo.
echo [2/5] Verifying Python offline-oracle imports...
python "%ROOT%\scripts\check_python_oracles.py"
if errorlevel 1 exit /b 1

echo.
echo [3/5] Installing the authoritative TypeScript runtime...
call pnpm --dir "%ROOT%\apps\visual" install --frozen-lockfile
if errorlevel 1 exit /b 1

echo.
echo [4/5] Verifying TypeScript contracts and tool discovery...
call pnpm --dir "%ROOT%\apps\visual" typecheck
if errorlevel 1 exit /b 1
call pnpm --dir "%ROOT%\apps\visual" engine:list >nul
if errorlevel 1 exit /b 1

echo.
echo [5/5] Setup complete.
echo.
echo Authoritative Agent runtime:
echo   pnpm engine:list
echo   pnpm engine:describe bazi_calculate
echo   pnpm engine bazi_calculate src/__fixtures__/local-tools/bazi_calculate.success.json
echo.
echo Dashboard:
echo   pnpm dev
echo.
echo Python dependencies were installed for offline maintenance cross-checks only.
echo They are not a user-facing calculation source and must not replace ToolEnvelope results.
endlocal
