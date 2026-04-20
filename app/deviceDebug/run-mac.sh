#!/bin/sh

# Quattro を使用した macOS アプリのビルドと起動を行うスクリプト。
# オプションを指定することで、特定の処理のみを個別に実行できます。
# オプションを指定しない場合は、すべての処理を順に実行します。
#
# 使用可能なオプション一覧：
#
#   -b, --build
#     macOS 向けのデバッグビルドを行います。
#
#   -r, --run
#     ビルド済みのアプリ（.app）を起動します。
#
# 補足：
#   macOS アプリ上で「要素の詳細を表示（Webインスペクタ）」を自動で開くことはできません。
#   開発メニューやコンテキストメニューの操作をスクリプトで制御する方法が存在しないため、
#   手動で右クリックメニューから「要素の詳細を表示」を選択する必要があります。

will_build=false
will_run=false

if [ "$1" = "" ]; then
  will_build=true
  will_run=true
else
  while [ $# -gt 0 ]; do
    case $1 in
    -b | --build)
      will_build=true
      ;;
    -r | --run)
      will_run=true
      ;;
    -*)
      echo "invalid option: $1"
      exit 1
      ;;
    *)
      echo "unexpected argument: $1"
      ;;
    esac
    shift
  done
fi

XCODE_PROJECT_PATH=../build/mac/quattro.xcodeproj
SCHEME=macOS
CONFIGURATION=Debug
BUILD_ROOT=../build/mac/build
BUILD_DIR="$BUILD_ROOT/macOS"
APP_PATH="$BUILD_DIR/Build/Products/$CONFIGURATION/quattro.app"
APP_NAME="Quattro"

if ${will_build}; then
  echo "▶ macOS アプリをビルド中..."
  xcodebuild -project "$XCODE_PROJECT_PATH" -scheme "$SCHEME" -configuration "$CONFIGURATION" -derivedDataPath "$BUILD_DIR"
fi

if ${will_run}; then
  if [ ! -d "$APP_PATH" ]; then
    echo "❌ .app が見つかりません: $APP_PATH"
    echo "   先に -b オプションでビルドを行ってください。"
    exit 1
  fi

  echo "▶ アプリが既に起動している場合は終了します..."
  pkill -x "$APP_NAME" 2>/dev/null

  # サブプロセスが終了するまで待ちたいので Delay する
  sleep 1.0

  echo "▶ アプリを起動します..."
  open "$APP_PATH"
fi
