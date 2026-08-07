import { NextRequest, NextResponse } from "next/server";
import { getClient, MODEL, AUDIT_SYSTEM_PROMPT } from "@/app/lib/claude";

export const runtime = "nodejs";

type ChatTurn = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const { history }: { history: ChatTurn[] } = await req.json();

    if (!history || history.length === 0) {
      return NextResponse.json({ error: "No conversation history provided." }, { status: 400 });
    }

    const client = getClient();

    const messages: any[] = history.map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: AUDIT_SYSTEM_PROMPT,
      messages,
    });

    const resultText = response.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ result: resultText });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Debate turn failed." },
      { status: 500 }
    );
  }
}
