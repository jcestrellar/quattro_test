#!/bin/sh

#  Xcode - Build Settings
#  [Signing]
#    Code Signing Style : Manual
#    Development Team : Roland Corporation
#    Code Signing Identity : Developer ID Application
#    Code Signing Entitlements: macOS/macOS.entitlements
#    Code Signing Inject Base Entitlements : No
#    Enable Hardened Runtime : Yes
#    Other Code Signing Flags : --timestamp
#    Provisioning Profile : None

#
# 1. register "notarytool-password" to keychain
#     > xcrun notarytool store-credentials "notarytool-password" \
#           --apple-id "<AC_USERNAME>" \
#           --team-id  "<AC_TEAMID>" \
#           --password "<AC_APP_PASSWORD>"
# 2. modify 'TITLE', 'OUTPUT' and 'TARGET_DIR' appropriately
#

TITLE="Quattro"
OUTPUT="Quattro.pkg"
TARGET_DIR="/Applications/Roland/"

CERT_NAME="Developer ID Installer: Roland Corporation"

set -e

PKG_DIR="./pkg"
INFOPLIST="Info.plist"
DISTXML="distribution.xml"
FILES="files"
SCRIPTS="scripts"
VERSION=1

# clean up and setup folders
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/$FILES"
mkdir -p "$PKG_DIR/$SCRIPTS"
chmod -R 755 "$PKG_DIR/$FILES"
chmod -R 755 "$PKG_DIR/$SCRIPTS"

# build archive & export app
xcodebuild build \
  -project "quattro.xcodeproj" \
  -scheme "macOS" \
  -destination 'generic/platform=macOS' \
  -configuration Release \
  -archivePath "$PKG_DIR/app" \
  clean archive

cat << EOS > "$PKG_DIR/$INFOPLIST"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>method</key>
    <string>mac-application</string>
  </dict>
</plist>
EOS

xcodebuild  \
  -exportArchive \
  -archivePath "$PKG_DIR/app.xcarchive" \
  -exportPath "$PKG_DIR/$FILES" \
  -exportOptionsPlist "$PKG_DIR/$INFOPLIST"

# create distribution.xml and shell scripts
APP=`basename $PKG_DIR/$FILES/*.app`
BUNDLE_ID=`/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' $PKG_DIR/$FILES/$APP/Contents/Info.plist`
IDENTIFIER="$BUNDLE_ID.pkg"
LIBRARY_DIR="/Library/Application Support/Roland"

cat << EOS > "$PKG_DIR/$DISTXML"
<?xml version="1.0" encoding="utf-8" standalone="no"?>
<installer-gui-script minSpecVersion="1">
  <title>$TITLE</title>
  <options customize="never" require-scripts="false"/>
  <choices-outline>
    <line choice="default">
      <line choice="$IDENTIFIER"/>
    </line>
  </choices-outline>
  <choice id="default"/>
  <choice id="$IDENTIFIER" visible="false">
    <pkg-ref id="$IDENTIFIER"/>
  </choice>
  <pkg-ref id="$IDENTIFIER" version="1" onConclusion="none">$OUTPUT</pkg-ref>
</installer-gui-script>
EOS

cat << EOS > "$PKG_DIR/$SCRIPTS/preinstall"
#!/bin/sh
if [ ! -e "\$2/$APP" ]; then
  rm -f "$LIBRARY_DIR/$BUNDLE_ID"
fi
EOS
chmod +x "$PKG_DIR/$SCRIPTS/preinstall"

cat << EOS > "$PKG_DIR/$SCRIPTS/postinstall"
#!/bin/sh
mkdir -p "$LIBRARY_DIR/"
touch -m "$LIBRARY_DIR/$BUNDLE_ID"
EOS
chmod +x "$PKG_DIR/$SCRIPTS/postinstall"

# build pkg and signing
pkgbuild --root "$PKG_DIR/$FILES" \
         --scripts "$PKG_DIR/$SCRIPTS" \
         --identifier "$IDENTIFIER" \
         --install-location "$TARGET_DIR" \
         --version "$VERSION" \
         "$PKG_DIR/$OUTPUT"

productbuild --distribution "$PKG_DIR/$DISTXML" \
             --package-path $PKG_DIR \
             --resources "$RESOURCES" \
             "$PKG_DIR/tmp.pkg"

productsign --sign "$CERT_NAME" "$PKG_DIR/tmp.pkg" "$OUTPUT"

# apple notarization
xcrun notarytool submit "$OUTPUT" --keychain-profile "notarytool-password" --wait
xcrun stapler staple "$OUTPUT"

# if error, check it
# > xcrun notarytool log "<id>" --keychain-profile "notarytool-password" developer_log.json
