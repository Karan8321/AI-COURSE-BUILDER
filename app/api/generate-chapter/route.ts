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
    const { courseName, chapterName } = body || {};
    if (!courseName || !chapterName) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: courseName, chapterName" },
        { status: 400 }
      );
    }

    const prompt = `Return STRICT JSON (no markdown) as an array of sections with this shape:
[
  { "title": string, "explanation": string, "code_examples": [{"code": string | string[]}] }
]

Explain the concepts in detail for Topic: ${courseName}, Chapter: ${chapterName}. Include multiple sections with detailed explanations and optional code examples (code field should use <precode> ... </precode>).`;

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
          max_tokens: 4096,
          top_p: 0.95,
        });
        break;
      } catch (err: any) {
        lastErr = err;
        completion = null;
        const msg = err?.message || "";
        if (err?.status === 404 || err?.status === 400 || /model/i.test(msg)) {
          continue;
        }
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
    let parsed: any;
    try {
      const cleaned = text.replace(/```json|```/g, "");
      parsed = JSON.parse(cleaned);
    } catch {
      // Try array or object extraction
      const arrStart = text.indexOf("[");
      const arrEnd = text.lastIndexOf("]");
      const objStart = text.indexOf("{");
      const objEnd = text.lastIndexOf("}");
      if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
        parsed = JSON.parse(text.substring(arrStart, arrEnd + 1));
      } else if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
        parsed = JSON.parse(text.substring(objStart, objEnd + 1));
      } else {
        throw new Error("Failed to parse JSON from model response");
      }
    }

    // Normalize to an array of sections
    const toArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);
    const rawSections = Array.isArray(parsed)
      ? parsed
      : toArray(parsed?.content) || toArray(parsed?.sections) || toArray(parsed?.lessons);

    const sections = rawSections.map((s: any) => {
      const title = s?.title ?? s?.name ?? s?.heading ?? "Section";
      const explanation = s?.explanation ?? s?.desc ?? s?.content ?? "";
      let codeExamples = s?.code_examples ?? s?.examples ?? [];
      codeExamples = toArray(codeExamples).map((ce: any) => {
        const code = ce?.code ?? ce ?? "";
        return {
          code: Array.isArray(code) ? code : [String(code)],
        };
      });
      return { title, explanation, code_examples: codeExamples };
    });

    // Guarantee at least one section so UI never breaks
    const ensuredSections = Array.isArray(sections) && sections.length > 0
      ? sections
      : [
          {
            title: "Overview",
            explanation:
              "Content is being prepared for this chapter. Please check back soon.",
            code_examples: [],
          },
        ];

    // Return array of sections; caller persists this directly into DB 'content'
    return NextResponse.json({ ok: true, data: ensuredSections });
  } catch (error: any) {
    console.error("/api/generate-chapter error", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to generate" },
      { status: 500 }
    );
  }
}


