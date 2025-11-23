import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;
const groq = apiKey ? new Groq({ apiKey }) : null;

export async function POST(req: Request) {
  try {
    if (!apiKey || !groq) {
      return NextResponse.json(
        { ok: false, error: "Missing GROQ_API_KEY on server. Set it in .env.local and restart the dev server." },
        { status: 500 }
      );
    }
    const body = await req.json();
    const {
      category,
      topic,
      description,
      difficulty,
      duration,
      totalChapters,
    } = body || {};

    if (!category || !topic || !description || !difficulty || !duration || !totalChapters) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: category, topic, description, difficulty, duration, totalChapters" },
        { status: 400 }
      );
    }

    const prompt = `You are to return STRICT JSON that conforms to this schema. Do not include markdown or code fences.
{
  "topic": string,
  "description": string,
  "duration": string,
  "level": string,
  "chapters": [
    { "chapter_name": string, "description": string, "duration": string }
  ]
}

Generate a course tutorial with the following details:
Category: '${category}'
Topic: '${topic}'
Description: '${description}'
Level: '${difficulty}'
Duration: '${duration}'
Chapters: '${totalChapters}'`;

    const candidateModels = [
      "llama-3.3-70b-specdec",
      "llama-3.2-90b-text",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ];

    let completion: any = null;
    let lastErr: any = null;
    for (const model of candidateModels) {
      try {
        completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that ONLY returns strict JSON without any extra text, code fences, or commentary.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 1,
          max_tokens: 8192,
          top_p: 0.95,
        });
        // If request succeeds, break out
        break;
      } catch (err: any) {
        lastErr = err;
        completion = null;
        // Try next model on 400/404 model-related errors
        const msg = err?.message || "";
        if (err?.status === 404 || err?.status === 400 || /model/i.test(msg)) {
          continue;
        }
        // Non-model error; stop trying
        break;
      }
    }

    if (!completion) {
      const tried = candidateModels.join(", ");
      const detail = lastErr?.message || "No supported model worked";
      return NextResponse.json(
        { ok: false, error: `Model selection failed. Tried: ${tried}. Detail: ${detail}` },
        { status: 502 }
      );
    }

    const text = completion.choices[0]?.message?.content || "";
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Model returned empty content" },
        { status: 502 }
      );
    }

    let json: any;
    try {
      const cleaned = text.replace(/```json|```/g, "");
      json = JSON.parse(cleaned);
    } catch {
      // Fallback: try extracting the largest JSON object substring
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const maybe = text.substring(start, end + 1);
        json = JSON.parse(maybe);
      } else {
        throw new Error("Failed to parse JSON from model response");
      }
    }

    // Normalize to expected shape
    const normalizeCourse = (obj: any) => {
      const safeString = (v: any, def = "-") => (typeof v === "string" && v.trim().length > 0 ? v : def);
      const chaptersInput =
        Array.isArray(obj?.chapters)
          ? obj.chapters
          : Array.isArray(obj?.lessons)
          ? obj.lessons
          : Array.isArray(obj?.sections)
          ? obj.sections
          : [];

      const chapters = chaptersInput
        .map((c: any, i: number) => {
          const name = c?.chapter_name ?? c?.title ?? c?.name ?? `Chapter ${i + 1}`;
          const desc = c?.description ?? c?.about ?? c?.summary ?? "";
          const dur = c?.duration ?? c?.time ?? "~10m";
          return {
            chapter_name: safeString(name, `Chapter ${i + 1}`),
            description: safeString(desc, ""),
            duration: safeString(dur, "~10m"),
          };
        })
        .slice(0, Number(totalChapters) || undefined);

      // Ensure at least one chapter exists to avoid empty UI
      const ensuredChapters = chapters.length > 0
        ? chapters
        : [
            {
              chapter_name: "Introduction",
              description: safeString(obj?.description, description),
              duration: safeString(obj?.duration, duration),
            },
          ];

      return {
        topic: safeString(obj?.topic, topic),
        description: safeString(obj?.description, description),
        duration: safeString(obj?.duration, duration),
        level: safeString(obj?.level, difficulty),
        chapters: ensuredChapters,
      };
    };

    const normalized = normalizeCourse(json);
    if (!Array.isArray(normalized.chapters) || normalized.chapters.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Model did not return chapters. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, data: normalized });
  } catch (error: any) {
    console.error("/api/generate-course error", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to generate" },
      { status: 500 }
    );
  }
}


