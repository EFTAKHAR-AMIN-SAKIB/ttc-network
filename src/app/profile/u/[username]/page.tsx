"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * Legacy Username-based Profile Route
 * ===================================
 * Redirects from /profile/u/[username] to /profile/[username]
 */
export default function UsernameRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const username = params.username as string;

    useEffect(() => {
        if (username) {
            router.replace(`/profile/${username}`);
        }
    }, [username, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-[#0f1117]">
            <div className="animate-pulse text-gray-400 text-sm">Redirecting to profile...</div>
        </div>
    );
}
