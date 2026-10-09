/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.unsplash.com"],
  },
  async redirects() {
    return [
      {
        source: "/community",
        destination: "/community/groups/building-healthy-habits",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

