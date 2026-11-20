/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./prisma/template.sqlite'],
    },
  },
};

export default nextConfig;
