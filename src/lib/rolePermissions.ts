/**
 * Dynamic Role Permissions System
 * ================================
 * Allows the platform admin to configure what each role can and cannot do
 * from the Admin Panel. Changes are stored in Firestore and propagated
 * in real-time to all connected clients via onSnapshot.
 *
 * Architecture:
 * - Firestore document: settings/rolePermissions
 * - Module-level cache: updated by RolePermissionsContext, read by permission helpers
 * - Defaults: hardcoded fallback matching the original behavior
 */

// ═══════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════

export type ConfigurableRole = "student" | "teacher" | "manager" | "super_manager";

/** Every individual permission that can be toggled per role */
export type PermissionKey =
    // Content Creation
    | "canCreatePosts"
    | "canCreateStories"
    | "canCreateNotices"
    | "canCreateStudyPosts"
    | "canCreateGroups"
    // Auto-Approval (content bypasses moderation queue)
    | "postsAutoApproved"
    | "noticesAutoApproved"
    | "studyPostsAutoApproved"
    // Content Moderation
    | "canApprovePosts"
    | "canApproveStories"
    | "canApproveNotices"
    | "canApproveStudyPosts"
    | "canEditOthersPosts"
    | "canDeleteOthersContent"
    | "canPinNotices"
    | "canMarkUrgentNotices"
    // College & Club Management
    | "canEditCollegeProfile"
    | "canManageClubs"
    | "canDeleteGalleryPhotos"
    // User Management
    | "canAccessAdminPanel"
    | "canModerateUsers"
    | "canAssignRoles"
    | "canVerifyUsers"
    | "canDeleteUsers"
    // Platform
    | "canManageSiteSettings"
    | "canReviewCampusManagers";

/** A single permission definition for UI rendering */
export interface PermissionDefinition {
    key: PermissionKey;
    label: string;
    description: string;
    category: PermissionCategory;
    /** If true, this permission cannot be changed (enforced by the system) */
    locked?: boolean;
    /** Warning message shown when toggling */
    warning?: string;
}

export type PermissionCategory =
    | "Content Creation"
    | "Auto-Approval"
    | "Content Moderation"
    | "College & Club Management"
    | "User Management"
    | "Platform";

/** Map of permission key -> boolean for a single role */
export type RolePermissionFlags = Record<PermissionKey, boolean>;

/** Full permissions config: role -> flags */
export type RolePermissionsConfig = Record<ConfigurableRole, RolePermissionFlags>;

