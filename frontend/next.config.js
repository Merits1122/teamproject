/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/dashboard/settings",
        destination: "/dashboard/setting",
        permanent: true,
      },
      {
        source: "/dashboard/settings/:path*",
        destination: "/dashboard/setting/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/projects",
        destination: "/dashboard/project",
        permanent: true,
      },
      {
        source: "/dashboard/projects/:path*",
        destination: "/dashboard/project/:path*",
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        // 모든 경로에 이 헤더를 적용합니다.
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups", // 팝업과의 통신을 허용
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
