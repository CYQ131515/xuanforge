#!/bin/bash
# ============================================================
#  玄炉 XUANFORGE · macOS 构建脚本
#  产出：dist/玄炉.app、dist/玄炉-macOS.zip（可选 dist/玄炉.dmg）
#  依赖：Xcode Command Line Tools（swiftc / sips / iconutil / codesign）
# ============================================================
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"                 # xuanforge/
OUT="${OUT_DIR:-$ROOT/dist}"                    # 默认产物目录（可用 OUT_DIR 覆盖）
APP="$OUT/玄炉.app"
DMG="$OUT/玄炉.dmg"
BUILD="$HERE/.build"

echo "▸ 清理旧产物"
rm -rf "$BUILD" "$APP" "$DMG"
mkdir -p "$BUILD" "$OUT" "$APP/Contents/MacOS" "$APP/Contents/Resources/web"
# 注意：本机 Swift 6.3 在含空格/中文的路径下使用临时目录会崩溃，
# 因此编译用的 TMPDIR / module cache 放在 /tmp。
BUILD_TMP="/tmp/xuanforge-build-$$"
mkdir -p "$BUILD_TMP/modcache"
trap 'rm -rf "$BUILD_TMP"' EXIT
export TMPDIR="$BUILD_TMP"
MODCACHE="$BUILD_TMP/modcache"

echo "▸ 选择可用 SDK（本机 Swift 与默认 SDK 版本可能不匹配）"
SDK=""
for cand in MacOSX26.5.sdk MacOSX26.sdk MacOSX15.4.sdk MacOSX15.sdk; do
  p="/Library/Developer/CommandLineTools/SDKs/$cand"
  if [ -d "$p" ]; then
    if swiftc -swift-version 5 -typecheck "$HERE/main.swift" -sdk "$p" -target arm64-apple-macos12.0 \
        -module-cache-path "$MODCACHE" \
        -framework AppKit -framework WebKit >/dev/null 2>&1; then
      SDK="$p"; break
    fi
  fi
done
if [ -z "$SDK" ]; then
  SDK="$(xcrun --show-sdk-path)"
  echo "  未找到旧版 SDK，回退到默认：$SDK"
else
  echo "  使用：$SDK"
fi

echo "▸ 编译原生外壳（Swift + WKWebView，通用二进制）"
build_arch() {
  arch="$1"
  swiftc -swift-version 5 -O "$HERE/main.swift" \
    -o "$BUILD/XuanForge-$arch" \
    -sdk "$SDK" -target "$arch-apple-macos12.0" \
    -module-cache-path "$MODCACHE" \
    -framework AppKit -framework WebKit
}
build_arch arm64
if build_arch x86_64; then
  lipo -create "$BUILD/XuanForge-arm64" "$BUILD/XuanForge-x86_64" -output "$BUILD/XuanForge"
  echo "  → arm64 + x86_64 通用"
else
  cp "$BUILD/XuanForge-arm64" "$BUILD/XuanForge"
  echo "  → 仅 arm64"
fi
cp "$BUILD/XuanForge" "$APP/Contents/MacOS/XuanForge"
chmod +x "$APP/Contents/MacOS/XuanForge"
cp "$HERE/Info.plist" "$APP/Contents/Info.plist"

echo "▸ 生成应用图标"
ICONSET="$BUILD/AppIcon.iconset"
mkdir -p "$ICONSET"
SRC="$HERE/icon-1024.png"
if [ ! -f "$SRC" ]; then
  echo "!! 缺少 icon-1024.png（可用 icon.html 重新渲染）"
  exit 1
fi
for pair in "16 icon_16x16" "32 icon_16x16@2x" "32 icon_32x32" "64 icon_32x32@2x" \
            "128 icon_128x128" "256 icon_128x128@2x" "256 icon_256x256" "512 icon_256x256@2x" \
            "512 icon_512x512" "1024 icon_512x512@2x"; do
  size="${pair%% *}"; name="${pair##* }"
  sips -z "$size" "$size" "$SRC" --out "$ICONSET/$name.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"

echo "▸ 打包 Web 资源"
cp "$ROOT/index.html" "$APP/Contents/Resources/web/"
cp -R "$ROOT/css" "$ROOT/js" "$APP/Contents/Resources/web/"
mkdir -p "$APP/Contents/Resources/web/docs"
cp "$ROOT/docs/"*.md "$APP/Contents/Resources/web/docs/" 2>/dev/null || true

echo "▸ Ad-hoc 签名"
codesign --force --deep --sign - "$APP" 2>/dev/null || echo "  (代码签名跳过，本机运行不受影响)"

echo "▸ 制作分发压缩包"
ZIP="$OUT/玄炉-macOS.zip"
rm -f "$ZIP"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP" 2>/dev/null \
  && echo "  ZIP : $ZIP" || echo "  (ZIP 创建失败，可忽略；.app 已可用)"

echo "▸ 尝试制作 DMG（在沙箱环境可能被系统拒绝）"
STAGE="$BUILD/dmg"
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
if hdiutil create -volname "玄炉 XUANFORGE" -srcfolder "$STAGE" -ov -format UDZO -quiet "$DMG" 2>/tmp/xf-dmg.err; then
  echo "  DMG : $DMG"
else
  echo "  (DMG 创建失败：$(tail -1 /tmp/xf-dmg.err 2>/dev/null)。在 Finder 里运行 build.sh 可生成 DMG；ZIP 已可分发)"
  rm -f "$DMG"
fi

echo
echo "✓ 完成"
echo "  App : $APP"
[ -f "$DMG" ] && echo "  DMG : $DMG"
echo "  打开 : open \"$APP\""
