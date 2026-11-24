#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 {local|server} <context> <namespace> <image-prefix> <tag>" >&2
  echo "Set IMAGE_PULL_SECRET for a private registry and ROLLOUT_TIMEOUT to change the wait time." >&2
  exit 1
}

[ "$#" -eq 5 ] || usage
environment=$1
context=$2
namespace=$3
image_prefix=$4
tag=$5

case "$environment" in
  local|server) ;;
  *) usage ;;
esac
if [ -z "$context" ] || [[ ! "$namespace" =~ ^[a-z0-9]([-a-z0-9]*[a-z0-9])?$ ]] || [ "${#namespace}" -gt 63 ]; then
  echo "A context and a valid Kubernetes namespace are required." >&2
  exit 1
fi
if [[ ! "$image_prefix" =~ ^[a-z0-9][a-z0-9._:/-]*$ ]]; then
  echo "Invalid image prefix: $image_prefix" >&2
  exit 1
fi
if [[ ! "$tag" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$ ]] || [ "${#tag}" -gt 128 ]; then
  echo "Invalid image tag: $tag" >&2
  exit 1
fi
if [ -n "${IMAGE_PULL_SECRET:-}" ] && [[ ! "$IMAGE_PULL_SECRET" =~ ^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$ ]]; then
  echo "Invalid image pull secret name: $IMAGE_PULL_SECRET" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work_dir="$(mktemp -d "${TMPDIR:-/tmp}/metatietolukija-k8s.XXXXXX")"
cleanup() {
  rm -f "$work_dir/resources.yaml" "$work_dir/kustomization.yaml" "$work_dir/rendered.yaml"
  rmdir "$work_dir"
}
trap cleanup EXIT

kubectl kustomize "$script_dir/overlays/$environment" > "$work_dir/resources.yaml"
cat > "$work_dir/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: $namespace
resources:
  - resources.yaml
images:
  - name: musiikki-metadatalukija-backend
    newName: ${image_prefix}-backend
    newTag: "$tag"
  - name: musiikki-metadatalukija-frontend
    newName: ${image_prefix}-frontend
    newTag: "$tag"
EOF

if [ -n "${IMAGE_PULL_SECRET:-}" ]; then
  cat >> "$work_dir/kustomization.yaml" <<EOF
patches:
  - target:
      group: apps
      version: v1
      kind: Deployment
    patch: |-
      - op: add
        path: /spec/template/spec/imagePullSecrets
        value:
          - name: $IMAGE_PULL_SECRET
EOF
fi

kubectl kustomize "$work_dir" > "$work_dir/rendered.yaml"
kubectl --context="$context" --namespace="$namespace" apply -f "$work_dir/rendered.yaml"
if [ "$environment" = "local" ]; then
  kubectl --context="$context" --namespace="$namespace" rollout restart deployment/backend deployment/frontend
fi
for component in backend frontend; do
  kubectl --context="$context" --namespace="$namespace" rollout status \
    "deployment/$component" --timeout="${ROLLOUT_TIMEOUT:-300s}"
done
