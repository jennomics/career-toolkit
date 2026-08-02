import { NextRequest, NextResponse } from "next/server";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/resume/project/[id]/export-pdf
 *
 * Generates a simple PDF from text content.
 * Uses a basic HTML-to-PDF approach via the browser's print-friendly rendering.
 * For now, returns a styled HTML page that can be printed/saved as PDF.
 *
 * Body: { content: string, type: "resume" | "cover-letter", filename: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, type, filename } = body;

    if (!content) {
      return validationError("content is required");
    }

    // Convert content to styled HTML for PDF-like output
    const lines = content.split("\n");
    let htmlBody = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        htmlBody += "<br/>";
      } else if (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 2 &&
        !trimmed.startsWith("\u2022")
      ) {
        // Section header (all caps)
        htmlBody += `<h2 style="font-size:14px;font-weight:bold;margin:16px 0 8px 0;text-transform:uppercase;border-bottom:1px solid #ddd;padding-bottom:4px;">${trimmed}</h2>`;
      } else if (trimmed.startsWith("\u2022")) {
        htmlBody += `<p style="margin:2px 0 2px 20px;font-size:11px;line-height:1.5;">${trimmed}</p>`;
      } else if (trimmed.includes("|")) {
        // Role line (title | company | dates)
        htmlBody += `<p style="font-size:12px;font-weight:600;margin:10px 0 2px 0;">${trimmed}</p>`;
      } else {
        htmlBody += `<p style="font-size:11px;line-height:1.6;margin:4px 0;">${trimmed}</p>`;
      }
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${filename || type}</title>
<style>
  @page { margin: 0.75in; size: letter; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #222; max-width: 7in; margin: 0 auto; padding: 40px; }
  h1 { font-size: 18px; margin: 0 0 4px 0; }
  h2 { font-size: 14px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${filename || "resume.html"}"`,
      },
    });
  } catch (err) {
    console.error("POST export-pdf error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
