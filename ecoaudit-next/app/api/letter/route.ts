import { NextRequest, NextResponse } from "next/server";
import { getClient, MODEL, LETTER_SYSTEM_PROMPT } from "@/app/lib/claude";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { auditFinding, companyName, format } = await req.json();

    if (!auditFinding) {
      return NextResponse.json(
        { error: "No audit finding provided to base the letter on." },
        { status: 400 }
      );
    }

    const client = getClient();

    const prompt =
      `Based on this EcoAudit finding:\n\n${auditFinding}\n\n` +
      `Draft a ${format === "social" ? "short social media post" : "email"} addressed to ` +
      `${companyName || "the company"} asking for transparency/substantiation on the flagged claim(s). ` +
      `Professional, firm, polite, concise.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: LETTER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const resultText = response.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ result: resultText });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Letter generation failed." },
      { status: 500 }
    );
  }
}
