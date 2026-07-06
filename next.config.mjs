/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mysql2', 'bcryptjs', 'jsonwebtoken', 'pdfkit', 'googleapis'],
  },
}
export default nextConfig
