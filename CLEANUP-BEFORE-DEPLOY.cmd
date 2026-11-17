@echo off
chcp 65001 >nul
REM Don dep du an truoc khi deploy: CHUYEN (khong xoa) file rac vao thu muc _to_delete.
REM Xem lai thu muc _to_delete, thay on thi xoa han thu muc do. Chay file nay trong thu muc phurai-ui.
cd /d "%~dp0"
set T=_to_delete
if not exist "%T%" mkdir "%T%"
if not exist "%T%\backend" mkdir "%T%\backend"
if not exist "%T%\scripts" mkdir "%T%\scripts"

echo === Thu muc tam / build sinh ra lai duoc ===
if exist scratch move /y scratch "%T%\scratch" >nul
if exist dist move /y dist "%T%\dist" >nul
if exist frontend\dist move /y frontend\dist "%T%\frontend-dist" >nul
if exist frontend\dist-check move /y frontend\dist-check "%T%\frontend-dist-check" >nul

echo === File log / ket qua test o thu muc goc ===
for %%F in (local-schema.log QA-API-FLOW-results.json QA-FUKU-2026-11-08.csv) do if exist "%%F" move /y "%%F" "%T%\" >nul

echo === File test le trong backend (khong duoc import boi he thong) ===
for %%F in (test_staff.js test-admin-reviews.js test-bulk-identity.js test-db-today.js test-db.js test-floor-plan.js test-order.js test-reports.cjs) do if exist "backend\%%F" move /y "backend\%%F" "%T%\backend\" >nul

echo === Script thu nghiem cu trong scripts (giu lai deploy-env.test.mjs va cac script deploy) ===
for %%F in (simulate-review.js test-reservation-flows.js generate-intro-paths.html test-admin-audit.mjs test-kitchen-status.mjs test-manager-audit.mjs test-manager-operations.mjs test-payment-flow.mjs test-staff-audit.mjs test-staff-operations.mjs) do if exist "scripts\%%F" move /y "scripts\%%F" "%T%\scripts\" >nul

if not exist "%T%\backend-src" mkdir "%T%\backend-src"
echo === File debug / script thu nghiem / ban va trong backend\src (khong duoc import boi he thong) ===
for %%F in (alter.js check_db.js check_tables.js check-db.js fix_db.js test.js test_checkout_helper.js test_conn.js test_constraint.js test_promos.js test_query.js test_roles_db.js test-audit-query.js test-db.js test-e2e-qr-flow.js test-state-machine.js test-table-release.js test-timeline-schema.js) do if exist "backend\src\%%F" move /y "backend\src\%%F" "%T%\backend-src\" >nul
for %%F in (aiService.js.orig aiService.js.patch aiService.js.rej) do if exist "backend\src\services\%%F" move /y "backend\src\services\%%F" "%T%\backend-src\" >nul
REM middleware/managerMiddleware.js khong con noi nao import (requireManager chinh nam o middleware/auth.js)
if exist "backend\src\middleware\managerMiddleware.js" move /y "backend\src\middleware\managerMiddleware.js" "%T%\backend-src\" >nul

echo.
echo Xong. Cac file da duoc chuyen vao thu muc "%T%". Kiem tra lai roi chay thu:
echo    npm run build   va   npm run check:deploy
echo Neu moi thu on, xoa thu muc "%T%".
pause
