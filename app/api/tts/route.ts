import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI();

// Turns interviewer question text into spoken audio so the practice session
// feels like a real, verbal interview. Returns an mp3 stream.
export async function POST(request: Request) {
  try {
    const { text, voice } = (await request.json()) as {
      text?: string;
      voice?: string;
    };

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Cap length defensively — interview questions are short.
    const input = text.slice(0, 2000);

    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: (voice as "alloy") || "alloy",
      input,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
