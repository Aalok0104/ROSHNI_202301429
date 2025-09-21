import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // For Docker: Creates a lean build in .next/standalone
  reactStrictMode: true, // Enables stricter checks for potential issues
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.gstatic.com", // For Google icon in login page
        port: "",
        pathname: "/**", // Allow all paths under this domain
      },
      {
        protocol: "https",
        hostname: "developers.google.com", // For Google logo
        port: "",
        pathname: "/**", // Allow all paths under this domain
      },
      // Add more if you use other external images, e.g., your logo if hosted remotely
    ],
  },
  env: {
    // Optional: Inline env vars for build-time validation (but use .env for secrets)
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  // If using webpack customizations (rarely needed), add here
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;