/** @type {import('next').NextConfig} */
// Normal dev/build is untouched. Setting GITHUB_PAGES=true switches to a fully
// static export served from a sub-path (NEXT_PUBLIC_BASE_PATH), which is what
// the Pages preview workflow builds.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig =
  process.env.GITHUB_PAGES === "true"
    ? {
        output: "export",
        basePath,
        trailingSlash: true, // /work/x/ -> index.html, which static hosts like
        images: { unoptimized: true },
      }
    : {};

export default nextConfig;
