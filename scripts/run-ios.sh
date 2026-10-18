#!/usr/bin/env bash

set -euo pipefail

metro_pid=""
simulator="${IOS_SIMULATOR_DEVICE:-}"

# Keep the simulator development client and Metro on the same loopback host.
export REACT_NATIVE_PACKAGER_HOSTNAME=localhost

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
Build and open the TipsyTraveller development client in an iOS Simulator.

Usage:
  npm run ios:native
  npm run ios:native -- "iPhone 18 Pro Max"
  IOS_SIMULATOR_DEVICE="iPhone 18 Pro Max" npm run ios:native

When no simulator is specified, Expo uses a booted simulator or chooses an
available default. This command installs the native development client; it does
not use Expo Go.
EOF
  exit 0
fi

if [[ $# -gt 0 ]]; then
  simulator="$1"
fi

stop_metro() {
  if [[ -n "$metro_pid" ]]; then
    kill "$metro_pid" 2>/dev/null || true
  fi
}

trap stop_metro EXIT INT TERM

if ! curl --silent --fail http://localhost:8081/status 2>/dev/null | grep --quiet "packager-status:running"; then
  ./node_modules/.bin/expo start --dev-client --host localhost &
  metro_pid=$!

  for _ in {1..60}; do
    if curl --silent --fail http://localhost:8081/status 2>/dev/null | grep --quiet "packager-status:running"; then
      break
    fi
    sleep 1
  done

  if ! curl --silent --fail http://localhost:8081/status 2>/dev/null | grep --quiet "packager-status:running"; then
    echo "Metro did not start on port 8081." >&2
    exit 1
  fi
fi

if [[ -n "$simulator" ]]; then
  ./node_modules/.bin/expo run:ios --device "$simulator" --no-bundler
else
  ./node_modules/.bin/expo run:ios --no-bundler
fi

if [[ -n "$metro_pid" ]]; then
  wait "$metro_pid"
fi
