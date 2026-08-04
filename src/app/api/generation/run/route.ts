/**
 * POST /api/generation/run
 *
 * Runs the generation pipeline for a given job and document type.
 *
 * Body: { jobId: string, documentType: string, options?: { strictGaps?: boolean } }
 * Returns: { success, generationId?, text?, spans?, stage?, error?, failures? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  formatErrorResponse,
  generateRequestId,
  validationError,
} from "@/lib/api-error";
import { runPipeline } from "@/lib/generation/pipeline";
import type { DocumentType } from "@/lib/generation/types";

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  "resume",
  "cover-letter",
  "essay",
  "custom",
];

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.jobId || typeof body.jobId !== "string") {
      return validationError("jobId is required and must be a string", requestId);
    }

    if (
      !body.documentType ||
      typeof body.documentType !== "string" ||
      !VALID_DOCUMENT_TYPES.includes(body.documentType as DocumentType)
    ) {
      return validationError(
        `documentType is required and must be one of: ${VALID_DOCUMENT_TYPES.join(", ")}`,
        requestId
      );
    }

    // Validate options if provided
    if (body.options !== undefined && body.options !== null) {
      if (typeof body.options !== "object") {
        return validationError("options must be an object", requestId);
      }
      if (
        body.options.strictGaps !== undefined &&
        typeof body.options.strictGaps !== "boolean"
      ) {
        return validationError(
          "options.strictGaps must be a boolean",
          requestId
        );
      }
    }

    const result = await runPipeline({
      jobId: body.jobId,
      documentType: body.documentType as DocumentType,
      options: body.options,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        generationId: result.generationId,
        text: result.text,
        spans: result.spans,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          stage: result.stage,
          error: result.error,
          failures: result.failures,
        },
        { status: 422 }
      );
    }
  } catch (err) {
    console.error("POST /api/generation/run error:", err);
    return formatErrorResponse(err, requestId);
  }
}
