// /configs/ai-models.ts
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
});

// Create a chat completion function that mimics Gemini's interface
export function GenerateCourseLayout() {
  return {
    sendMessage: async (message: string) => {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
          model: "llama-3.1-70b-versatile",
          temperature: 1,
          max_tokens: 8192,
          top_p: 0.95,
        });

        return {
          response: {
            text: () => completion.choices[0]?.message?.content || "",
          },
        };
      } catch (error) {
        console.error("Groq API error:", error);
        throw error;
      }
    },
  };
}

// Export function for generating course chapters (missing function)
export const generateCourseChapters = {
  sendMessage: async (message: string) => {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
        model: "llama-3.1-70b-versatile",
        temperature: 1,
        max_tokens: 8192,
        top_p: 0.95,
      });

      return {
        response: {
          text: () => completion.choices[0]?.message?.content || "",
        },
      };
    } catch (error) {
      console.error("Groq API error:", error);
      throw error;
    }
  },
};
