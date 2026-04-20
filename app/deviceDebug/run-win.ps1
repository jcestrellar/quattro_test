# Quattro を使用した Windows アプリのビルドと起動を行うスクリプト。
# -Build オプションでビルドのみを実行し、
# -Run オプションで起動のみを実行可能。
# どちらのオプションも指定しない場合は、ビルド → 起動の両方を実行する。
#
# 使用可能なオプション一覧：
#
#   -Build
#     Visual Studio の MSBuild を使ってデバッグビルドを行います。
#
#   -Run
#     ビルド済みの EXE を起動し、DevTools を自動で開きます。
#

param (
  [switch]$Build,
  [switch]$Run
)

# 引数がない場合は両方実行する
if (-not ($Build -or $Run)) {
  $Build = $true
  $Run = $true
}

# パス設定
$solutionPath = Resolve-Path (Join-Path $PSScriptRoot "..\build\win10\quattro.sln")
$exePath = Join-Path $PSScriptRoot "..\build\win10\x64\Debug\exe\Quattro.exe"
$vswherePath = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"

# vswhere.exe の存在確認
if (-not (Test-Path $vswherePath)) {
  Write-Error "❌ vswhere.exe が見つかりません。Visual Studio Installer が正しくインストールされているか確認してください。"
  exit 1
}

# MSBuild のパス取得
$msbuildPath = & "$vswherePath" -latest -requires Microsoft.Component.MSBuild -find MSBuild\**\Bin\MSBuild.exe | Select-Object -First 1

if (-not $msbuildPath) {
  Write-Error "❌ MSBuild のパスが取得できませんでした。Visual Studio のインストール状況を確認してください。"
  exit 1
}

# ビルド
if ($Build) {
  Write-Host "▶ MSBuild によるビルドを開始します..."
  & "$msbuildPath" "$solutionPath" /p:Configuration=Debug /p:Platform=x64

  if (-not (Test-Path $exePath)) {
    Write-Host "❌ ビルドに失敗しました。EXEが存在しません。"
    exit 1
  }
  Write-Host "✔ ビルド完了"
}

# 実行
if ($Run) {
  if (-not (Test-Path $exePath)) {
    Write-Host "❌ 実行ファイルが見つかりません。先にビルドしてください。"
    exit 1
  }

  # 既存プロセスを終了
  $processName = "Quattro"
  $running = Get-Process -Name $processName -ErrorAction SilentlyContinue
  if ($running) {
    Write-Host "🔄 既存の $processName プロセスを終了しています..."
    $running | Stop-Process -Force
    Start-Sleep -Seconds 1
  }

  # DevTools 自動起動用の環境変数設定
  $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--auto-open-devtools-for-tabs"

  # EXE を実行するために、作業ディレクトリを設定
  $workingDir = Resolve-Path (Join-Path $PSScriptRoot "..\build\win10")

  Write-Host "▶ EXE を起動します"
  Start-Process -FilePath $exePath -WorkingDirectory $workingDir
}
