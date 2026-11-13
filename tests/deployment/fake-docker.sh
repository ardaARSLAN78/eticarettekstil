#!/usr/bin/env bash
set -eu
# Yalnızca kabuk akış testi: gerçek Docker/TLS testi check-installer.mjs içindedir.
printf '%s\n' "$*" >> "$TEST_ROOT/calls.log"
case "$1" in
  info|image|build) exit 0 ;;
  volume) exit 0 ;;
  network)
    if [[ "$2" == ls ]]; then echo test-network; else echo '[]'; fi
    exit 0 ;;
  compose)
    case "$*" in
      *'up --help'*) echo '--wait'; exit 0 ;;
      *bootstrap.mjs*) [[ "${FAKE_FAIL:-}" != bootstrap ]]; exit $? ;;
      *pg_dump*) printf 'PGDMP-flow-test'; exit 0 ;;
      *'--entrypoint tar'*) printf 'media-flow-test'; exit 0 ;;
      *) exit 0 ;;
    esac ;;
  run)
    while (($#)); do
      if [[ "$1" == scripts/deploy/configure.mjs ]]; then
        shift
        exec node /workspace/scripts/deploy/configure.mjs "$@"
      fi
      if [[ "$1" == scripts/deploy/verify.mjs && "${FAKE_FAIL:-}" == verify ]]; then exit 1; fi
      shift
    done
    exit 0 ;;
  *) exit 1 ;;
esac
