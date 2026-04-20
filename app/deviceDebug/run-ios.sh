#!/bin/sh

# Quattro を使用したアプリを iPhone 上でデバッグするためのスクリプト。
# オプションを指定することで、特定の処理のみを個別に実行できます。
# オプションを指定しない場合は、すべての処理を順に実行します。
#
# 使用可能なオプション一覧：
#
#   -b, --build
#     iPhone 実機インストール用のデバッグビルドファイルを生成します。
#
#   -r, --run
#     生成したビルドファイルを iPhone 実機へインストールして実行します。
#
#   -i, --inspect
#     Safari を起動し、Web インスペクタ機能で iPhone 上の WebView をデバッグ可能な状態にします。

will_build=false
will_run=false
will_inspect=false

if [ "$1" = "" ]; then
    will_build=true
    will_run=true
    will_inspect=true
else
    while [ $# -gt 0 ]; do
        case $1 in
        -b | --build)
            will_build=true
            ;;
        -r | --run)
            will_run=true
            ;;
        -i | --inspect)
            will_inspect=true
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

XCODE_PROJECT_PATH="../build/mac/quattro.xcodeproj"
SCHEME="iOS"
SDK="iphoneos"
CONFIGURATION="Debug"
BUILD_ROOT="../build/mac/build"
BUILD_DIR="$BUILD_ROOT/iOS"
APP_PATH="$BUILD_DIR/Build/Products/$CONFIGURATION-$SDK/quattro.app"
APPLE_SCRIPT="./ios/script.applescript"

if ${will_build}; then
  echo "▶ iPhone 実機向けアプリをビルド中..."

  if [ ! -d "$XCODE_PROJECT_PATH" ]; then
    echo "❌ Xcode プロジェクトが見つかりません: $XCODE_PROJECT_PATH"
    exit 1
  fi

  xcodebuild -project "$XCODE_PROJECT_PATH" \
             -scheme "$SCHEME" \
             -sdk "$SDK" \
             -configuration "$CONFIGURATION" \
             -derivedDataPath "$BUILD_DIR" || {
    echo "❌ ビルドに失敗しました。"
    exit 1
  }
fi

if ${will_run}; then
  if [ ! -d "$APP_PATH" ]; then
    echo "❌ .app が見つかりません: $APP_PATH"
    echo "   先に -b オプションでビルドを行ってください。"
    exit 1
  fi

  echo "▶ 接続中の iPhone の iOS バージョンを確認します..."
  # devicectlコマンドの出力を直接jqに渡し、必要な値を抽出
  # devicectlコマンドは、iOS/iPadOS 17 以降の端末のみ実行可能
  device_info=$(xcrun devicectl list devices --json-output - | jq -r '.result.devices[] | select(.connectionProperties.tunnelState == "connected") | "\(.deviceProperties.osVersionNumber) \(.identifier)"')

  # 抽出した値をそれぞれの変数に分割して格納
  read -r IOS_VERSION DEVICE_IDENTIFIER <<< "$device_info"

  # デバイスが見つかったかどうかの条件分岐
  if [ -n "$IOS_VERSION" ] && [ -n "$DEVICE_IDENTIFIER" ]; then
    # devicectlコマンドで、デバイスが見つかった
    echo "✅ 接続済みデバイスのiOSバージョン: $IOS_VERSION"
    echo "✅ 接続済みデバイスのidentifier: $DEVICE_IDENTIFIER"

    # アプリをインストールし、インストールURLを取得
    INSTALLATION_URL=$(xcrun devicectl device install app --device "$DEVICE_IDENTIFIER" "$APP_PATH" | grep "installationURL" | sed -e 's/• installationURL: //')

    # インストールURLから「file://」を削除して、アプリのパスを抽出
    APP_URL_TRIMMED=$(echo "$INSTALLATION_URL" | sed 's/file:\/\///')

    # アプリを起動する
    echo "▶ アプリを起動します..."
    xcrun devicectl device process launch --device "$DEVICE_IDENTIFIER" "$APP_URL_TRIMMED"
  else
    # devicectlコマンドで、デバイスが見つからなかった
    echo "iOS 16 以下のデバイスが接続されていると想定して処理します"
    echo "▶ iPhone 実機へインストールして起動します (ios-deploy)..."
    ios-deploy --debug --justlaunch --bundle "$APP_PATH" || {
      echo "❌ ios-deploy による実機起動に失敗しました。" >&2
      exit 1
    }
  fi
fi

if ${will_inspect}; then
  echo "▶ Safari で Web インスペクタを起動します..."

  if [ ! -f "$APPLE_SCRIPT" ]; then
    echo "❌ AppleScript ファイルが見つかりません: $APPLE_SCRIPT"
    exit 1
  fi

  sleep 1
  osascript "$APPLE_SCRIPT" || {
    echo "❌ AppleScript の実行に失敗しました。"
    exit 1
  }
fi