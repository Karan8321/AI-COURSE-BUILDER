import { BaseEnvironment } from "./BaseEnvironment";
import axios from "axios";

const env = new BaseEnvironment();

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

// Parse ISO8601 duration to seconds (e.g., PT7M30S => 450s)
const parseISODurationToSeconds = (isoDuration: string): number => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
};

// Returns search items, preferring videos with duration >= minSeconds (default 300s)
export const getYoutubeVideos = async (query: string, minSeconds: number = 300) => {
  // Fetch a handful of candidates first
  const searchParams = {
    part: "snippet",
    q: query,
    maxResults: 10,
    type: "video",
    key: env.YOUTUBE_API_KEY,
  } as const;

  const searchResp = await axios.get(YOUTUBE_SEARCH_URL, { params: searchParams });
  const items: any[] = searchResp.data.items || [];
  if (items.length === 0) return items;

  // Look up contentDetails for durations
  const ids = items.map((i) => i.id.videoId).filter(Boolean).join(",");
  if (!ids) return items;

  const videosParams = {
    part: "contentDetails",
    id: ids,
    key: env.YOUTUBE_API_KEY,
  } as const;
  const videosResp = await axios.get(YOUTUBE_VIDEOS_URL, { params: videosParams });
  const detailsById: Record<string, number> = {};
  for (const v of videosResp.data.items || []) {
    const dur = v?.contentDetails?.duration || "";
    detailsById[v?.id] = parseISODurationToSeconds(dur);
  }

  // Filter by minSeconds, keep original order
  const filtered = items.filter((it) => (detailsById[it.id.videoId] || 0) >= minSeconds);
  return filtered.length > 0 ? filtered : items;
};
