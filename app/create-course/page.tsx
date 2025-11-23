"use client";

import React, { useContext, useEffect, useState } from "react";
import { stepperOptions } from "./_constants/stepperOptions";
import { Button } from "@/components/ui/button";
import SelectCategory from "./_components/SelectCategory";
import TopicDesc from "./_components/TopicDesc";
import SelectOption from "./_components/SelectOption";
import { UserInputContext } from "../_context/UserInputContext";
import { FaWandMagicSparkles } from "react-icons/fa6";
// Removed direct client-side AI call; now using server API route
import LoadingDialog from "./_components/LoadingDialog";
import { useUser } from "@clerk/nextjs";
import { storeDataInDatabase } from "./_utils/saveDataInDb";
import uuid4 from "uuid4";
import { useRouter } from "next/navigation";

import { db } from "@/configs/db";
import { CourseList } from "@/schema/schema";
import { eq } from "drizzle-orm";
import { CourseType } from "@/types/types";
import { UserCourseListContext } from "../_context/UserCourseList.context";

const CreateCoursePage = () => {
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const { userInput } = useContext(UserInputContext);
  const { userCourseList, setUserCourseList } = useContext(UserCourseListContext);
  const { user } = useUser();
  const router = useRouter();

  const getUserCourses = async () => {
    const res = await db
      .select()
      .from(CourseList)
      .where(
        eq(CourseList.createdBy, user?.primaryEmailAddress?.emailAddress ?? "")
      );
    setUserCourseList(res as CourseType[]);
  };

  const allowNextStep = () => {
    if (step === 0) {
      return (userInput?.category?.length ?? 0) > 0;
    } else if (step === 1) {
      return !!userInput?.topic && !!userInput?.description;
    } else if (step === 2) {
      return (
        !!userInput?.difficulty &&
        !!userInput?.duration &&
        !!userInput?.video &&
        !!userInput?.totalChapters
      );
    }
    return false;
  };

  // ✅ Generate course via server API
  const generateCourse = async () => {
    setLoading(true);
    try {
      const id = uuid4();
      const resp = await fetch("/api/generate-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: userInput?.category,
          topic: userInput?.topic,
          description: userInput?.description,
          difficulty: userInput?.difficulty,
          duration: userInput?.duration,
          totalChapters: userInput?.totalChapters,
        }),
      });
      const payload = await resp.json().catch(() => ({ ok: false, error: "Invalid server response" }));
      if (!resp.ok || !payload?.ok) {
        throw new Error(payload?.error || "Generation failed");
      }
      const { data } = payload;
      if (!Array.isArray(data?.chapters) || data.chapters.length === 0) {
        throw new Error("No chapters returned. Please try again.");
      }

      await storeDataInDatabase(id, userInput, data, user);
      router.replace(`/create-course/${id}`);
    } catch (error) {
      console.error("Error generating course:", error);
      const message = (error as any)?.message || "Failed to generate course. Please try again.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) getUserCourses();
    if (userCourseList.length > 5) {
      router.replace("/dashboard/upgrade");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userCourseList]);

  return (
    <div>
      <div className="flex flex-col justify-center items-center mt-10">
        <h2 className="text-4xl text-primary font-medium">Create Course</h2>
        <div className="flex mt-10">
          {stepperOptions.map((option, index) => (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center w-[50px] md:w-[100px]">
                <div
                  className={`bg-gray-200 p-3 rounded-full text-white ${
                    step >= index && "bg-purple-500"
                  }`}
                >
                  <option.icon />
                </div>
                <p className="hidden md:block md:text-sm">{option.name}</p>
              </div>
              {index !== stepperOptions.length - 1 && (
                <div
                  className={`h-1 w-[50px] md-w-[100px] rounded-full lg:w-[170px] bg-gray-300 ${
                    step > index && "bg-purple-500"
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-10 md:px-20 lg-px-44 mt-10 ">
        {step === 0 ? (
          <SelectCategory />
        ) : step === 1 ? (
          <TopicDesc />
        ) : (
          <SelectOption />
        )}

        <div className="flex justify-between mt-10">
          <Button
            variant={"outline"}
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            Previous
          </Button>
          {stepperOptions.length - 1 === step ? (
            <Button
              disabled={!allowNextStep() || loading}
              onClick={generateCourse}
              className="gap-2"
            >
              <FaWandMagicSparkles /> Generate Course
            </Button>
          ) : (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!allowNextStep()}
            >
              Next
            </Button>
          )}
        </div>
      </div>

      <LoadingDialog loading={loading} />
    </div>
  );
};

export default CreateCoursePage;