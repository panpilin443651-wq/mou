import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ไฟล์แนบอาจมีขนาดใหญ่ จึงขยายเพดานของ Server Action ไว้ที่ 25MB
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
