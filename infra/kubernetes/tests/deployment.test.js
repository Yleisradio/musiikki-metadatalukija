const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "../../..");
const deployScript = path.join(root, "infra/kubernetes/deploy.sh");
const buildScript = path.join(root, "infra/build-images.sh");
const realKubectl = execFileSync("sh", ["-c", "command -v kubectl"], { encoding: "utf8" }).trim();

function mocks(t, binary, script) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metatietolukija-test-"));
  const executable = path.join(dir, binary);
  const log = path.join(dir, "calls.log");
  const rendered = path.join(dir, "rendered.yaml");
  fs.writeFileSync(executable, script, { mode: 0o755 });
  t.after(() => {
    for (const file of [executable, log, rendered]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(dir);
  });
  const env = {
    ...process.env,
    PATH: `${dir}${path.delimiter}${process.env.PATH}`,
    REAL_KUBECTL: realKubectl,
    TEST_LOG: log,
    TEST_RENDERED: rendered,
  };
  delete env.IMAGE_PULL_SECRET;
  delete env.PLATFORM;
  delete env.ROLLOUT_TIMEOUT;
  return { env, log, rendered };
}

const kubectlMock = `#!/usr/bin/env bash
set -eu
if [ "$1" = "kustomize" ]; then
  exec "$REAL_KUBECTL" "$@"
fi
printf 'CALL\\n' >> "$TEST_LOG"
printf '%s\\n' "$@" >> "$TEST_LOG"
if [ "$3" = "apply" ]; then
  cp "$5" "$TEST_RENDERED"
fi
`;

const dockerMock = `#!/usr/bin/env bash
set -eu
printf 'CALL\\n' >> "$TEST_LOG"
printf '%s\\n' "$@" >> "$TEST_LOG"
`;

function calls(log) {
  return fs.readFileSync(log, "utf8").split("CALL\n").filter(Boolean)
    .map((call) => call.trimEnd().split("\n"));
}

function resource(manifest, kind, name) {
  const found = manifest.split(/^---\s*$/m).find((document) =>
    new RegExp(`^kind: ${kind}$`, "m").test(document) &&
    new RegExp(`^  name: ${name}$`, "m").test(document)
  );
  assert.ok(found, `Missing ${kind}/${name}`);
  return found;
}

test("local deployment uses loaded images, a namespace, and a restart", (t) => {
  const { env, log, rendered } = mocks(t, "kubectl", kubectlMock);
  execFileSync(deployScript, [
    "local", "kind-test", "metadata-test", "registry.example.com:5000/team/metadata", "build-1",
  ], { env });

  const manifest = fs.readFileSync(rendered, "utf8");
  for (const component of ["backend", "frontend"]) {
    const deployment = resource(manifest, "Deployment", component);
    const service = resource(manifest, "Service", component);
    assert.match(deployment, /^  namespace: metadata-test$/m);
    assert.match(deployment, /^  replicas: 1$/m);
    assert.ok(deployment.includes(`image: registry.example.com:5000/team/metadata-${component}:build-1`));
    assert.match(deployment, /imagePullPolicy: Never/);
    assert.match(service, /targetPort: http/);
  }
  const commands = calls(log);
  for (const command of commands) {
    assert.deepEqual(command.slice(0, 2), ["--context=kind-test", "--namespace=metadata-test"]);
  }
  assert.ok(commands.some((command) =>
    command.includes("restart") && command.includes("deployment/backend") && command.includes("deployment/frontend")
  ));
});

test("server deployment uses registry images, two replicas, and the pull secret", (t) => {
  const { env, log, rendered } = mocks(t, "kubectl", kubectlMock);
  env.IMAGE_PULL_SECRET = "registry-auth";
  execFileSync(deployScript, [
    "server", "server-context", "metadata-prod", "registry.example.com/team/metadata", "v1.2.3",
  ], { env });

  const manifest = fs.readFileSync(rendered, "utf8");
  for (const component of ["backend", "frontend"]) {
    const deployment = resource(manifest, "Deployment", component);
    assert.match(deployment, /^  namespace: metadata-prod$/m);
    assert.match(deployment, /^  replicas: 2$/m);
    assert.ok(deployment.includes(`image: registry.example.com/team/metadata-${component}:v1.2.3`));
    assert.match(deployment, /imagePullPolicy: IfNotPresent/);
    assert.match(deployment, /imagePullSecrets:\s*\n\s*- name: registry-auth/);
  }
  const commands = calls(log);
  assert.ok(!commands.some((command) => command.includes("restart")));
  assert.equal(commands.filter((command) => command.includes("status")).length, 2);
});

test("deployment rejects unsafe values before invoking kubectl", (t) => {
  const { env, log } = mocks(t, "kubectl", kubectlMock);
  const invalid = [
    ["invalid", "context", "namespace", "image", "tag"],
    ["server", "", "namespace", "image", "tag"],
    ["server", "context", "Invalid_namespace", "image", "tag"],
    ["server", "context", "namespace", "image\ninjected: value", "tag"],
    ["server", "context", "namespace", "image", "bad:tag"],
  ];
  for (const args of invalid) {
    const result = spawnSync(deployScript, args, { env, encoding: "utf8" });
    assert.equal(result.status, 1, `Expected rejection for ${JSON.stringify(args)}`);
    assert.ok(result.stderr);
  }
  const result = spawnSync(deployScript, ["server", "context", "namespace", "image", "tag"], {
    env: { ...env, IMAGE_PULL_SECRET: "bad\nsecret" },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.ok(result.stderr);
  assert.ok(!fs.existsSync(log));
});

test("image builder selects local loading or an explicitly requested platform and push", (t) => {
  const { env, log } = mocks(t, "docker", dockerMock);
  execFileSync(buildScript, ["metadata", "local"], { env });
  let commands = calls(log);
  assert.equal(commands.length, 2);
  for (const [index, component] of ["backend", "frontend"].entries()) {
    assert.deepEqual(commands[index], [
      "buildx", "build", "--load", "--tag", `metadata-${component}:local`, path.join(root, component),
    ]);
  }

  fs.writeFileSync(log, "");
  execFileSync(buildScript, ["registry.example.com/team/metadata", "v1", "--push"], {
    env: { ...env, PLATFORM: "linux/amd64" },
  });
  commands = calls(log);
  assert.equal(commands.length, 2);
  for (const [index, component] of ["backend", "frontend"].entries()) {
    assert.deepEqual(commands[index], [
      "buildx", "build", "--push", "--platform", "linux/amd64", "--tag",
      `registry.example.com/team/metadata-${component}:v1`, path.join(root, component),
    ]);
  }

  fs.writeFileSync(log, "");
  const result = spawnSync(buildScript, ["metadata", "local", "--invalid"], { env, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.ok(result.stderr);
  assert.equal(fs.readFileSync(log, "utf8"), "");
});
