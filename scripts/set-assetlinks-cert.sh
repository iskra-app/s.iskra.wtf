#!/bin/sh
# Вписывает SHA-256 отпечаток сертификата подписи Android-релиза в .well-known/assetlinks.json.
# Без него Android не подтверждает App Link, и ссылки s.iskra.wtf открываются выбором приложения, а не сразу в Искре.
#
#   scripts/set-assetlinks-cert.sh AA:BB:…:FF [второй отпечаток при ротации ключа]
#
# Отпечаток — тот же, что в описании релиза и в `ISKRA_CERT_SHA256`: `apksigner verify --print-certs искра.apk`.
set -eu
[ $# -ge 1 ] || { echo "Нужен хотя бы один отпечаток SHA-256 (AA:BB:…)" >&2; exit 64; }
for fp in "$@"; do
  printf '%s' "$fp" | grep -Eq '^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$' || { echo "Не похоже на SHA-256 с двоеточиями: $fp" >&2; exit 65; }
done
cd "$(dirname "$0")/.."
list=$(for fp in "$@"; do printf '"%s",' "$(printf '%s' "$fp" | tr a-f A-F)"; done | sed 's/,$//')
cat > .well-known/assetlinks.json <<JSON
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "wtf.iskra",
      "sha256_cert_fingerprints": [$list]
    }
  }
]
JSON
echo "Готово: .well-known/assetlinks.json. Закоммитьте и запушьте — Pages отдаст через минуту."
