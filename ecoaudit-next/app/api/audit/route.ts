import { NextRequest, NextResponse } from "next/server";
import { getClient, MODEL, AUDIT_SYSTEM_PROMPT } from "@/app/lib/claude";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text, image } = await req.json();

    if (!text && !image) {
      return NextResponse.json(
        { error: "Provide text or an image to audit." },
        { status: 400 }
      );
    }

    const client = getClient();

    const content: any[] = [];
    if (image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.base64,
        },
      });
    }
    content.push({
      type: "text",
      text:
        "Audit the following product label, receipt, or sustainability claim. " +
        "If an image is attached, read the text from it first, then audit it.\n\n" +
        (text ? `TEXT PROVIDED:\n${text}` : "TEXT PROVIDED: (see attached image only)"),
    });

    const messages: any[] = [{ role: "user", content }];

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: AUDIT_SYSTEM_PROMPT,
      messages,
    });

    const resultText = response.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({
      result: resultText,
      // echo back a serializable version of what we sent, so the client
      // can carry it forward into debate mode without resending the image.
      originalPrompt: text || "(audit based on uploaded image)",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Audit failed." },
      { status: 500 }
    );
  }
}
