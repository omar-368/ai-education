import type { IncomingMessage, ServerResponse } from "node:http";

export interface ApiRequest extends IncomingMessage {
  body?: Record<string, unknown>;
}

export interface ApiResponse extends ServerResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

const requests = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

export function prepareApiRequest(
  request: ApiRequest,
  response: ApiResponse,
): boolean {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return false;
  }

  const contentTypeHeader = request.headers["content-type"];
  const contentType = Array.isArray(contentTypeHeader)
    ? contentTypeHeader[0]
    : contentTypeHeader;
  if (
    typeof contentType !== "string" ||
    !contentType.toLowerCase().startsWith("application/json")
  ) {
    response.status(415).json({ error: "Content-Type must be application/json." });
    return false;
  }

  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > 30_000) {
    response.status(413).json({ error: "Request is too large." });
    return false;
  }

  const forwarded = request.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim()
    || request.socket.remoteAddress
    || "unknown";
  const now = Date.now();
  const current = requests.get(ip);

  if (!current || current.resetAt <= now) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else if (current.count >= MAX_REQUESTS) {
    response.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
    response.status(429).json({ error: "Too many requests. Please wait a moment." });
    return false;
  } else {
    current.count += 1;
  }

  if (requests.size > 1_000) {
    for (const [key, value] of requests) {
      if (value.resetAt <= now) requests.delete(key);
    }
  }

  return true;
}

export function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
