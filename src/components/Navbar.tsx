"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Sun, Moon, User, LogOut, ChevronDown, Shield, Search, Bell, Users } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { SearchDialog } from "./SearchDialog";
import { subscribeNotifications, subscribeUnreadNotificationsCount, markNotificationRead, markAllNotificationsRead, deleteNotification, subscribeUsersByCollege, type FirestoreNotification } from "@/lib/firestore";
import { NotificationCenter } from "./NotificationCenter";
import HumanLogo from "./HumanLogo";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/news-feed", label: "News Feed" },
    { href: "/story", label: "Story" },
    { href: "/college-info", label: "College Info" },
    { href: "/notice", label: "Notice" },
    { href: "/study", label: "Study" },
    { href: "/support", label: "Support 💛" },
];



export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { user, profile, loading, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<(FirestoreNotification & { id: string })[]>([]);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);


    // Mounted check for hydration
    useEffect(() => {
        setMounted(true);
    }, []);


    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = subscribeNotifications(user.uid, (data) => {
            setNotifications(data);
        });
        return () => unsub();
    }, [user?.uid]);

    // Subscribe to unread notifications count
    useEffect(() => {
        if (!user?.uid) {
            setUnreadCount(0);
            return;
        }
        const unsub = subscribeUnreadNotificationsCount(user.uid, (count) => {
            setUnreadCount(count);
        });
        return () => unsub();
    }, [user?.uid]);

    // Subscribe to college users for verification count (for managers)
    useEffect(() => {
        const isManager = profile?.role === "manager" || profile?.role === "super_manager" || profile?.role === "admin";
        if (!user?.uid || !isManager || !profile?.collegeId || !profile?.uid) {
            setPendingVerificationsCount(0);
            return;
        }

        const unsub = subscribeUsersByCollege(profile.collegeId, (users) => {
            const unverified = users.filter(u => 
                u.id !== profile.uid && 
                !u.roleVerified && 
                !(u.dismissedBy || []).includes(profile.uid)
            );
            setPendingVerificationsCount(unverified.length);
        });

        return () => unsub();
    }, [user?.uid, profile?.role, profile?.collegeId, profile?.uid]);

    const handleLogout = async () => {
        setDropdownOpen(false);
        await logout();
        router.push("/");
    };

    const handleNotifClick = async (notif: FirestoreNotification & { id: string }) => {
        // Optimistically update local state so UI reflects immediately
        if (!notif.read) {
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
            markNotificationRead(notif.id).catch(console.error);
        }
        setNotifOpen(false);
        
        // Use targetUrl if available (Deep Linking)
        if (notif.targetUrl) {
            router.push(notif.targetUrl);
            return;
        }

        // Fallback for legacy notifications
        if (notif.relatedType === "post") router.push("/news-feed");
        else if (notif.relatedType === "story") router.push(`/story/${notif.relatedId}`);
        else if (notif.relatedType === "college") router.push("/college-info");
        else if (notif.relatedType === "club") router.push("/college-info");
        else if (notif.relatedType === "notice") router.push("/notice");
    };

    const handleMarkAllRead = async () => {
        if (!user?.uid || unreadCount === 0) return;
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await markAllNotificationsRead(user.uid);
        } catch (err) {
            console.error("Failed to mark all as read:", err);
        }
    };

    const handleMarkSingleRead = async (notifId: string) => {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
        try {
            await markNotificationRead(notifId);
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const handleDeleteNotif = async (notifId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        try {
            await deleteNotification(notifId);
        } catch (err) {
            console.error("Failed to delete notification:", err);
        }
    };



    const isAdminOrManager = profile?.role === "admin" || profile?.role === "manager" || profile?.role === "super_manager";
    const panelName = profile?.role === "admin" ? "Admin Panel" : "Management Section";

    const displayName = profile?.displayName || user?.displayName || "User";
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    const photoURL = profile?.photoURL || user?.photoURL || "";

    const { siteName, logoUrl } = useSiteSettings();

    return (
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <HumanLogo logoUrl={logoUrl} siteName={siteName} />

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-3 py-2 rounded-xl text-sm font-bold transition-all relative ${isActive
                                        ? "text-primary dark:text-[#1D9BF0] bg-primary/5 dark:bg-[#1D9BF0]/10"
                                        : "text-gray-900 dark:text-[#71767B] hover:text-primary dark:hover:text-[#1D9BF0] hover:bg-gray-50 dark:hover:bg-white/5"
                                        }`}
                                >
                                    {link.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeNav"
                                            className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right side: Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Search Button */}
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 group"
                            aria-label="Search"
                        >
                            <Search size={18} className="text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors" />
                        </button>

                        {/* Connections & Verifications Panel Link */}
                        {user && (
                            <Link
                                href="/network"
                                className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 group relative ${
                                    pathname === "/network"
                                        ? "bg-primary/10 dark:bg-primary/20 text-primary" 
                                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-primary"
                                }`}
                                aria-label="Network & Verification"
                            >
                                <Users size={18} className={`transition-colors ${pathname === "/network" ? "text-primary" : "text-gray-600 dark:text-gray-400 group-hover:text-primary"}`} />
                                {pendingVerificationsCount > 0 && (
                                    <motion.span 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 bg-blue-500 text-white text-[8px] md:text-[10px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-[#0f1117]"
                                    >
                                        {pendingVerificationsCount > 9 ? "9+" : pendingVerificationsCount}
                                    </motion.span>
                                )}
                            </Link>
                        )}

                        {/* Notification Bell */}
                        {user && (
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={() => setNotifOpen(!notifOpen)}
                                    className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 group relative ${
                                        notifOpen 
                                            ? "bg-primary/10 dark:bg-primary/20" 
                                            : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                                    aria-label="Notifications"
                                >
                                    <Bell size={18} className={`transition-colors ${notifOpen ? "text-primary" : "text-gray-600 dark:text-gray-400 group-hover:text-primary"}`} />
                                    {unreadCount > 0 && (
                                        <motion.span 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[8px] md:text-[10px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-[#0f1117]"
                                        >
                                            {unreadCount > 9 ? "9+" : unreadCount}
                                        </motion.span>
                                    )}
                                </button>

                                <NotificationCenter 
                                    isOpen={notifOpen}
                                    onClose={() => setNotifOpen(false)}
                                    notifications={notifications}
                                    unreadCount={unreadCount}
                                    onMarkRead={handleNotifClick}
                                    onMarkAllRead={handleMarkAllRead}
                                    onMarkSingleRead={handleMarkSingleRead}
                                    onDelete={handleDeleteNotif}
                                />
                            </div>
                        )}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="relative p-2 md:p-2.5 rounded-lg md:rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 group"
                            aria-label="Toggle theme"
                        >
                            <AnimatePresence mode="wait">
                                {mounted && (
                                    theme === "light" ? (
                                        <motion.div
                                            key="moon"
                                            initial={{ rotate: -90, scale: 0 }}
                                            animate={{ rotate: 0, scale: 1 }}
                                            exit={{ rotate: 90, scale: 0 }}
                                            transition={{ duration: 0.3, ease: "easeOut" }}
                                        >
                                            <Moon size={18} className="text-gray-600 group-hover:text-primary transition-colors" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="sun"
                                            initial={{ rotate: 90, scale: 0 }}
                                            animate={{ rotate: 0, scale: 1 }}
                                            exit={{ rotate: -90, scale: 0 }}
                                            transition={{ duration: 0.3, ease: "easeOut" }}
                                        >
                                            <Sun size={18} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
                                        </motion.div>
                                    )
                                )}
                            </AnimatePresence>
                        </button>

                        {/* Login Button or User Avatar */}
                        {loading ? (
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        ) : user ? (
                            /* Logged In — Avatar + Dropdown */
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-1.5 md:gap-2 px-1.5 py-1.5 md:px-2 md:py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                >
                                    {photoURL ? (
                                        <Image
                                            src={photoURL}
                                            alt={displayName}
                                            width={36}
                                            height={36}
                                            className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-primary/20"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs md:text-sm font-bold">
                                            {initials}
                                        </div>
                                    )}
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 max-w-[100px] truncate hidden lg:block">
                                        {displayName.split(" ")[0]}
                                    </span>
                                    <ChevronDown
                                        size={14}
                                        className={`text-gray-400 transition-transform duration-200 hidden md:block ${dropdownOpen ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {/* Dropdown Menu */}
                                <AnimatePresence>
                                    {dropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1b23] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                                        >
                                            {/* User Info Header */}
                                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{displayName}</p>
                                                {profile?.username && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{profile.username}</p>
                                                )}
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                            </div>

                                            {/* Menu Items */}
                                            <div className="py-1">
                                                <Link
                                                    href={`/profile/${profile?.username || user.uid}`}
                                                    onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <User size={16} />
                                                    My Profile
                                                </Link>
                                                {isAdminOrManager && (
                                                    <Link
                                                        href="/admin"
                                                        onClick={() => setDropdownOpen(false)}
                                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                    >
                                                        <Shield size={16} className="text-primary dark:text-blue-400" />
                                                        {panelName}
                                                    </Link>
                                                )}
                                            </div>

                                            {/* Logout */}
                                            <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                                                <button
                                                    onClick={handleLogout}
                                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                >
                                                    <LogOut size={16} />
                                                    Sign Out
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            /* Not Logged In — Login Button */
                            <Link
                                href="/login"
                                className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-accent text-white text-xs md:text-sm font-bold rounded-lg md:rounded-xl hover:bg-red-600 transition-all duration-200 shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30"
                            >
                                <LogIn size={16} />
                                <span className="hidden sm:block">Login</span>
                            </Link>
                        )}

                    </div>
                </div>
            </div>
            
            <SearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </nav>
    );
}
