# Quattro を使用したアプリを Android 実機でデバッグ実行するためのスクリプト。
# オプションを指定することで、特定の処理のみを個別に実行できます。
# オプションを指定しない場合は、すべての処理を順に実行します。
#
# 使用可能なオプション一覧：
#
#   -Build
#     デバッグビルドファイルを生成し、実機にインストールしてアプリを起動します。
#
# 補足：
#   本来は、Mac 環境時と同様に Chrome を起動して Android 実機の DevTools ページ（chrome://inspect）を自動で開く
#   ところまで行いたかったが、Windows 環境ではコマンドラインからそのページを直接開く方法が
#   提供されていないため、断念しました。
#   DevTools の表示は手動で行ってください（chrome://inspect/#devices にアクセス）。

param (
    [switch]$Build
)

if (-not $Build) {
    $Build = $true
}

# Android Studio に同梱の JDK を使用
$androidStudioJava = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path $androidStudioJava) {
    $env:JAVA_HOME = $androidStudioJava
    $env:PATH += ";$env:JAVA_HOME\bin"
} else {
    Write-Warning "❌ Android Studio の Java が見つかりません。JAVA_HOME を確認してください。"
}

if ($Build) {
    $androidPath = Join-Path $PSScriptRoot "../build/android"
    Push-Location $androidPath
    ./gradlew.bat :app:installBasicDebug
    Pop-Location

    $env:PATH += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
    adb shell am start -n jp.co.roland.quattro.starterkit/quattro.app.AppMainActivity
}