// ═══════════════════════════════════════════════════
//  PERMISSION DEFINITIONS (for UI rendering)
// ═══════════════════════════════════════════════════

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
    // ─── Content Creation ───
    { key: "canCreatePosts", label: "Create Posts", description: "Can create news feed posts (requires verification)", category: "Content Creation" },
    { key: "canCreateStories", label: "Create Stories", description: "Can write and publish stories", category: "Content Creation" },
    { key: "canCreateNotices", label: "Create Notices", description: "Can create campus notice board posts", category: "Content Creation" },
    { key: "canCreateStudyPosts", label: "Create Study Posts", description: "Can upload study materials, notes, and schedules", category: "Content Creation" },
    { key: "canCreateGroups", label: "Create Groups", description: "Can create study & discussion groups", category: "Content Creation" },

    // ─── Auto-Approval ───
    { key: "postsAutoApproved", label: "Posts Auto-Approved", description: "Posts bypass the moderation queue and go live immediately", category: "Auto-Approval", warning: "Enabling this means posts from this role will NOT be reviewed before publishing" },
    { key: "noticesAutoApproved", label: "Notices Auto-Approved", description: "Notices publish instantly without admin review", category: "Auto-Approval" },
    { key: "studyPostsAutoApproved", label: "Study Auto-Approved", description: "Study materials publish instantly without review", category: "Auto-Approval" },

    // ─── Content Moderation ───
    { key: "canApprovePosts", label: "Approve / Reject Posts", description: "Can approve or reject pending posts in the moderation queue", category: "Content Moderation" },
    { key: "canApproveStories", label: "Approve / Reject Stories", description: "Can approve or reject pending stories", category: "Content Moderation" },
    { key: "canApproveNotices", label: "Approve / Reject Notices", description: "Can approve or reject pending notices", category: "Content Moderation" },
    { key: "canApproveStudyPosts", label: "Approve / Reject Study", description: "Can approve or reject pending study materials", category: "Content Moderation" },
    { key: "canEditOthersPosts", label: "Edit Others' Posts", description: "Can edit posts created by other users (strictly Admin only by design)", category: "Content Moderation", warning: "Platform rule: only the author or Admin can edit posts" },
    { key: "canDeleteOthersContent", label: "Delete Others' Content", description: "Can delete posts, stories, notices, and study posts created by other users", category: "Content Moderation", warning: "This is a powerful moderation capability" },
    { key: "canPinNotices", label: "Pin Notices", description: "Can pin notices to the top of the board", category: "Content Moderation" },
    { key: "canMarkUrgentNotices", label: "Mark Urgent", description: "Can flag notices as urgent for priority display", category: "Content Moderation" },

    // ─── College & Club Management ───
    { key: "canEditCollegeProfile", label: "Edit College Profile", description: "Can edit college name, stats, faculty, and gallery", category: "College & Club Management" },
    { key: "canManageClubs", label: "Manage Clubs", description: "Can create, edit, and disband clubs", category: "College & Club Management" },
    { key: "canDeleteGalleryPhotos", label: "Delete Gallery Photos", description: "Can delete any photo from the college gallery", category: "College & Club Management" },

    // ─── User Management ───
    { key: "canAccessAdminPanel", label: "Admin Panel Access", description: "Can access the /admin dashboard", category: "User Management" },
    { key: "canModerateUsers", label: "Moderate Users", description: "Can ban, shadow-ban, and restrict users", category: "User Management", warning: "Grants power to ban community members" },
    { key: "canAssignRoles", label: "Assign Roles", description: "Can change user roles (within allowed levels)", category: "User Management" },
    { key: "canVerifyUsers", label: "Verify Users", description: "Can toggle role verification status", category: "User Management" },
    { key: "canDeleteUsers", label: "Delete Users", description: "Can permanently delete user accounts", category: "User Management", warning: "Irreversible — deletes user from Firebase Auth and all data" },

    // ─── Platform ───
    { key: "canManageSiteSettings", label: "Site Settings", description: "Can modify branding, privacy rules, and platform configuration", category: "Platform" },
    { key: "canReviewCampusManagers", label: "Review Campus Managers", description: "Can review and approve Campus Manager applications", category: "Platform" },
];

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
    "Content Creation",
    "Auto-Approval",
    "Content Moderation",
    "College & Club Management",
    "User Management",
    "Platform",
];

// ═══════════════════════════════════════════════════
//  DEFAULT PERMISSIONS (matches original hardcoded behavior)
// ═══════════════════════════════════════════════════

const STUDENT_DEFAULTS: RolePermissionFlags = {
    canCreatePosts: true,
    canCreateStories: true,
    canCreateNotices: true,
    canCreateStudyPosts: true,
    canCreateGroups: true,
    postsAutoApproved: false,
    noticesAutoApproved: false,
    studyPostsAutoApproved: false,
    canApprovePosts: false,
    canApproveStories: false,
    canApproveNotices: false,
    canApproveStudyPosts: false,
    canEditOthersPosts: false,
    canDeleteOthersContent: false,
    canPinNotices: false,
    canMarkUrgentNotices: false,
    canEditCollegeProfile: false,
    canManageClubs: false,
    canDeleteGalleryPhotos: false,
    canAccessAdminPanel: false,
    canModerateUsers: false,
    canAssignRoles: false,
    canVerifyUsers: false,
    canDeleteUsers: false,
    canManageSiteSettings: false,
    canReviewCampusManagers: false,
};

const TEACHER_DEFAULTS: RolePermissionFlags = {
    canCreatePosts: true,
    canCreateStories: true,
    canCreateNotices: true,
    canCreateStudyPosts: true,
    canCreateGroups: true,
    postsAutoApproved: false,
    noticesAutoApproved: true,
    studyPostsAutoApproved: true,
    canApprovePosts: false,
    canApproveStories: false,
    canApproveNotices: true,
    canApproveStudyPosts: false,
    canEditOthersPosts: false,
    canDeleteOthersContent: false,
    canPinNotices: false,
    canMarkUrgentNotices: false,
    canEditCollegeProfile: true,
    canManageClubs: false,
    canDeleteGalleryPhotos: false,
    canAccessAdminPanel: false,
    canModerateUsers: false,
    canAssignRoles: false,
    canVerifyUsers: false,
    canDeleteUsers: false,
    canManageSiteSettings: false,
    canReviewCampusManagers: false,
};

