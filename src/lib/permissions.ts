import { UserProfile } from "@/contexts/AuthContext";
import { FirestoreNotice, FirestorePost, FirestoreStory, FirestoreClub, FirestoreStudyPost } from "./firestore";
import { hasPermission } from "./rolePermissions";

export type ActionPermission = {
    canEdit: boolean;
    canDelete: boolean;
    canApprove?: boolean;
    canReject?: boolean;
    canPin?: boolean;
    canToggleUrgent?: boolean;
    needsReview?: boolean;
};

/**
 * Check if a user can edit a college profile.
 * - Admins can edit any college directly.
 * - Super Managers can edit any college directly.
 * - Managers / Teachers can edit their own college if permitted by role permissions.
 */
export function canEditCollege(profile: UserProfile | null, targetCollegeId: string): { allowed: boolean; needsReview: boolean } {
    if (!profile) return { allowed: false, needsReview: false };

    if (!hasPermission(profile.role, "canEditCollegeProfile")) {
        return { allowed: false, needsReview: false };
    }

    if (profile.role === "admin" || profile.role === "super_manager") {
        return { allowed: true, needsReview: false };
    }

    if (profile.collegeId === targetCollegeId) {
        return { allowed: true, needsReview: false };
    }

    return { allowed: false, needsReview: false };
}

/**
 * Check permissions for a Post (News Feed).
 * - Authors can edit/delete their own posts.
 * - Users with moderation permissions can delete/approve/reject based on dynamic role permissions and college scope.
 */
export function canEditPost(profile: UserProfile | null, post: FirestorePost): ActionPermission {
    if (!profile) return { canEdit: false, canDelete: false, canApprove: false, canReject: false };

    const isAuthor = profile.uid === post.creatorId;
    const isPlatformAdmin = profile.role === "admin";
    const isGlobal = profile.role === "admin" || profile.role === "super_manager";
    const isSameCollege = profile.collegeId === post.collegeId;
    const hasScope = isGlobal || isSameCollege;

    const canApprove = hasPermission(profile.role, "canApprovePosts") && hasScope && post.status === "pending";
    const canDeleteOthers = hasPermission(profile.role, "canDeleteOthersContent") && hasScope;
    const canEdit = isAuthor || isPlatformAdmin;

    return {
        canEdit,
        canDelete: isAuthor || canDeleteOthers,
        canApprove,
        canReject: canApprove,
    };
}

/**
 * Check permissions for a Story.
 * - Authors can edit/delete their own stories.
 * - Users with moderation permissions can delete/approve/reject stories.
 */
export function canEditStory(profile: UserProfile | null, story: FirestoreStory): ActionPermission {
    if (!profile) return { canEdit: false, canDelete: false, canApprove: false, canReject: false };

    const isAuthor = profile.uid === story.authorId;
    const isGlobal = profile.role === "admin" || profile.role === "super_manager";
    const isSameCollege = profile.collegeId === story.collegeId;
    const hasScope = isGlobal || isSameCollege;

    const canApprove = hasPermission(profile.role, "canApproveStories") && hasScope && story.status === "pending";
    const canDeleteOthers = hasPermission(profile.role, "canDeleteOthersContent") && hasScope;

    return {
        canEdit: isAuthor,
        canDelete: isAuthor || canDeleteOthers,
        canApprove,
        canReject: canApprove,
    };
}

/**
 * Check permissions for a Study Post.
 * - Authors can edit/delete their own posts.
 * - Users with moderation permissions can delete/approve/reject study posts.
 */
export function canEditStudyPost(profile: UserProfile | null, post: FirestoreStudyPost): ActionPermission {
    if (!profile) return { canEdit: false, canDelete: false, canApprove: false, canReject: false };

    const isAuthor = profile.uid === post.authorId;
    const isGlobal = profile.role === "admin" || profile.role === "super_manager";
    const isSameCollege = profile.collegeId === post.collegeId;
    const hasScope = isGlobal || isSameCollege;

    const canApprove = hasPermission(profile.role, "canApproveStudyPosts") && hasScope && post.status === "pending";
    const canDeleteOthers = hasPermission(profile.role, "canDeleteOthersContent") && hasScope;

    return {
        canEdit: isAuthor,
        canDelete: isAuthor || canDeleteOthers,
        canApprove,
        canReject: canApprove,
    };
}

