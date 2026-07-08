import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
    });

    // verbose_json returns text + duration + per-segment timings.
    // Segments power pause detection for delivery metrics; existing callers
    // that only read `text` continue to work unchanged.
    return NextResponse.json({
      text: transcription.text,
      duration: transcription.duration ?? null,
      segments:
        transcription.segments?.map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        })) ?? [],
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
