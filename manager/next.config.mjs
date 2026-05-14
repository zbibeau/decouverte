/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing from ../shared/
  transpilePackages: [],
  typescript: {
    // Shared files live outside the manager root; let the tsconfig handle them.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
