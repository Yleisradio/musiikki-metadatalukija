const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");

process.env.LOG_LEVEL = "silent";
const { createApp } = require("../dist/server");

async function listen(t, server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

function post(url, body, contentType = "application/json") {
  return fetch(`${url}/tracks`, {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

test("forwards the track JSON and the upstream response", async (t) => {
  let received;
  const upstream = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    received = { method: request.method, url: request.url, contentType: request.headers["content-type"], body: JSON.parse(body) };
    response.writeHead(201, { "content-type": "application/json", location: "/tracks/42" });
    response.end(JSON.stringify({ id: 42 }));
  });
  const upstreamUrl = await listen(t, upstream);
  const url = await listen(t, http.createServer(createApp(`${upstreamUrl}/create?source=frontend`)));
  const track = { tracks: [{ title: "Test", custom: { finnish_content: false } }] };

  const response = await post(url, JSON.stringify(track));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("location"), "/tracks/42");
  assert.match(response.headers.get("content-type"), /^application\/json/);
  assert.deepEqual(await response.json(), { id: 42 });
  assert.deepEqual(received, {
    method: "POST", url: "/create?source=frontend", contentType: "application/json", body: track,
  });
});

test("preserves upstream errors and empty responses", async (t) => {
  const upstream = http.createServer((request, response) => {
    if (request.url === "/error") {
      response.writeHead(422, { "content-type": "application/json" });
      response.end('{"error":"invalid track"}');
    } else {
      response.writeHead(204);
      response.end();
    }
  });
  const upstreamUrl = await listen(t, upstream);
  const errorUrl = await listen(t, http.createServer(createApp(`${upstreamUrl}/error`)));
  const emptyUrl = await listen(t, http.createServer(createApp(`${upstreamUrl}/empty`)));
  const errorResponse = await post(errorUrl, "{}");
  assert.equal(errorResponse.status, 422);
  assert.deepEqual(await errorResponse.json(), { error: "invalid track" });
  const emptyResponse = await post(emptyUrl, "{}");
  assert.equal(emptyResponse.status, 204);
  assert.equal(await emptyResponse.text(), "");
});

test("validates requests and reports missing configuration", async (t) => {
  const url = await listen(t, http.createServer(createApp("")));
  assert.deepEqual(await (await fetch(`${url}/health`)).json(), { status: "ok" });
  assert.equal((await fetch(`${url}/missing`)).status, 404);
  assert.equal((await post(url, "{}", "text/plain")).status, 415);
  assert.equal((await post(url, "{")).status, 400);
  assert.equal((await post(url, "[]")).status, 400);
  assert.equal((await post(url, "")).status, 400);
  assert.equal((await post(url, JSON.stringify({ value: "a".repeat(1024 * 1024) }))).status, 413);
  assert.equal((await post(url, "{}")).status, 503);
  assert.throws(() => createApp("file:///tmp/track"), /TRACK_API_URL/);
  assert.throws(() => createApp("https://user:password@example.com/tracks"), /TRACK_API_URL/);
});

test("reports upstream connection failures and timeouts", async (t) => {
  const failedUrl = await listen(t, http.createServer(createApp("http://127.0.0.1:0/tracks")));
  assert.equal((await post(failedUrl, "{}")).status, 502);

  const upstream = http.createServer((_request, response) => {
    setTimeout(() => response.end("{}"), 150);
  });
  const upstreamUrl = await listen(t, upstream);
  const timeoutUrl = await listen(t, http.createServer(createApp(upstreamUrl, 25)));
  assert.equal((await post(timeoutUrl, "{}")).status, 504);

  const slowBody = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.write('{"id":');
    setTimeout(() => response.end("42}"), 150);
  });
  const slowBodyUrl = await listen(t, slowBody);
  const slowResponseUrl = await listen(t, http.createServer(createApp(slowBodyUrl, 25)));
  assert.equal((await post(slowResponseUrl, "{}")).status, 504);
});
