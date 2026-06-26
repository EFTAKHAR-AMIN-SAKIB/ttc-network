"use client";

import React from "react";
import Image from "next/image";
import { Users, User, ArrowRight } from "lucide-react";
import { FirestoreClub } from "@/lib/firestore";

interface ClubCardProps {
    club: FirestoreClub & { id: string };
    onClick: () => void;
}

const categoryColors = {
    Sports: "from-amber-500/20 to-orange-500/5 text-amber-600 dark:text-amber-400",
    Academic: "from-blue-500/20 to-indigo-500/5 text-blue-600 dark:text-blue-400",
    Cultural: "from-purple-500/20 to-pink-500/5 text-purple-600 dark:text-purple-400",
    Social: "from-emerald-500/20 to-teal-500/5 text-emerald-600 dark:text-emerald-400",
    Other: "from-gray-500/20 to-slate-500/5 text-gray-600 dark:text-gray-400",
};

export default function ClubCard({ club, onClick }: ClubCardProps) {
    const [bannerError, setBannerError] = React.useState(false);
    const [logoError, setLogoError] = React.useState(false);
    const colorClass = categoryColors[club.category || "Other"];

    return (
        <div 
            onClick={onClick}
            className="group relative bg-white dark:bg-[#161620] rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
        >
            {/* Top Pattern / Accent or Banner */}
            {club.bannerUrl && !bannerError ? (
                <div className="h-20 w-full relative">
                    <Image 
                        src={club.bannerUrl} 
                        alt="Banner" 
                        fill 
                        className="object-cover opacity-90" 
                        onError={() => setBannerError(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
            ) : (
                <div className={`h-2 w-full bg-gradient-to-r ${colorClass.split(" ")[0]}`} />
            )}
            
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                        {club.logo && !logoError ? (
                            <Image 
                                src={club.logo} 
                                alt={club.name} 
                                width={40} 
                                height={40} 
                                className="object-cover rounded-xl" 
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <span>{club.icon || "🎯"}</span>
                        )}
                    </div>
                    
                    <div className="flex flex-col items-end">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-gray-50 dark:bg-[#0C0C10] ${colorClass.split(" ").pop()}`}>
                            {club.category || "Other"}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
                        {club.name}
                    </h3>
                    {club.tagline && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium mt-1">
                            &quot;{club.tagline}&quot;
                        </p>
                    )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                            <Users size={14} className="text-gray-400" />
                            <span>{club.membersCount}</span>
                        </div>
                        <div className="h-4 w-px bg-gray-100 dark:bg-gray-800" />
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400">
                            <User size={14} className="text-gray-400" />
                            <span className="truncate max-w-[80px]">{club.advisorName || "No Advisor"}</span>
                        </div>
                    </div>
                    
                    <div className="p-2 bg-gray-50 dark:bg-[#0C0C10] rounded-xl text-gray-400 group-hover:text-primary group-hover:bg-primary/5 transition-all">
                        <ArrowRight size={16} />
                    </div>
                </div>
            </div>

            {/* Hover Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
}