const MANAGER_DEFAULTS: RolePermissionFlags = {
    canCreatePosts: true,
    canCreateStories: true,
    canCreateNotices: true,
    canCreateStudyPosts: true,
    canCreateGroups: true,
    postsAutoApproved: true,
    noticesAutoApproved: true,
    studyPostsAutoApproved: true,
    canApprovePosts: true,
    canApproveStories: true,
    canApproveNotices: true,
    canApproveStudyPosts: true,
    canEditOthersPosts: false,
    canDeleteOthersContent: true,
    canPinNotices: true,
    canMarkUrgentNotices: true,
    canEditCollegeProfile: true,
    canManageClubs: true,
    canDeleteGalleryPhotos: true,
    canAccessAdminPanel: true,
    canModerateUsers: true,
    canAssignRoles: true,
    canVerifyUsers: true,
    canDeleteUsers: false,
    canManageSiteSettings: false,
    canReviewCampusManagers: false,
};

const SUPER_MANAGER_DEFAULTS: RolePermissionFlags = {
    canCreatePosts: true,
    canCreateStories: true,
    canCreateNotices: true,
    canCreateStudyPosts: true,
    canCreateGroups: true,
    postsAutoApproved: true,
    noticesAutoApproved: true,
    studyPostsAutoApproved: true,
    canApprovePosts: true,
    canApproveStories: true,
    canApproveNotices: true,
    canApproveStudyPosts: true,
    canEditOthersPosts: false,
    canDeleteOthersContent: true,
    canPinNotices: true,
    canMarkUrgentNotices: true,
    canEditCollegeProfile: true,
    canManageClubs: true,
    canDeleteGalleryPhotos: true,
    canAccessAdminPanel: true,
    canModerateUsers: true,
    canAssignRoles: true,
    canVerifyUsers: true,
    canDeleteUsers: false,
    canManageSiteSettings: false,
    canReviewCampusManagers: true,
};

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsConfig = {
    student: STUDENT_DEFAULTS,
    teacher: TEACHER_DEFAULTS,
    manager: MANAGER_DEFAULTS,
    super_manager: SUPER_MANAGER_DEFAULTS,
};

// ═══════════════════════════════════════════════════
//  MODULE-LEVEL CACHE (updated by context, read by helpers)
// ═══════════════════════════════════════════════════

let _cachedConfig: RolePermissionsConfig | null = null;

/**
 * Called by RolePermissionsContext when the Firestore document changes.
 * Updates the module-level cache so non-React code can read current permissions.
 */
export function _setCachedConfig(config: RolePermissionsConfig | null): void {
    _cachedConfig = config;
}

/**
 * Check if a specific role has a specific permission.
 *
 * Priority:
 * 1. Admin role → always returns true (admins bypass all permission checks)
 * 2. Dynamic config (from Firestore, cached via context) → if available
 * 3. Hardcoded defaults → fallback
 */
export function hasPermission(
    role: string | undefined,
    key: PermissionKey
): boolean {
    if (!role) return false;

    // Admin always has all permissions — non-configurable
    if (role === "admin") return true;

    const configurableRole = role as ConfigurableRole;

    // Try cached dynamic config first
    if (_cachedConfig && _cachedConfig[configurableRole]) {
        const val = _cachedConfig[configurableRole][key];
        if (typeof val === "boolean") return val;
    }

    // Fall back to hardcoded defaults
    const defaults = DEFAULT_ROLE_PERMISSIONS[configurableRole];
    if (defaults) return defaults[key] ?? false;

    return false;
}

/**
 * Get the full permission flags for a role.
 * Merges dynamic config over defaults.
 */
export function getPermissionsForRole(role: string): RolePermissionFlags {
    if (role === "admin") {
        // Admin has everything enabled
        return Object.fromEntries(
            PERMISSION_DEFINITIONS.map(d => [d.key, true])
        ) as RolePermissionFlags;
    }

    const configurableRole = role as ConfigurableRole;
    const defaults = DEFAULT_ROLE_PERMISSIONS[configurableRole] || STUDENT_DEFAULTS;

    if (_cachedConfig && _cachedConfig[configurableRole]) {
        // Merge: dynamic overrides take precedence over defaults
        return { ...defaults, ..._cachedConfig[configurableRole] };
    }

    return { ...defaults };
}

/**
 * Get the full current config (dynamic + defaults merged).
 * Used by the admin UI to display current state.
 */
export function getCurrentConfig(): RolePermissionsConfig {
    const roles: ConfigurableRole[] = ["student", "teacher", "manager", "super_manager"];
    const result = {} as RolePermissionsConfig;

    for (const role of roles) {
        const defaults = DEFAULT_ROLE_PERMISSIONS[role];
        const dynamic = _cachedConfig?.[role];
        result[role] = dynamic ? { ...defaults, ...dynamic } : { ...defaults };
    }

    return result;
}
