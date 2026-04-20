@echo off
powershell.exe -Command "& { Compress-Archive -CompressionLevel Optimal -Path ..\html -DestinationPath html.zip -Force }"
