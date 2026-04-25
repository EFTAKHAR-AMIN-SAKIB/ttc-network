import { UserProfile } from "@/contexts/AuthContext";
import { FirestoreNotice, FirestorePost, FirestoreStory, FirestoreClub, FirestoreStudyPost } from "./firestore";

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
 * - Managers can edit their own college directly.
 * - Teachers/Students cannot edit.
 */
export function canEditCollege(profile: UserProfile | null, targetCollegeId: string): { allowed: boolean; needsReview: boolean } {
    if (!profile) return { allowed: false, needsReview: false };

    if (profile.role === "admin" || profile.role === "super_manager") {
        return { allowed: true, needsReview: false };
    }

    if (profile.role === "manager" && profile.collegeId === targetCollegeId) {
        return { allowed: true, needsReview: false };
    }

    return { allowed: false, needsReview: false };
}

/**
 * Check permissions for a Post (News Feed).
 * - Authors can edit/delete their own posts.
 * - Admins can delete/approve/reject any post.
 * - Managers can delete/approve/reject posts for their own college.
 */
export function canEditPost(profile: UserProfile | null, post: FirestorePost): ActionPermission {
    if (!profile) return { canEdit: false, canDelete: false, canApprove: false, canReject: false };

    const isAuthor = profile.uid === post.creatorId;
    const isAdmin = profile.role === "admin" || profile.role === "super_manager";
    const isManagerSameCollege = profile.role === "manager" && profile.collegeId === post.collegeId;
    const isModerator = isAdmin || isManagerSameCollege;

    return {
        canEdit: isAuthor,
        canDelete: isAuthor || isModerator,
        canApprove: isModerator && post.status === "pending",
        canReject: isModerator && post.status === "pending",
    };
}

/**
 * Check permissions for a Story.
 * - Authors can edit/delete their own stories.
 * - Admins can delete/approve/reject any story.
 * - Managers can delete/approve/reject stories for their own college.
 */
export function canEditStory(profile: UserProfile | null, story: FirestoreStory): ActionPermission {
    if (!profile) return { canEdit: false, canDelete: false, canApprove: false, canReject: false };

    const isAuthor = profile.uid === story.authorId;
    const isAdmin = profile.role === "admin" || profile.role === "super_manager";
    const isManagerSameCollege = profile.role === "manager" && profile.collegeId === story.collegeId;
    const isModerator = isAdmin || isManagerSameCollege;

    return {
        canEdit: isAuthor,
        canDelete: isAuthor || isModerator,
        canApprove: isModerator && story.status === "pending",
        canReject: isModerator && story.status === "pending",
    };
}

/**
 * Check permissions for a Study Post.
 * - Authors can edit/delete their own posts.
 * - Admins can delete/approve/reject any post.
 * - Managers can delete/approve/reject posts for their own college.
 */
export function canEditStudyPost(profile: UserProfile | null, post: FirestoreStudyPost): ActionPermission {
    if (!profile) return { canEdit: false, canDelete: false, canApprove: false, canReject: false };

    const isAuthor = profile.uid === post.authorId;
    const isAdmin = profile.role === "admin" || profile.role === "super_manager";
    const isManagerSameCollege = profile.role === "manager" && profile.collegeId === post.collegeId;
    const isModerator = isAdmin || isManagerSameCollege;

    return {
        canEdit: isAuthor,
        canDelete: isAuthor || isModerator,
        canApprove: isModerator && post.status === "pending",
        canReject: isModerator && post.status === "pending",
    };
}

/**
 * Check permissions for a Notice.
 * - Authors can edit/delete their own notices.
 * - Admins can pin/urgent/delete any notice.
 * - Managers can pin/urgent/delete notices for their own college.
 * - Teachers/Managers can approve/reject notices for their own college. Admins can approve any.
 */
export function canEditNotice(profile: UserProfile | null, notice: FirestoreNotice): ActionPermission {
    if (!profile) return { canEdit: false, canDelete: false, canPin: false, canToggleUrgent: false, canApprove: false, canReject: false };

    const isAuthor = profile.uid === notice.authorId;
    const isAdmin = profile.role === "admin" || profile.role === "super_manager";
    const isTeacherSameCollege = profile.role === "teacher" && profile.collegeId === notice.collegeId;
    const isManagerSameCollege = profile.role === "manager" && profile.collegeId === notice.collegeId;
    const isModerator = isAdmin || isManagerSameCollege;
    const canApproveRights = isAdmin || isManagerSameCollege || isTeacherSameCollege;

    return {
        canEdit: isAuthor,
        canDelete: isAuthor || isModerator,
        canPin: isModerator,
        canToggleUrgent: isModerator,
        canApprove: canApproveRights && notice.status === "pending",
        canReject: canApproveRights && notice.status === "pending",
    };
}

/**
 * Check permissions for a Club.
 * - Super Admins can manage all clubs.
 * - College Managers can manage clubs within their college.
 * - Club Presidents can manage their own club.
 */
export async function canManageClub_Local(profile: UserProfile | null, club: FirestoreClub): Promise<ActionPermission> {
    if (!profile) return { canEdit: false, canDelete: false, canApprove: false, canReject: false };

    const isAdmin = profile.role === "admin" || profile.role === "super_manager";
    const isManagerSameCollege = profile.role === "manager" && profile.collegeId === club.collegeId;
    
    // For Club President, we need to check if they are the president of THIS specific club.
    // This profile check is usually done in the firestore layer with canManageClub(clubId), 
    // but we add a hook here for UI visibility.
    const isClubPresident = profile.clubPosition === "President" && profile.collegeId === club.collegeId;

    const isModerator = isAdmin || isManagerSameCollege || isClubPresident;

    return {
        canEdit: isModerator,
        canDelete: isAdmin || isManagerSameCollege, // Only admins/managers can delete clubs entirely
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
 * - Admins can delete any photo.
 * - Managers can delete photos in their own college.
 * - The Uploader can delete their own photo.
 */
export function canDeleteGalleryPhoto(
    profile: UserProfile | null, 
    photo: { uploadedBy: string; uploaderUid?: string }, 
    targetCollegeId: string
): boolean {
    if (!profile) return false;

    // 1. Admins/Super Managers can delete anything
    if (profile.role === "admin" || profile.role === "super_manager") return true;

    // 2. Managers can delete any photo in their college
    if (profile.role === "manager" && profile.collegeId === targetCollegeId) return true;

    // 3. Uploader can delete their own photo
    if (photo.uploaderUid && profile.uid === photo.uploaderUid) return true;

    return false;
}
