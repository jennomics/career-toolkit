import { NextRequest, NextResponse } from "next/server";
import { formatErrorResponse, generateRequestId } from "./api-error";

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with standard error handling and request ID generation.
 * Eliminates the need for try/catch + generateRequestId + formatErrorResponse in every route.
 */
export function withHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const requestId = generateRequestId();
    try {
      return await handler(request, context);
    } catch (err) {
      console.error(`${request.method} ${request.nextUrl.pathname} error:`, err);
      return formatErrorResponse(err, requestId);
    }
  };
}
