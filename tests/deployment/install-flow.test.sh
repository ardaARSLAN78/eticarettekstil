#!/usr/bin/env bash
set -Eeuo pipefail
FIXTURE="$(mktemp -d /tmp/quantia-install-flow.XXXXXX)"
trap '[[ "$FIXTURE" == /tmp/quantia-install-flow.* ]] && rm -rf -- "$FIXTURE"' EXIT
mkdir -p "$FIXTURE/bin"
cp /workspace/install.sh "$FIXTURE/install.sh"
cp /workspace/tests/deployment/fake-docker.sh "$FIXTURE/bin/docker"
chmod +x "$FIXTURE/bin/docker"
export PATH="$FIXTURE/bin:$PATH"
export TEST_ROOT="$FIXTURE"
cd "$FIXTURE"
bash install.sh --domain magaza.example.com --no-build
[[ -f .deployment/installed && ! -d .deployment/install.lock ]]
[[ "$(stat -c '%a' .deployment/state.json)" == 600 ]]
[[ "$(stat -c '%a' .deployment)" == 700 ]]
cp .deployment/state.json state.before
bash install.sh --no-build
cmp state.before .deployment/state.json
[[ -n "$(find .deployment/backups -name '*.dump' -print -quit)" ]]
[[ -n "$(find .deployment/backups -name '*-media.tar.gz' -print -quit)" ]]
mkdir .deployment/install.lock
if bash install.sh --no-build; then echo 'Kilit koruması çalışmadı.' >&2; exit 1; fi
[[ -d .deployment/install.lock ]]
rmdir .deployment/install.lock
if FAKE_FAIL=bootstrap bash install.sh --no-build; then echo 'Bootstrap hatası başarı sayıldı.' >&2; exit 1; fi
cmp state.before .deployment/state.json
[[ ! -d .deployment/install.lock ]]
rm .deployment/installed
if FAKE_FAIL=verify bash install.sh --no-build; then echo 'HTTPS hatası başarı sayıldı.' >&2; exit 1; fi
[[ ! -f .deployment/installed && ! -d .deployment/install.lock ]]
cmp state.before .deployment/state.json
echo 'BAŞARILI: Linux kabuk akışı, yeniden çalıştırma, izinler, yedekleme adımları, kilit ve hata durumu.'
