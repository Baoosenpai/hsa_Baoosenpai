/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  serverExternalPackages: ['pg', 'bcryptjs', 'pdf-parse', 'mammoth', 'pg-connection-string', 'pgpass'],
  bundlePagesRouterDependencies: false,
}
export default nextConfig