; Inno Setup (http://www.jrsoftware.org/isinfo.php)
;
; 1. modify the #define declarations appropriately according to your App.
; 2. do not forget to generate new AppId in [Setup] section.
; 3. uncomment 'SignTool' and 'SignedUninstaller' in [Setup] for the certificate,
;    and add [Tools] - [Configure Sign Tools...] as follows:
;      name: signtool
;      command: "{vsdir}\signtool.exe" sign /n "Roland Corporation" /t http://timestamp.digicert.com /fd SHA256 $f

#define MySetupName		"Roland_Quattro_Installer"
#define MyAppName		"Quattro"
#define MyAppVersion	"1.0.0.1"
#define MyAppVersionStr	"1.00 (1)"
#define MyAppPublisher	"Roland Corporation"
#define MyAppExeName	"Quattro.exe"
#define MyAppDirName	"Roland"
#define MyCopyright		"Copyright (c) 2024 Roland Corporation."

[Setup]
AppId = {{9954B747-8582-499E-A883-18114EEA530C}}
AppName = {#MyAppDirName} {#MyAppName}
AppVerName = {#MyAppDirName} {#MyAppName}
AppVersion = {#MyAppVersionStr}
AppPublisher = {#MyAppPublisher}
AppPublisherURL = {cm:MyAppURL}
AppSupportURL = {cm:MySupportURL}
AppUpdatesURL = {cm:MySupportURL}
DefaultDirName = {commonpf}\{#MyAppDirName}\{#MyAppName}
DefaultGroupName = {#MyAppDirName} {#MyAppName}
UsePreviousAppDir =  no
DisableProgramGroupPage = yes
AppCopyright = {#MyCopyright}
VersionInfoVersion = {#MyAppVersion}
AllowNoIcons = yes
OutputDir = .\
OutputBaseFilename = {#MySetupName}
Compression = lzma
SolidCompression = yes
;SignTool = signtool
;SignedUninstaller = yes
UninstallDisplayIcon = {app}\{#MyAppExeName}
ChangesAssociations = yes
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
SetupIconFile=compiler:SetupClassicIcon.ico

[Languages]
Name: "english";  MessagesFile: "compiler:Default.isl"
Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"

[CustomMessages]
english.MyAppURL = http://www.roland.com/
japanese.MyAppURL = http://www.roland.com/jp/
english.MySupportURL = http://www.roland.com/support/
japanese.MySupportURL = http://www.roland.com/jp/support/

[Files]
Source: "x64\Release\exe\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; 

[Registry]
;Root: HKCU; Subkey: "Software\Roland\{#MyAppName}"; Flags: uninsdeletekey

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
;Name: {localappdata}\{#MyAppDirName}\{#MyAppName}; Type: filesandordirs;