/**
 * Check permissions for a Notice.
 * - Authors can edit/delete their own notices.
 * - Pinning, urgent toggle, approving, and deleting are controlled by dynamic role permissions.
 */
export function canEditNotice(profile: UserProfile | null, notice: FirestoreNotice): ActionPermission {
    if (!profile) return { canEdit: false, canDelete: false, canPin: false, canToggleUrgent: false, canApprove: false, canReject: false };

    const isAuthor = profile.uid === notice.authorId;
    const isGlobal = profile.role === "admin" || profile.role === "super_manager";
    const isSameCollege = profile.collegeId === notice.collegeId;
    const hasScope = isGlobal || isSameCollege;

    const canPin = hasPermission(profile.role, "canPinNotices") && hasScope;
    const canToggleUrgent = hasPermission(profile.role, "canMarkUrgentNotices") && hasScope;
    const canApprove = hasPermission(profile.role, "canApproveNotices") && hasScope && notice.status === "pending";
    const canDeleteOthers = hasPermission(profile.role, "canDeleteOthersContent") && hasScope;

    return {
        canEdit: isAuthor,
        canDelete: isAuthor || canDeleteOthers,
        canPin,
        canToggleUrgent,
        canApprove,
        canReject: canApprove,
    };
}

/**
 * Check permissions for a Club.
 * - Controlled by dynamic canManageClubs permission and scope, or Club President.
 */
export async function canManageClub_Local(profile: UserProfile | null, club: FirestoreClub): Promise<ActionPermission> {
    if (!profile) return { canEdit: false, canDelete: false, canApprove: false, canReject: false };

    const isGlobal = profile.role === "admin" || profile.role === "super_manager";
    const isSameCollege = profile.collegeId === club.collegeId;
    const hasScope = isGlobal || isSameCollege;
    const hasClubPermission = hasPermission(profile.role, "canManageClubs") && hasScope;

    const isClubPresident = profile.clubPosition === "President" && isSameCollege;
    const isModerator = hasClubPermission || isClubPresident;

    return {
        canEdit: isModerator,
        canDelete: hasClubPermission,
        canApprove: isModerator,
        canReject: isModerator,
    };
}

/**
 * Check if a user can post a notice.
 * All authenticated users can now post a notice, but students will be 'pending'.
 */
export function canPostNotice(profile: UserProfile | null): boolean {
    return !!profile;
}

/**
 * Check if a user can delete a gallery photo.
 * - Uploader can delete their own photo.
 * - Roles with canDeleteGalleryPhotos can delete within their scope.
 */
export function canDeleteGalleryPhoto(
    profile: UserProfile | null, 
    photo: { uploadedBy: string; uploaderUid?: string }, 
    targetCollegeId: string
): boolean {
    if (!profile) return false;

    // 1. Uploader can always delete their own photo
    if (photo.uploaderUid && profile.uid === photo.uploaderUid) return true;

    // 2. Check dynamic permission
    const isGlobal = profile.role === "admin" || profile.role === "super_manager";
    const isSameCollege = profile.collegeId === targetCollegeId;
    const hasScope = isGlobal || isSameCollege;

    return hasPermission(profile.role, "canDeleteGalleryPhotos") && hasScope;
}

/**
 * Check if a post, story, notice, or study material is restricted for a specific viewer.
 * - Public content: accessible to everyone.
 * - Campus / College Only content: allowed ONLY if viewer is logged in and belongs to the same college (or is author/admin).
 * - Private content: allowed ONLY if viewer is the author or admin.
 */
export function isContentRestrictedForUser(
    item: { visibility?: string; privacy?: string; collegeId?: string; creatorId?: string; authorId?: string; userId?: string },
    profile: UserProfile | null,
    userUid?: string | null
): boolean {
    if (!item) return false;
    const vis = item.visibility || item.privacy;
    if (!vis || vis === "public") return false;

    const uid = userUid || profile?.uid;
    const authorId = item.creatorId || item.authorId || item.userId;
    const isAuthor = !!(uid && authorId && uid === authorId);
    const isAdmin = profile?.role === "admin" || profile?.role === "super_manager";

    if (isAuthor || isAdmin) return false;

    if (vis === "private") return true;

    if (vis === "campus" || vis === "college_only") {
        if (!uid || !profile?.collegeId) return true; // Logged-out visitor -> restricted!
        if (item.collegeId && profile.collegeId !== item.collegeId) return true; // Different college -> restricted!
        return false;
    }

    return false;
}
