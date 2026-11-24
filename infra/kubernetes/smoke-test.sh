#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ] || [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <context> <namespace>" >&2
  exit 1
fi
context=$1
namespace=$2

for component in backend frontend; do
  kubectl --context="$context" --namespace="$namespace" rollout status \
    "deployment/$component" --timeout="${ROLLOUT_TIMEOUT:-300s}"
done

log_file="$(mktemp "${TMPDIR:-/tmp}/metatietolukija-forward.XXXXXX")"
forward_pid=""
cleanup() {
  if [ -n "$forward_pid" ]; then
    kill "$forward_pid" 2>/dev/null || true
    wait "$forward_pid" 2>/dev/null || true
  fi
  rm -f "$log_file"
}
trap cleanup EXIT

kubectl --context="$context" --namespace="$namespace" port-forward \
  --address=127.0.0.1 service/frontend :80 > "$log_file" 2>&1 &
forward_pid=$!
port=""
for ((attempt = 0; attempt < 30; attempt++)); do
  port="$(sed -n 's/^Forwarding from 127\.0\.0\.1:\([0-9][0-9]*\) ->.*/\1/p' "$log_file" | head -n 1)"
  if [ -n "$port" ] && kill -0 "$forward_pid" 2>/dev/null; then
    break
  fi
  if ! kill -0 "$forward_pid" 2>/dev/null; then
    echo "Port forwarding failed:" >&2
    cat "$log_file" >&2
    exit 1
  fi
  sleep 1
done
if [ -z "$port" ]; then
  echo "Timed out waiting for port forwarding:" >&2
  cat "$log_file" >&2
  exit 1
fi

frontend="$(curl --fail --silent --show-error --noproxy 127.0.0.1 \
  --max-time 10 "http://127.0.0.1:$port/")"
if [[ "$frontend" != *'<div id="root"></div>'* ]]; then
  echo "The frontend did not return the application HTML." >&2
  exit 1
fi
health="$(curl --fail --silent --show-error --noproxy 127.0.0.1 \
  --retry 5 --retry-connrefused --retry-delay 1 --max-time 10 \
  "http://127.0.0.1:$port/api/health")"
if [ "$health" != '{"status":"ok"}' ]; then
  echo "Unexpected backend health response: $health" >&2
  exit 1
fi
echo "Frontend and backend are reachable through the frontend service."
