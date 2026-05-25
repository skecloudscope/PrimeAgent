import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length"
]);

function getAgentOSBaseUrl() {
  return (
    process.env.INTERNAL_AGNO_AGENTOS_BASE_URL ||
    process.env.NEXT_PUBLIC_AGNO_AGENTOS_BASE_URL ||
    "http://127.0.0.1:7777"
  ).replace(/\/$/, "");
}

function buildTargetUrl(request: NextRequest, path: string[]) {
  const url = new URL(request.url);
  const target = new URL(`${getAgentOSBaseUrl()}/${path.map(encodeURIComponent).join("/")}`);
  target.search = url.search;
  return target;
}

function forwardedHeaders(request: NextRequest) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const method = request.method.toUpperCase();
  const target = buildTargetUrl(request, path);
  const hasBody = !["GET", "HEAD"].includes(method);

  const upstream = await fetch(target, {
    method,
    headers: forwardedHeaders(request),
    body: hasBody ? request.body : undefined,
    // Required for streaming request bodies in Node fetch.
    duplex: hasBody ? "half" : undefined,
    redirect: "manual"
  } as RequestInit & { duplex?: "half" });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.set("x-primeagent-bridge", "agno-agentos");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
