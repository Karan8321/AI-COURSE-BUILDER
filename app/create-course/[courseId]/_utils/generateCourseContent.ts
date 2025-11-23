// Use server API for chapter generation
import { getYoutubeVideos } from "@/configs/service";
import { db } from "@/configs/db";
import { CourseChapters } from "@/schema/schema";
import { CourseType } from "@/types/types";

export const generateCourseContent = async (
  course: CourseType,
  setLoading: (loading: boolean) => void
) => {
  setLoading(true);

  try {
    const chapters = course?.courseOutput.chapters;

    const chapterPromises = chapters?.map(async (chapter, index) => {
      const PROMPT = `Explain the concepts in detail on Topic: ${course?.courseName}, Chapter: ${chapter.chapter_name}, in JSON Format with list of array with fields as Title, explanation of given chapter in detail, code examples (code field <precode> format) if applicable.`;

      try {
        const query = course!.courseName + ":" + chapter.chapter_name;

        const respGen = await fetch("/api/generate-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseName: course?.courseName,
            chapterName: chapter.chapter_name,
          }),
        });
        if (!respGen.ok) {
          const err = await respGen.json().catch(() => ({}));
          throw new Error(err?.error || "Chapter generation failed");
        }
        const { data: content } = await respGen.json();
        const normalizedContent = Array.isArray(content) ? content : [];

        let videoId = "";
        try {
          const resp = await getYoutubeVideos(query);
          const first = Array.isArray(resp) && resp.length > 0 ? resp[0] : null;
          videoId = first?.id?.videoId ?? "";
        } catch (e) {
          videoId = "";
        }

        await db.insert(CourseChapters).values({
          chapterId: index,
          courseId: course.courseId,
          content: normalizedContent,
          videoId: videoId,
        });
      } catch (error) {
        console.log(`Error in processing chapter ${index}:`, error);
      }
    });

    await Promise.all(chapterPromises!);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};
