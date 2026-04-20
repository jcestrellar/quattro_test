#!/bin/sh

# Quattro を使用したアプリを Android 実機でデバッグ実行するためのスクリプト。
# オプションを指定することで、特定の処理のみを個別に実行できます。
# オプションを指定しない場合は、すべての処理を順に実行します。
#
# 使用可能なオプション一覧：
#
#   -b, --build
#     デバッグビルドファイルを生成し、実機にインストールしてアプリを起動します。
#
#   -i, --inspect
#     Google Chrome を起動し、chrome://inspect/#devices を自動で開きます。

will_build=false
will_inspect=false

if [ "$1" = "" ]; then
    will_build=true
    will_inspect=true
else
    while (($# >0)); do
        case $1 in
        -b | --build)
            will_build=true
            ;;
        -i | --inspect)
            will_inspect=true
            ;;
        -*)
            echo "invalid option"
            exit 1
            ;;
        *)
            echo "argument $1"
            ;;
        esac
        shift
    done
fi

ANDROID_PROJECT_PATH="../build/android"
JAVA_HOME_PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
PLATFORM_TOOLS_PATH="$HOME/Library/Android/sdk/platform-tools"
APP_ACTIVITY="jp.co.roland.quattro.starterkit/quattro.app.AppMainActivity"
APPLE_SCRIPT="./android/script.applescript"

if ${will_build}; then
  echo "▶ Android アプリをビルド中..."

  if [ ! -d "$ANDROID_PROJECT_PATH" ]; then
    echo "❌ Android プロジェクトが見つかりません: $ANDROID_PROJECT_PATH"
    exit 1
  fi

  (
    cd "$ANDROID_PROJECT_PATH"
    chmod +x ./gradlew
    export JAVA_HOME="$JAVA_HOME_PATH"
    ./gradlew :app:installBasicDebug
  ) || {
    echo "❌ ビルドまたはインストールに失敗しました。"
    exit 1
  }

  export PATH="$PATH:$PLATFORM_TOOLS_PATH"

  if ! command -v adb >/dev/null 2>&1; then
    echo "❌ adb が見つかりません。Android SDK のパスを確認してください。"
    exit 1
  fi

  echo "▶ アプリを実機で起動します..."
  adb shell am start -n "$APP_ACTIVITY" || {
    echo "❌ 実機でのアプリ起動に失敗しました。"
    exit 1
  }
fi

if ${will_inspect}; then
  echo "▶ DevTools を開きます（chrome://inspect）..."

  if [ ! -f "$APPLE_SCRIPT" ]; then
    echo "❌ AppleScript ファイルが見つかりません: $APPLE_SCRIPT"
    exit 1
  fi

  osascript "$APPLE_SCRIPT" || {
    echo "❌ AppleScript の実行に失敗しました。"
    exit 1
  }
fi
