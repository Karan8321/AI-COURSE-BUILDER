"use client";
import { useEffect } from "react";

declare global {
  interface Window {
    anime?: any;
  }
}

export default function AnimatedMount() {
  useEffect(() => {
    const el = document.getElementById("page-root");
    if (!el) return;
    const anime = (window as any).anime;
    if (typeof anime === "function") {
      anime({
        targets: el,
        opacity: [0, 1],
        translateY: [6, 0],
        duration: 500,
        easing: "easeOutQuad",
      });
    } else {
      el.style.opacity = "1";
      el.style.transform = "none";
    }
  }, []);
  return null;
}
