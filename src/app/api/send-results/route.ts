import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";

import { env } from "~/env";
import { buildResultsEmail } from "~/lib/email";

export const runtime = "nodejs";

const payloadSchema = z.object({
  candidate: z.object({
    firstName: z.string().optional().default(""),
    lastName: z.string().optional().default(""),
    group: z.string().optional().default(""),
    institution: z.string().optional().default(""),
  }),
  rawScores: z
    .object({
      reading: z.number().optional(),
      useOfEnglish: z.number().optional(),
      writing: z.number().optional(),
      listening: z.number().optional(),
      speaking: z.number().optional(),
    })
    .partial(),
});

const resolveResendKey = () => env.RESEND_API_KEY ?? env.EMAIL_PASSWORD ?? "";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload." },
      { status: 400 },
    );
  }

  const resendApiKey = resolveResendKey();
  const from = env.EMAIL_FROM ?? "";
  const to = env.EMAIL_TO ?? "";

  if (!resendApiKey || !from || !to) {
    return NextResponse.json(
      { error: "Email configuration is missing." },
      { status: 500 },
    );
  }

  const summary = buildResultsEmail({
    candidate: parsed.data.candidate,
    rawScores: parsed.data.rawScores,
  });

  const resend = new Resend(resendApiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: summary.subject,
    html: summary.html,
    text: summary.text,
    attachments: [
      {
        filename: summary.csvFilename,
        content: Buffer.from(summary.csvContent, "utf8"),
        contentType: "text/csv",
      },
    ],
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Failed to send email." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
