@echo off
title Vercel Icin Oyunu Derle
color 0A

echo ===================================================
echo      OYUN VERCEL ICIN HAZIRLANIYOR...
echo ===================================================
echo.
echo Lutfen bekleyin, bu islem birkac saniye surebilir...
echo.

call npm run build

echo.
echo ===================================================
echo  ISLEM TAMAMLANDI!
echo ===================================================
echo "dist" klasoru basariyla olusturuldu. 
echo Vercel'e bu projeyi yuklediginizde otomatik olarak
echo bu klasor kullanilacaktir.
echo.
pause
