"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
    Save,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    RotateCcw,
    Lock,
    Info,
    ChevronDown,
    Sparkles,
    Users,
    GraduationCap,
    Building2,
    UserCheck,
} from "lucide-react";
import { type UserProfile } from "@/contexts/AuthContext";
import { useRolePermissions } from "@/contexts/RolePermissionsContext";
import {
    type ConfigurableRole,
    type PermissionKey,
    type RolePermissionsConfig,
    PERMISSION_DEFINITIONS,
    PERMISSION_CATEGORIES,
    DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/rolePermissions";

// ═══════════════════════════════════════════════════
//  ROLE METADATA
// ═══════════════════════════════════════════════════

const ROLE_META: Record<ConfigurableRole, { label: string; icon: typeof Users; color: string; bg: string; border: string; description: string }> = {
    student: {
        label: "Student",
        icon: GraduationCap,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800/60",
        description: "Standard community members — verified students of TTC campuses",
    },
    teacher: {
        label: "Teacher",
        icon: Building2,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        border: "border-emerald-200 dark:border-emerald-800/60",
        description: "Academic faculty and instructors of TTC campuses",
    },
    manager: {
        label: "Campus Manager",
        icon: UserCheck,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-800/60",
        description: "Official campus representative — scoped to their own college",
    },
    super_manager: {
        label: "Super Manager",
        icon: Shield,
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-50 dark:bg-purple-950/30",
        border: "border-purple-200 dark:border-purple-800/60",
        description: "Network-wide moderation lead — operates across all campuses",
    },
};

const CATEGORY_ICONS: Record<string, string> = {
    "Content Creation": "📝",
    "Auto-Approval": "⚡",
    "Content Moderation": "🛡️",
    "College & Club Management": "🏫",
    "User Management": "👥",
    "Platform": "⚙️",
};

// ═══════════════════════════════════════════════════
//  TOGGLE SWITCH COMPONENT
// ═══════════════════════════════════════════════════

function PermissionToggle({
    enabled,
    onChange,
    disabled,
}: {
    enabled: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 
                dark:focus:ring-offset-gray-900
                ${enabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"}
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${enabled ? "translate-x-5" : "translate-x-0"}
                `}
            />
        </button>
    );
}

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════

export default function RolePermissionsTab({ profile }: { profile: UserProfile }) {
    const { config, loading: contextLoading, saveConfig, lastSaved } = useRolePermissions();

    // Local working copy of the permissions (so we can batch changes)
    const [localConfig, setLocalConfig] = useState<RolePermissionsConfig>(config);
    const [selectedRole, setSelectedRole] = useState<ConfigurableRole>("student");
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(PERMISSION_CATEGORIES));

    // Sync local config when context config changes (from other admin sessions or initial load)
    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    // Check if there are unsaved changes
    const hasChanges = useMemo(() => {
        return JSON.stringify(localConfig) !== JSON.stringify(config);
    }, [localConfig, config]);

    // Count changes per role
    const changesCount = useMemo(() => {
        const counts: Record<ConfigurableRole, number> = { student: 0, teacher: 0, manager: 0, super_manager: 0 };
        const roles: ConfigurableRole[] = ["student", "teacher", "manager", "super_manager"];
        for (const role of roles) {
            for (const def of PERMISSION_DEFINITIONS) {
                if (localConfig[role][def.key] !== config[role][def.key]) {
                    counts[role]++;
                }
            }
        }
        return counts;
    }, [localConfig, config]);

    const totalChanges = Object.values(changesCount).reduce((a, b) => a + b, 0);

    // Toggle a single permission
    const togglePermission = (role: ConfigurableRole, key: PermissionKey, value: boolean) => {
        setLocalConfig(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [key]: value,
            },
        }));
    };

    // Reset a role to defaults
    const resetRoleToDefaults = (role: ConfigurableRole) => {
        setLocalConfig(prev => ({
            ...prev,
            [role]: { ...DEFAULT_ROLE_PERMISSIONS[role] },
        }));
    };

    // Discard all changes
    const discardChanges = () => {
        setLocalConfig(config);
    };

    // Save to Firestore
    const handleSave = async () => {
        setSaving(true);
        setSaveMessage(null);
        try {
            await saveConfig(localConfig);
            setSaveMessage({ text: "✅ Permissions saved and applied immediately across the network!", type: "success" });
            setTimeout(() => setSaveMessage(null), 5000);
        } catch (err) {
            console.error("[RolePermissions] Save failed:", err);
            setSaveMessage({
                text: `❌ Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`,
                type: "error",
            });
        } finally {
            setSaving(false);
        }
    };

    // Toggle category expansion
    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    // Get permissions for the selected role, grouped by category
    const permissionsByCategory = useMemo(() => {
        const grouped: Record<string, typeof PERMISSION_DEFINITIONS> = {};
        for (const cat of PERMISSION_CATEGORIES) {
            grouped[cat] = PERMISSION_DEFINITIONS.filter(d => d.category === cat);
        }
        return grouped;
    }, []);

    // Restrict to admin only
    if (profile.role !== "admin") {
        return (
            <div className="bg-white dark:bg-[#1a1b23] rounded-2xl p-8 border border-gray-100 dark:border-gray-800 text-center">
                <Lock size={48} className="text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h3>
                <p className="text-gray-700 dark:text-gray-400">Only Platform Administrators can manage role permissions.</p>
            </div>
        );
    }

    if (contextLoading) {
        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#1a1b23] rounded-3xl p-8 border border-gray-100 dark:border-gray-800 flex items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-primary" size={24} />
                    <span className="text-sm font-bold text-gray-500">Loading role permissions...</span>
                </div>
            </div>
        );
    }

    const selectedMeta = ROLE_META[selectedRole];
    const SelectedIcon = selectedMeta.icon;

    return (
        <div className="space-y-6">
            {/* ══ HEADER ══ */}
            <div className="bg-white dark:bg-[#1a1b23] rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                Role Permissions
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                Configure what each role can do — changes apply instantly across the network
                            </p>
                        </div>
                    </div>

                    {/* Admin badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/60 rounded-xl">
                        <Lock size={12} className="text-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                            Admin Only
                        </span>
                    </div>
                </div>

                {/* Info banner */}
                <div className="mt-4 flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                    <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        <strong>How it works:</strong> Toggle permissions for each role below. Once you save, the changes 
                        take effect <strong>immediately</strong> for all users across the platform. The Admin role always has 
                        full access and cannot be restricted.
                        {lastSaved && (
                            <span className="block mt-1 text-blue-500 dark:text-blue-400">
                                Last saved: {lastSaved.toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ SAVE / STATUS BAR ══ */}
            <AnimatePresence>
                {(hasChanges || saveMessage) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`
                            sticky top-0 sm:top-auto z-20 rounded-2xl p-4 border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                            ${saveMessage?.type === "error"
                                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                                : saveMessage?.type === "success"
                                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                                    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                            }
                        `}
                    >
                        <div className="flex items-center gap-2">
                            {saveMessage ? (
                                saveMessage.type === "success"
                                    ? <CheckCircle2 size={16} className="text-emerald-500" />
                                    : <AlertTriangle size={16} className="text-red-500" />
                            ) : (
                                <Sparkles size={16} className="text-amber-500" />
                            )}
                            <span className={`text-sm font-bold ${
                                saveMessage?.type === "error" ? "text-red-700 dark:text-red-300" :
                                saveMessage?.type === "success" ? "text-emerald-700 dark:text-emerald-300" :
                                "text-amber-700 dark:text-amber-300"
                            }`}>
                                {saveMessage
                                    ? saveMessage.text
                                    : `${totalChanges} unsaved change${totalChanges !== 1 ? "s" : ""} across ${
                                        Object.values(changesCount).filter(c => c > 0).length
                                    } role${Object.values(changesCount).filter(c => c > 0).length !== 1 ? "s" : ""}`
                                }
                            </span>
                        </div>

                        {hasChanges && !saveMessage && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={discardChanges}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                >
                                    <RotateCcw size={12} />
                                    Discard
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Save size={14} />
                                    )}
                                    {saving ? "Saving..." : "Save & Apply"}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══ ROLE SELECTOR ══ */}
            <div className="bg-white dark:bg-[#1a1b23] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-1.5 flex gap-1.5 overflow-x-auto scrollbar-none">
                    {(["student", "teacher", "manager", "super_manager"] as ConfigurableRole[]).map((role) => {
                        const meta = ROLE_META[role];
                        const Icon = meta.icon;
                        const isActive = selectedRole === role;
                        const roleChanges = changesCount[role];

                        return (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`
                                    relative flex-1 min-w-[100px] flex flex-col items-center gap-1.5 py-3 px-3 rounded-2xl text-center transition-all
                                    ${isActive
                                        ? `${meta.bg} ${meta.border} border shadow-sm`
                                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent"
                                    }
                                `}
                            >
                                <Icon size={18} className={isActive ? meta.color : "text-gray-400 dark:text-gray-500"} />
                                <span className={`text-[11px] font-bold ${isActive ? meta.color : "text-gray-500 dark:text-gray-400"}`}>
                                    {meta.label}
                                </span>
                                {roleChanges > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-black flex items-center justify-center">
                                        {roleChanges}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ══ ROLE DESCRIPTION ══ */}
            <div className={`rounded-2xl p-4 border ${selectedMeta.border} ${selectedMeta.bg} flex items-center gap-3`}>
                <SelectedIcon size={20} className={selectedMeta.color} />
                <div>
                    <h3 className={`text-sm font-bold ${selectedMeta.color}`}>{selectedMeta.label}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{selectedMeta.description}</p>
                </div>
                <button
                    onClick={() => resetRoleToDefaults(selectedRole)}
                    className="ml-auto flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors"
                    title="Reset this role to factory defaults"
                >
                    <RotateCcw size={10} />
                    Reset Defaults
                </button>
            </div>

            {/* ══ PERMISSION CATEGORIES ══ */}
            <div className="space-y-3">
                {PERMISSION_CATEGORIES.map((category) => {
                    const permissions = permissionsByCategory[category];
                    if (!permissions || permissions.length === 0) return null;

                    const isExpanded = expandedCategories.has(category);
                    const enabledCount = permissions.filter(p => localConfig[selectedRole][p.key]).length;

                    return (
                        <div
                            key={category}
                            className="bg-white dark:bg-[#1a1b23] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
                        >
                            {/* Category Header */}
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{CATEGORY_ICONS[category]}</span>
                                    <div className="text-left">
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                                            {category}
                                        </h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                            {enabledCount} / {permissions.length} enabled
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Mini progress bar */}
                                    <div className="hidden sm:flex items-center gap-1">
                                        {permissions.map((p) => (
                                            <div
                                                key={p.key}
                                                className={`w-2 h-2 rounded-full transition-colors ${
                                                    localConfig[selectedRole][p.key]
                                                        ? "bg-primary"
                                                        : "bg-gray-200 dark:bg-gray-700"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <ChevronDown
                                        size={16}
                                        className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                    />
                                </div>
                            </button>

                            {/* Permission Rows */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="border-t border-gray-100 dark:border-gray-800">
                                            {permissions.map((perm, idx) => {
                                                const isEnabled = localConfig[selectedRole][perm.key];
                                                const isChanged = localConfig[selectedRole][perm.key] !== config[selectedRole][perm.key];
                                                const isDefault = localConfig[selectedRole][perm.key] === DEFAULT_ROLE_PERMISSIONS[selectedRole][perm.key];

                                                return (
                                                    <div
                                                        key={perm.key}
                                                        className={`
                                                            px-5 py-3.5 flex items-center justify-between gap-4
                                                            ${idx !== permissions.length - 1 ? "border-b border-gray-50 dark:border-gray-800/60" : ""}
                                                            ${isChanged ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}
                                                        `}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                                    {perm.label}
                                                                </span>
                                                                {isChanged && (
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider">
                                                                        Modified
                                                                    </span>
                                                                )}
                                                                {!isDefault && !isChanged && (
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-wider">
                                                                        Custom
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                                                {perm.description}
                                                            </p>
                                                            {perm.warning && isEnabled && (
                                                                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                                                    <ShieldAlert size={10} />
                                                                    {perm.warning}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <PermissionToggle
                                                            enabled={isEnabled}
                                                            onChange={(val) => togglePermission(selectedRole, perm.key, val)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* ══ ADMIN ROLE INFO ══ */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/40 dark:to-gray-800/20 rounded-3xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white">
                        <Shield size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">Platform Admin</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Non-Configurable</p>
                    </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    The <strong>Admin</strong> role always has full unrestricted access to every feature and cannot be 
                    limited through this panel. This is a safety measure to ensure at least one role always has complete 
                    control over the platform.
                </p>
            </div>
        </div>
    );
}
