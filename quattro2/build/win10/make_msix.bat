@echo off

@REM *************************************************************************************
@REM
@REM 1. Install "WinUI application development" workload by Visual Studio Installer.
@REM
@REM 2. Edit setup\Package.appxmanifest (XML file).
@REM      Package.Identity.name: <App GUID>
@REM      Package.Identity.Version: <App Version>
@REM      Properties.DisplayName: <App Name>
@REM      Applications.uap:VisualElements.DisplayName: <App Name>
@REM
@REM 3. Replace setup/Assets/*.png with App Images.
@REM      App Icons:
@REM        Square44x44Logo.targetsize-*.png                       (default)
@REM        Square44x44Logo.targetsize-*_altform-unplated.png      (dark theme)
@REM        Square44x44Logo.targetsize-*_altform-lightunplated.png (light theme)
@REM      Store Logo:
@REM        StoreLogo.png (50x50)
@REM      Tiles: (for Windows 10)
@REM        Square44x44Logo.scale-200.png
@REM        Square150x150Logo.scale-200.png
@REM        Wide310x150Logo.scale-200.png
@REM
@REM 4. Modify the following 'OUTPUT' and 'SMCTL_KEYPAIR_ALIAS' appropriately.
@REM
@REM *************************************************************************************

set OUTPUT=Quattro Installer.msix
set SMCTL_KEYPAIR_ALIAS=key_000000000

if exist "%OUTPUT%" (
    del /f /q "%OUTPUT%"
)

@REM -- check html link --
if not exist setup\html (
    powershell start-process setup\link.bat -verb runas
)

@REM -- create html.zip --
call _zip.bat

@REM -- restore packages.config --
msbuild quattro.vcxproj -t:restore -p:RestorePackagesConfig=true
if %ERRORLEVEL% neq 0 (
    goto end
)

@REM -- build quattro --
msbuild quattro.vcxproj /p:configuration=Release /p:platform=x64
if %ERRORLEVEL% neq 0 (
    goto end
)

@REM -- build msix --
msbuild setup\packaging.wapproj /p:configuration=Release /p:platform=x64 ^
  /p:AppxBundlePlatforms=x64 ^
  /p:UapAppxPackageBuildMode=SideloadOnly ^
  /p:AppxPackageSigningEnabled=false ^
  /p:AppxPackageOutput="..\%OUTPUT%"
if %ERRORLEVEL% neq 0 (
    goto end
)

@REM -- sign to msix --
smctl sign --simple --keypair-alias "%SMCTL_KEYPAIR_ALIAS%" --input "%OUTPUT%"

:end
