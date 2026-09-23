import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "./firebase";
import type { ProfileLockSettings, UserProfile } from "@/contexts/AuthContext";

export const DEFAULT_LOCK_SETTINGS: ProfileLockSettings = {
    isLocked: false,
    avatarGuard: true,
    hideContactInfo: true,
    hideActivityFeed: true,
    hideCredentials: false,     // keep certificates/credentials visible for portfolio networking
    hideFollowersList: true,
    allowCollegePeers: true,     // friendly peer networking across same institution
    lockForEveryone: false,      // when true, lock rules apply even to followers
};

export const LOCK_PRESETS = {
    facebookStrict: {
        id: "facebookStrict",
        name: "Full Lockdown (Facebook Style)",
        description: "Maximum protection: locks full photos, contact numbers, posts & stories, credentials, and follower lists to followers only.",
        settings: {
            isLocked: true,
            avatarGuard: true,
            hideContactInfo: true,
            hideActivityFeed: true,
            hideCredentials: true,
            hideFollowersList: true,
            allowCollegePeers: false,
            lockForEveryone: false,
        } as ProfileLockSettings
    },
    academicResume: {
        id: "academicResume",
        name: "Academic Resume Mode",
        description: "Keeps your educational credentials, certificates, and badges visible, but locks private contact details, photos, and social posts.",
        settings: {
            isLocked: true,
            avatarGuard: true,
            hideContactInfo: true,
            hideActivityFeed: true,
            hideCredentials: false,
            hideFollowersList: true,
            allowCollegePeers: true,
            lockForEveryone: false,
        } as ProfileLockSettings
    },
    custom: {
        id: "custom",
        name: "Custom Shield",
        description: "Selectively customize every single element you want to lock or show.",
    }
};

export interface ProfilePermissions {
    isOwner: boolean;
    isMasterLocked: boolean;
    isLockedForEveryone: boolean;
    canViewFullPhotos: boolean;
    canViewContact: boolean;
    canViewFeed: boolean;
    canViewCredentials: boolean;
    canViewAcademicDetails?: boolean;
    canViewFollowersList: boolean;
    showLockedShieldBanner: boolean;
    hasAvatarGuardBadge: boolean;
    isPeerAllowed: boolean;
}

/**
 * Calculates viewer permissions based on the target user's lock settings
 * and relationship to the viewer (owner, follower, same-college peer, stranger).
 */
export function getProfilePermissions(
    profile: UserProfile | null,
    viewerUid?: string | null,
    isFollower: boolean = false,
    viewerCollegeId?: string | null,
    isSimulatingGuest: boolean = false
): ProfilePermissions {
    if (!profile) {
        return {
            isOwner: false,
            isMasterLocked: false,
            isLockedForEveryone: false,
            canViewFullPhotos: true,
            canViewContact: true,
            canViewFeed: true,
            canViewCredentials: true,
            canViewAcademicDetails: true,
            canViewFollowersList: true,
            showLockedShieldBanner: false,
            hasAvatarGuardBadge: false,
            isPeerAllowed: false,
        };
    }

    const isActualOwner = Boolean(viewerUid && viewerUid === profile.uid);
    const isOwner = isActualOwner && !isSimulatingGuest;
    const settings = profile.lockSettings;
    const isMasterLocked = Boolean(settings?.isLocked);

    // If viewer is the active owner (and not in guest preview), they can see everything.
    if (isOwner) {
        return {
            isOwner: true,
            isMasterLocked,
            isLockedForEveryone: Boolean(settings?.lockForEveryone),
            canViewFullPhotos: true,
            canViewContact: true,
            canViewFeed: true,
            canViewCredentials: true,
            canViewAcademicDetails: true,
            canViewFollowersList: true,
            showLockedShieldBanner: false,
            hasAvatarGuardBadge: Boolean(settings?.isLocked && settings?.avatarGuard),
            isPeerAllowed: false,
        };
    }

    // If profile is NOT locked at all, everything is public.
    if (!isMasterLocked || !settings) {
        return {
            isOwner: false,
            isMasterLocked: false,
            isLockedForEveryone: false,
            canViewFullPhotos: true,
            canViewContact: true,
            canViewFeed: true,
            canViewCredentials: true,
            canViewAcademicDetails: true,
            canViewFollowersList: true,
            showLockedShieldBanner: false,
            hasAvatarGuardBadge: false,
            isPeerAllowed: false,
        };
    }

    // Check if the viewer is a verified classmate/colleague from the exact same college.
    const isPeerAllowed = Boolean(
        settings.allowCollegePeers && 
        profile.collegeId && 
        viewerCollegeId && 
        viewerCollegeId === profile.collegeId
    );

    // When lockForEveryone is active, nobody (followers, peers) bypasses the lock rules.
    // Only the profile owner (handled above) can see everything.
    const isEverybodyLocked = Boolean(settings.lockForEveryone);
    const isAuthorized = isEverybodyLocked ? false : (isFollower || isPeerAllowed);
    const isCredentialsLocked = settings.hideCredentials !== undefined 
        ? settings.hideCredentials 
        : Boolean(settings.hideAcademicDetails);

    return {
        isOwner: false,
        isMasterLocked: true,
        isLockedForEveryone: isEverybodyLocked,
        canViewFullPhotos: isAuthorized || !settings.avatarGuard,
        canViewContact: isAuthorized || !settings.hideContactInfo,
        canViewFeed: isAuthorized || !settings.hideActivityFeed,
        canViewCredentials: isAuthorized || !isCredentialsLocked,
        canViewAcademicDetails: true,
        canViewFollowersList: isAuthorized || !settings.hideFollowersList,
        showLockedShieldBanner: true,
        hasAvatarGuardBadge: Boolean(settings.avatarGuard),
        isPeerAllowed,
    };
}

/**
 * Persists profile lock settings to Firestore.
 */
export async function updateProfileLockSettings(
    uid: string,
    newSettings: Partial<ProfileLockSettings>
): Promise<void> {
    if (!uid) throw new Error("Missing user ID");
    const db = getDb();
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        lockSettings: {
            ...newSettings,
            lockedAt: serverTimestamp(),
        }
    });
}
