#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <image-prefix> <tag> [--push]" >&2
  echo "Set PLATFORM, for example linux/amd64, when building for another architecture." >&2
  exit 1
}

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ] || [ -z "$1" ] || [ -z "$2" ]; then
  usage
fi

image_prefix=$1
tag=$2
output=--load
if [ "$#" -eq 3 ]; then
  [ "$3" = "--push" ] || usage
  output=--push
fi

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_options=("$output")
if [ -n "${PLATFORM:-}" ]; then
  build_options+=(--platform "$PLATFORM")
fi

for component in backend frontend; do
  image="${image_prefix}-${component}:${tag}"
  echo "Building $image"
  docker buildx build "${build_options[@]}" --tag "$image" "$root_dir/$component"
done
