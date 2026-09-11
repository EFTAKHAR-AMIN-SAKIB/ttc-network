"use client";

import AdmissionGuideManagerTab from "./AdmissionGuideManagerTab";
import BuilderManagerTab from "./BuilderManagerTab";
import OfficialContactManagerTab from "./OfficialContactManagerTab";
import FeaturePreviewManagerTab from "./FeaturePreviewManagerTab";

import { Globe } from "lucide-react";
import { type UserProfile } from "@/contexts/AuthContext";

export default function QAManagerTab({ profile }: { profile: UserProfile }) {
    return (
        <div className="space-y-4 pb-12">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-2">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white font-english flex items-center gap-2">
                        <Globe size={24} className="text-primary" />
                        Homepage Sections
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage Feature Preview Mockups, Admission Guide, Official Contact, and Builder settings for the homepage.</p>
                </div>
            </div>

            {/* ─── Feature Preview & 3D Mockups Manager ─── */}
            <FeaturePreviewManagerTab />

            {/* ─── Admission Guide Manager ─── */}
            <AdmissionGuideManagerTab />

            {/* ─── Official Contact Manager ─── */}
            <OfficialContactManagerTab />
            
            {/* ─── Builder Section Manager ─── */}
            <BuilderManagerTab />
        </div>
    );
}
