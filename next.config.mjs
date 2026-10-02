import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
    additionalPrecacheEntries: [
        { url: "/offline", revision: Date.now().toString() },
        { url: "/news-feed", revision: Date.now().toString() },
    ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
            {
                protocol: "https",
                hostname: "pub-9172f31a1ae846ef8b20fc71e0cb1b17.r2.dev",
            },
            {
                protocol: "https",
                hostname: "pub-4284313013c34914aa80d21958157196.r2.dev",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            {
                protocol: "https",
                hostname: "*.googleusercontent.com",
            },
            {
                protocol: "https",
                hostname: "*.facebook.com",
            },
            {
                protocol: "https",
                hostname: "*.fbsbx.com",
            },
            {
                protocol: "https",
                hostname: "*.gravatar.com",
            },
            {
                protocol: "https",
                hostname: "avatars.githubusercontent.com",
            },
            {
                protocol: "https",
                hostname: "firebasestorage.googleapis.com",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "ui-avatars.com",
            },
            {
                protocol: "https",
                hostname: "drive.google.com",
            },
            {
                protocol: "https",
                hostname: "doc-08-0s-docs.googleusercontent.com",
            },
        ],
    },

    // ── Security Headers ──────────────────────────────
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=31536000; includeSubDomains",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                ],
            },
        ];
    },

    // ── Redirects ─────────────────────────────────────
    async redirects() {
        return [
            {
                source: "/TTC-Network.apk",
                destination: "https://pub-9172f31a1ae846ef8b20fc71e0cb1b17.r2.dev/app/TTC-Network.apk",
                permanent: false,
            },
        ];
    },
};

export default withSerwist(nextConfig);
