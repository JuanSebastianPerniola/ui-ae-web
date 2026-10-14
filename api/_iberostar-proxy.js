const upstreamBaseUrl = "https://ibhbegprefuncwinsearch.azurewebsites.net";

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response, status, value) {
  response.status(status).setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(value));
}

function getFunctionCode() {
  const configuredCode = process.env.IBEROSTAR_FUNCTION_CODE;
  if (!configuredCode) return null;

  try {
    return decodeURIComponent(configuredCode.trim());
  } catch {
    return configuredCode.trim();
  }
}

async function proxyIberostarRequest(request, response, path) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const functionCode = getFunctionCode();
  if (!functionCode) {
    sendJson(response, 500, { error: "IBEROSTAR_FUNCTION_CODE is not configured" });
    return;
  }

  const upstreamUrl = new URL(`${upstreamBaseUrl}${path}`);
  upstreamUrl.searchParams.set("code", functionCode);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.body)
    });
    const responseText = await upstreamResponse.text();
    response.status(upstreamResponse.status);
    response.setHeader(
      "Content-Type",
      upstreamResponse.headers.get("content-type") || "text/plain"
    );
    response.end(responseText);
  } catch (error) {
    sendJson(response, 502, {
      error: "The upstream availability service could not be reached",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

module.exports = { proxyIberostarRequest };
