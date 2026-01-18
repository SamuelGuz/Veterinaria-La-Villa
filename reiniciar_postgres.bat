@echo off
echo Reiniciando PostgreSQL 16...
net stop postgresql-x64-16
timeout /t 3
net start postgresql-x64-16
echo.
echo PostgreSQL reiniciado. Presiona cualquier tecla para cerrar.
pause
