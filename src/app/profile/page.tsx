"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * /profile → redirects to /profile/[username] for the logged-in user,
 * or to /login if not authenticated.
 */
export default function ProfileRedirect() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (user) {
            if (profile?.username) {
                router.replace(`/profile/${profile.username}`);
            } else {
                router.replace(`/profile/${user.uid}`);
            }
        } else {
            router.replace("/login?redirect=/profile");
        }
    }, [user, profile, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-[#0f1117]">
            <div className="animate-pulse text-gray-400 text-sm">Redirecting to your profile...</div>
        </div>
    );
}
