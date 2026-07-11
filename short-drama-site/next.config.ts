import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "picsum.photos" }
      ,{ protocol: "https", hostname: "**.dmcdn.net" }
      ,{ protocol: "https", hostname: "netshort.com" }
      ,{ protocol: "https", hostname: "**.netshort.com" }
      ,{ protocol: "https", hostname: "reelshort.com" }
      ,{ protocol: "https", hostname: "**.reelshort.com" }
      ,{ protocol: "https", hostname: "dramabox.com" }
      ,{ protocol: "https", hostname: "**.dramabox.com" }
      ,{ protocol: "https", hostname: "shortdrama.st" }
      ,{ protocol: "https", hostname: "**.shortdrama.st" }
      ,{ protocol: "https", hostname: "free.jowo.tv" }
      ,{ protocol: "https", hostname: "**.jowo.tv" }
      ,{ protocol: "https", hostname: "minishort.com" }
      ,{ protocol: "https", hostname: "**.minishort.com" }
      ,{ protocol: "https", hostname: "dramaflows.com" }
      ,{ protocol: "https", hostname: "**.dramaflows.com" }
    ]
  }
};

export default nextConfig;
