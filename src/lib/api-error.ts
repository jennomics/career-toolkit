import { NextResponse } from "next/server";

/**
 * Custom error class for API errors with structured code and status.
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Known error code constants
export const VALIDATION_ERROR = "VALIDATION_ERROR";
export const UNAUTHORIZED = "UNAUTHORIZED";
export const FORBIDDEN = "FORBIDDEN";
export const NOT_FOUND = "NOT_FOUND";
export const RATE_LIMITED = "RATE_LIMITED";
export const INTERNAL_ERROR = "INTERNAL_ERROR";

/**
 * Generates a unique request ID using crypto.randomUUID().
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Formats an error into a standardized NextResponse.
 * For ApiError instances, uses their code, message, and statusCode.
 * For all other errors, returns a generic internal error (never leaks details).
 */
export function formatErrorResponse(err: unknown, requestId: string): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          requestId,
        },
      },
      { status: err.statusCode }
    );
  }

  // Never expose internal error details
  return NextResponse.json(
    {
      error: {
        code: INTERNAL_ERROR,
        message: "An internal error occurred",
        requestId,
      },
    },
    { status: 500 }
  );
}
