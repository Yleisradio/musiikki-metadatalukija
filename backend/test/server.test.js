const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const express = require("express");

process.env.LOG_LEVEL = "silent";
const { createApp } = require("../dist/server");
const { errorHandler } = require("../dist/errors");

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
  const cases = [
    [() => fetch(`${url}/missing`), 404, "Not found"],
    [() => post(url, "{}", "text/plain"), 415, "Content-Type must be application/json"],
    [() => post(url, "{"), 400, "Invalid JSON"],
    [() => post(url, "[]"), 400, "Request body must be a JSON object"],
    [() => post(url, ""), 400, "Invalid JSON"],
    [() => post(url, JSON.stringify({ value: "a".repeat(1024 * 1024) })), 413, "Request body is too large"],
    [() => post(url, "{}"), 503, "Track API is not configured"],
  ];
  for (const [request, status, message] of cases) {
    const response = await request();
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: message });
  }
  assert.throws(() => createApp("file:///tmp/track"), /TRACK_API_URL/);
  assert.throws(() => createApp("https://user:password@example.com/tracks"), /TRACK_API_URL/);
});

test("reports upstream connection failures and timeouts", async (t) => {
  const failedUrl = await listen(t, http.createServer(createApp("http://127.0.0.1:0/tracks")));
  const failedResponse = await post(failedUrl, "{}");
  assert.equal(failedResponse.status, 502);
  assert.deepEqual(await failedResponse.json(), { error: "Track API request failed" });

  const upstream = http.createServer((_request, response) => {
    setTimeout(() => response.end("{}"), 150);
  });
  const upstreamUrl = await listen(t, upstream);
  const timeoutUrl = await listen(t, http.createServer(createApp(upstreamUrl, 25)));
  const timeoutResponse = await post(timeoutUrl, "{}");
  assert.equal(timeoutResponse.status, 504);
  assert.deepEqual(await timeoutResponse.json(), { error: "Track API request timed out" });

  const slowBody = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.write('{"id":');
    setTimeout(() => response.end("42}"), 150);
  });
  const slowBodyUrl = await listen(t, slowBody);
  const slowResponseUrl = await listen(t, http.createServer(createApp(slowBodyUrl, 25)));
  assert.equal((await post(slowResponseUrl, "{}")).status, 504);
});

test("handles unexpected errors without exposing details", async (t) => {
  const app = express();
  app.get("/failure", () => { throw new Error("private details"); });
  app.use(errorHandler);
  const url = await listen(t, http.createServer(app));
  const response = await fetch(`${url}/failure`);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal server error" });
});
