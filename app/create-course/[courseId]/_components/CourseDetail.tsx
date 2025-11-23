import { CourseType } from "@/types/types";
import { MdBarChart, MdAccessTime, MdMenuBook, MdOutlineVideoLibrary } from "react-icons/md";

type CourseDetailProps = {
  courseDetail: CourseType | null;
};

const CourseDetail = ({ courseDetail }: CourseDetailProps) => {
  return (
    <div className="border p-7 rounded-xl shadow-sm mt-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="flex gap-2">
          <MdBarChart className="text-4xl text-primary" />
          <div>
            <h2 className="text-xs text-gray-500">Skill Level</h2>
            <h2 className="font-medium text-lg">{courseDetail?.level}</h2>
          </div>
        </div>

        <div className="flex gap-2">
          <MdAccessTime className="text-4xl text-primary" />
          <div>
            <h2 className="text-xs text-gray-500">Duration</h2>
            <h2 className="font-medium text-lg">{courseDetail?.courseOutput?.duration ?? "-"}</h2>
          </div>
        </div>

        <div className="flex gap-2">
          <MdMenuBook className="text-4xl text-primary" />
          <div>
            <h2 className="text-xs text-gray-500">Chapters</h2>
            <h2 className="font-medium text-lg">{courseDetail?.courseOutput?.chapters?.length ?? 0}</h2>
          </div>
        </div>

        <div className="flex gap-2">
          <MdOutlineVideoLibrary className="text-4xl text-primary" />
          <div>
            <h2 className="text-xs text-gray-500">Video Included</h2>
            <h2 className="font-medium text-lg">{courseDetail?.isVideo}</h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
