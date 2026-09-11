import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TTC NETWORK",
    short_name: "TTC NETWORK",
    description:
      "A unified community platform for all Government Teachers' Training Colleges of Bangladesh.",
    start_url: "/news-feed?source=pwa",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    orientation: "portrait",
    id: "/",
    scope: "/",
    categories: ["education", "social"],
    shortcuts: [
      {
        name: "Feed & Discussions",
        short_name: "Feed",
        description: "View updates from your college and peers",
        url: "/news-feed",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Official Notices",
        short_name: "Notices",
        description: "Check official notices and circulars",
        url: "/notice",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Study Hub",
        short_name: "Study",
        description: "Access handouts, questions, and notes",
        url: "/study",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "15 Govt. TTCs",
        short_name: "Colleges",
        description: "Explore all Teachers' Training Colleges",
        url: "/college-info",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
