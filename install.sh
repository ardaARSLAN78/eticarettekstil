#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Linux sunucuda proje dizininden: bash install.sh --domain magaza.ornek.com
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$ROOT"
CONFIG="$ROOT/.deployment"
PROJECT="quantia-server"
DOMAIN=""
BUILD=true
REINSTALL=false
while (($#)); do
  case "$1" in
    --domain) [[ $# -ge 2 ]] || { echo 'Alan adı gerekli.' >&2; exit 1; }; DOMAIN="$2"; shift 2 ;;
    --no-build) BUILD=false; shift ;;
    *) echo "Bilinmeyen seçenek: $1" >&2; exit 1 ;;
  esac
done
[[ "$(uname -s)" == Linux ]] || { echo 'Bu betik Docker kurulu Linux sunucu içindir.' >&2; exit 1; }
command -v docker >/dev/null || { echo 'Docker Engine ve Compose kurulu olmalı.' >&2; exit 1; }
docker info >/dev/null
docker compose version >/dev/null
docker compose up --help | grep -q -- '--wait' || { echo 'Docker Compose sürümünü güncelleyin (--wait gerekli).' >&2; exit 1; }

mkdir -p "$CONFIG"
chmod 700 "$CONFIG"
mkdir "$CONFIG/install.lock" 2>/dev/null || { echo 'Başka kurulum çalışıyor veya yarım kalmış install.lock var. Önce inceleyin.' >&2; exit 1; }
cleanup() { rmdir "$CONFIG/install.lock" 2>/dev/null || true; }
trap cleanup EXIT
trap 'echo "Kurulum tamamlanmadı. Hatayı giderip aynı komutu tekrar çalıştırın; veriler silinmedi." >&2' ERR

# Eski veritabanını yeni sırlarla erişilemez hâle getirmemek için kayıp durum dosyasında durulur.
if [[ ! -f "$CONFIG/state.json" ]]; then
  EXISTING="$(docker volume ls --filter "label=com.docker.compose.project=$PROJECT" -q)"
  [[ -z "$EXISTING" ]] || { echo '.deployment/state.json yok ancak sunucu verileri var. Eski .deployment yedeğini geri getirin.' >&2; exit 1; }
  if [[ -z "$DOMAIN" ]]; then read -r -p 'Mağaza alan adı (örnek: magaza.ornek.com): ' DOMAIN; fi
else
  REINSTALL=true
fi
ARGS=()
[[ -z "$DOMAIN" ]] || ARGS+=(--domain "$DOMAIN")
echo '1/6 Üretim ayarları ve güvenli sırlar hazırlanıyor…'
mapfile -t NETWORKS < <(docker network ls -q)
docker network inspect "${NETWORKS[@]}" | docker run --rm -i \
  --user "$(id -u):$(id -g)" -v "$ROOT:/workspace" -w /workspace \
  node:24-bookworm-slim node scripts/deploy/configure.mjs "${ARGS[@]}"
IFS= read -r DOMAIN < "$CONFIG/domain"
DC=(docker compose --project-name "$PROJECT" --env-file "$CONFIG/runtime.env" -f "$ROOT/compose.server.yml")
"${DC[@]}" config --quiet

echo '2/6 Uygulama imajları hazırlanıyor…'
if "$BUILD"; then
  docker build -t quantia-server-backend:latest -f backend/Dockerfile .
  docker build -t quantia-server-frontend:latest -f frontend/Dockerfile .
else
  docker image inspect quantia-server-backend:latest quantia-server-frontend:latest >/dev/null
fi

echo '3/6 Veritabanı ve kalıcı depolama başlatılıyor…'
"${DC[@]}" up -d --no-build --wait --wait-timeout 180 postgres redis
if "$REINSTALL"; then
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)-$$"
  mkdir -p "$CONFIG/backups"
  "${DC[@]}" exec -T postgres pg_dump -U quantia -d quantia -Fc > "$CONFIG/backups/$STAMP.dump.pending"
  mv "$CONFIG/backups/$STAMP.dump.pending" "$CONFIG/backups/$STAMP.dump"
  "${DC[@]}" run --rm --no-deps -T --entrypoint tar backend -czf - -C /app/backend/uploads . > "$CONFIG/backups/$STAMP-media.tar.gz.pending"
  mv "$CONFIG/backups/$STAMP-media.tar.gz.pending" "$CONFIG/backups/$STAMP-media.tar.gz"
  cp "$CONFIG/state.json" "$CONFIG/backups/$STAMP-state.json"
fi

echo '4/6 Migration ve ilk yönetici/mağaza kurulumu yapılıyor…'
"${DC[@]}" up -d --no-build --wait --wait-timeout 180 backend
"${DC[@]}" exec -T backend node backend/scripts/bootstrap.mjs
echo '5/6 Web, arka plan işçisi ve otomatik HTTPS başlatılıyor…'
"${DC[@]}" up -d --no-build --wait --wait-timeout 180
"${DC[@]}" exec -T gateway nginx -t
"${DC[@]}" exec -T gateway nginx -s reload
"${DC[@]}" exec -T edge caddy reload --config /etc/caddy/Caddyfile
echo '6/6 Alan adı üzerinden HTTPS ve mağaza erişimi doğrulanıyor…'
docker run --rm --network host -v "$ROOT:/workspace:ro" -w /workspace \
  node:24-bookworm-slim node scripts/deploy/verify.mjs --domain "$DOMAIN"
printf '%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$CONFIG/installed"
echo "Kurulum başarılı: https://$DOMAIN"
echo "Yönetim paneli: https://$DOMAIN/yonetim"
echo "Yönetici bilgileri: $CONFIG/credentials.txt"
echo 'API anahtarlarını panelde Ödeme altyapıları ve Arama görünürlüğü alanlarına girin.'
