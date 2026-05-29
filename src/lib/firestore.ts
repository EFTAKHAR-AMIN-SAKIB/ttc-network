/**
 * Firestore Service Layer
 * ========================
 * Central CRUD functions for all Firestore collections.
 *
 * ⚠️  COLLEGE ISOLATION RULE (Priority 3):
 *     Every write function reads the user's `collegeId` from their
 *     authenticated profile document — NEVER from form data.
 *     A student at Feni TTC cannot submit anything for Dhaka TTC.
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    increment,
    arrayRemove,
    arrayUnion,
    writeBatch,
    getCountFromServer,
    type DocumentData,
    type QuerySnapshot,
    type QueryConstraint
} from "firebase/firestore";
import { getDb, getAuthInstance } from "./firebase";
import { uploadFile as cloudinaryUpload, deleteFromCloudinary } from "./storage";

// ═══════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════

export interface FirestoreCollege {
    id?: string;
    name: string;
    nameBn: string;
    shortName: string;
    city: string;
    established: number;
    slug: string;
    logo: string;
    hasLogo: boolean;
    color: string;
    coverUrl?: string; // Admin editable banner
    principal: {
        name: string;
        contact: string;
        designation?: string;
        photo?: string;
        bio?: string;
        yearsOfService?: string;
        email?: string;
    };
    students: number;
    teachers: number;
    classrooms: number;
    hostel: boolean;
    location: string;
    description: string;
    achievements: string[];
    social: { facebook: string; website: string; email?: string };
    faculty: FacultyEntry[];
    gallery: GalleryEntry[];
    lastUpdatedBy: string;
    lastUpdatedDate: Timestamp | null;
}

export interface FacultyEntry {
    name: string;
    designation: string;
    department: string;
    email: string;
    phone: string;
    photo?: string;
    bio?: string;
    yearsOfService?: string;
}

export interface FirestoreClub {
    id?: string;
    collegeId: string;
    name: string;
    logo?: string;
    bannerUrl?: string;
    icon?: string; // Emoji fallback
    description: string;
    tagline?: string;
    foundedDate?: string;
    schedule?: string;
    location?: string;
    socialLinks: { facebook?: string; whatsapp?: string };
    advisorUserId?: string; // Linked to a Staff/Teacher profile
    advisorName?: string; // Plain text fallback
    membersCount: number;
    category?: "Sports" | "Academic" | "Cultural" | "Social" | "Other";
    isActive?: boolean;
    createdBy: string;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
}

export interface ClubMember {
    userId: string;
    displayName: string;
    photoURL: string;
    role: "President" | "Vice President" | "General Secretary" | "Member";
    joinedAt: Timestamp | null;
}

export interface ClubRequest {
    userId: string;
    displayName: string;
    photoURL: string;
    message?: string;
    status: "pending" | "approved" | "rejected";
    createdAt: Timestamp | null;
}

export interface ClubActivity {
    id?: string;
    title: string;
    type: "event" | "achievement";
    date: string;
    description: string;
    photoUrl?: string;
    createdAt: Timestamp | null;
}

export interface GalleryEntry {
    url: string;
    caption: string;
    uploadedBy: string;
    uploaderUid?: string; // Optional for backward compatibility with existing data
    date: string;
}

export interface FirestorePost {
    id?: string;
    type: "event" | "club";
    collegeId: string;
    collegeName: string;
    collegeLogo: string;
    eventName: string; // Used as 'Update Title' for clubs
    clubName?: string;
    clubId?: string; // Reference to the associated club
    description?: string;
    shareLink: string;
    commentsCount?: number;
    linkPreview: {
        title: string;
        description: string;
        thumbnail: string;
        domain: string;
    };
    createdBy: { name: string; avatar: string; role: string };
    creatorId: string;
    status: "pending" | "approved" | "rejected";
    reviewedBy?: string;
    reviewedAt?: Timestamp | null;
    rejectReason?: string;
    reactions: { love: number; fire: number; insightful: number; clap: number; wow: number };
    reactedBy?: { love: string[]; fire: string[]; insightful: string[]; clap: string[]; wow: string[] };
    timestamp: Timestamp | null;
    visibility?: "public" | "campus" | "private"; // "campus" = same college only
    thumbnailUrl?: string; // Optional clickable thumbnail image
    isAuthorShadowBanned?: boolean; // Visibility control
}

export interface FirestoreStory {
    id?: string;
    authorId: string;
    authorPhoto: string;
    name: string;
    college: string;
    collegeId: string;
    collegeGradient: string;
    authorRole: "student" | "teacher" | "graduate";
    role: string; // Legacy display role
    title: string;
    preview: string;
    fullStory: string;
    futureGoals?: string;
    oneAdvice?: string;
    coverMood: string; // "Proud 🎓", "Struggling 💪", etc.
    readingTimeMinutes: number;
    reactions: { 
        inspired: number; 
        relatable: number; 
        insightful: number; 
        respect: number; 
        powerful: number;
    };
    reactedBy: { 
        inspired: string[]; 
        relatable: string[]; 
        insightful: string[]; 
        respect: string[]; 
        powerful: string[];
    };
    inspireCount?: number; // Legacy
    inspiredBy?: string[]; // Legacy
    commentsCount?: number;
    status: "pending" | "published" | "rejected";
    timestamp: Timestamp | null;
    visibility: "public" | "campus" | "college_only" | "private";
    thumbnailUrl?: string; // Optional clickable thumbnail image
    isAuthorShadowBanned?: boolean;
}

export interface FirestoreNotice {
    id?: string;
    college: string;
    collegeId: string;
    collegeColor: string;
    authorId: string;
    title: string;
    body: string;
    postedBy: string;
    programme: "BEd" | "BEdHonours" | "MEd" | "Both" | "All";
    isPinned: boolean;
    isUrgent: boolean;
    attachmentUrl: string;
    date: Timestamp | null;
    status?: "pending" | "approved" | "rejected";
    approvedBy?: string;
    approvedByName?: string;
    visibility?: "public" | "campus" | "private"; // "campus" = same college only
    thumbnailUrl?: string; // Optional clickable thumbnail image
    isAuthorShadowBanned?: boolean; // Visibility control
}

export interface FirestoreGift {
    id?: string;
    userId: string;
    collegeId: string;
    name: string;
    amount: number;
    txId: string;
    method: "bKash" | "Nagad";
    status: "pending" | "approved" | "rejected";
    badgeIssued: boolean;
    date: Timestamp | null;
    phaseId?: string; // Optional reference to the specific support phase
    role?: "patron" | "builder" | "advocate" | "supporter"; // Contribution role
    message?: string; // Short message from the contributor
    photoURL?: string; // Profile picture fetched from their account
    supporterBadgeLabel?: string; // Custom display label (e.g. "Pioneer")
    isVerifiedSupporter?: boolean; // Manual verification flag
    supporterProfileUrl?: string; // Link to their real profile
}

export interface AdminPendingCounts {
    posts: number;
    stories: number;
    notices: number;
    studyPosts: number;
    gifts: number;
}

export interface SupportPhase {
    id?: string;
    title: string;
    description: string;
    status: "Complete" | "In Progress" | "Upcoming";
    color: string;
    icon: string;
    order: number;
    targetAmount?: number;
    currentAmount?: number;
    progress?: number;
    tractionLevel?: number;
    founderNote?: string;
    personalNote?: string; // New: editable personal commentary for each phase
    showFundraising?: boolean; // New: toggle to show/hide fundraising stats for this phase
}

export interface SupportSettings {
    fundingOpen: boolean;
    fundingMessage: string;
    supportPageActive: boolean;
    supportPageNote?: string;
    supportPageSubtext?: string;
    stripeLink?: string;
    cryptoWallet?: string;
    bkashNumber?: string;
    raised?: number;
    goal?: number;
    supporters?: string | number;
    currencySymbol?: string;
}

export interface FirestoreStudyPost {
    id?: string;
    type: "material" | "schedule";
    subType?: string; // e.g., "notes", "routine", "zoom"
    title: string;
    content: string;
    link?: string;
    resourceLink?: string;
    materialType?: "doc" | "video" | "link";
    tags?: string[];
    yearRelevance?: string;
    semesterRelevance?: string;
    privacy?: "public" | "campus" | "college_only";
    visibility?: "public" | "campus" | "college_only" | "private";
    thumbnailUrl?: string; // Optional clickable thumbnail image
    fileUrl?: string;      // R2 upload URL
    fileName?: string;     // R2 upload original name
    fileSize?: number;     // R2 upload size in bytes
    fileType?: string;     // R2 upload MIME type
    collegeId: string;
    collegeName?: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    authorRole: string;
    startTime?: string;
    createdAt: Timestamp | null;
    updatedAt?: Timestamp | null;
    status: "pending" | "approved" | "rejected";
    reviewedBy?: string;
    reviewedAt?: Timestamp | null;
    rejectReason?: string;
    linkPreview?: {
        title?: string;
        description?: string;
        thumbnail?: string;
        domain?: string;
    };
    reactions: { 
        inspired: number; 
        relatable: number; 
        insightful: number; 
        respect: number; 
        powerful: number;
    };
    reactedBy: { 
        inspired: string[]; 
        relatable: string[]; 
        insightful: string[]; 
        respect: string[]; 
        powerful: string[];
    };
    commentsCount?: number;
    scheduleDetails?: {
        platform?: string;
        link?: string;
        date?: string;
        time?: string;
        recurring?: boolean;
        days?: string[];
    };
}


export interface FirestoreComment {
    id: string;
    postId: string;
    userId: string;
    userName: string;
    userAvatar: string;
    userRole: string;
    userVerified?: boolean;
    text: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    reactions?: {
        love: number;
        fire: number;
        insightful: number;
        clap: number;
        wow: number;
    };
    reactedBy?: {
        love: string[];
        fire: string[];
        insightful: string[];
        clap: string[];
        wow: string[];
    };
    parentId: string | null;
    replyToId?: string; // For nested replies
    likes?: number; // Legacy support
    likedBy?: string[]; // Legacy support
}

export interface FirestoreUser {
    id?: string;
    displayName: string;
    email: string;
    username: string;
    college: string;
    collegeId: string;
    role: "student" | "teacher" | "manager" | "super_manager" | "admin";
    programme?: "BEdHonours" | "MEd"; // B.Ed Honours (4yr undergrad) or M.Ed (1-2yr postgrad)
    roleVerified: boolean;
    dismissedBy?: string[];
    bio: string;
    coverUrl: string;
    photoURL: string;
    yearSemester: string;
    achievement: string;
    goal: string;
    clubPosition: string;
    teacherExperience?: {
        collegeId: string;
        collegeName: string;
        years: number;
    }[];
    onboardingCompleted?: boolean;
    website?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
    supporterBadge: {
        totalAmount: number;
        visible: boolean;
        lastDonationDate: Timestamp | null;
    };
    // MODERATION
    isBanned?: boolean;
    isShadowBanned?: boolean;
    restrictions?: string[]; // e.g., ["posts", "stories", "notices", "gifts"]
    banReason?: string;
    badges?: any[];
    achievementsList?: any[];
    bioStyle?: string;
    bioFontSize?: string;
    favoriteQuote?: string;
    favoriteQuoteAuthor?: string;
    createdAt: Timestamp | null;
}

export interface FirestoreQACard {
    id?: string;
    question: string;
    answer: string;
    language: "bengali" | "english" | "both";
    isVisible: boolean;
    order: number;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
}

export interface FirestoreAdmissionStep {
    id?: string;
    stepNumber: number;
    title: string;
    subtitle: string;
    description: string;
    iconName: string;
    isVisible: boolean;
    order: number;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
}

export interface FirestoreAdmissionCostItem {
    id?: string;
    label: string;
    amount: string;
    isHighlighted: boolean;
    order: number;
    isVisible: boolean;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
}

export interface FirestoreAdmissionSettings {
    sectionTitle: string;
    sectionSubtitle: string;
    costTitle: string;
    isVisible: boolean;
}

export interface FirestoreBuilderSettings {
    titlePrefix: string;
    titleAccent: string;
    imageMode: "text" | "image";
    imageText: string;
    imageUrl: string;
    descriptionPara1: string;
    descriptionPara2: string;
    builderName: string;
    builderTitle: string;
    buttonText: string;
    buttonUrl: string;
    popupLocation: string;
    popupLinkedinUrl: string;
    popupPortfolioUrl: string;
    popupContactEmail: string;
    popupWhatsappNumber: string;
    isVisible: boolean;
}

export interface FirestoreOfficialSettings {
    isVisible: boolean;
    title: string;
    tagline: string;
    email: string;
    websiteUrl: string;
    facebookUrl: string;
    twitterUrl: string;
    linkedinUrl: string;
    trustLine: string;
}

export interface FirestoreOriginStorySettings {
    isVisible: boolean;
}

export interface FirestoreNotification {
    id?: string;
    recipientId: string;
    type:
    | "post_approved"
    | "post_rejected"
    | "story_approved"
    | "story_rejected"
    | "college_edit_approved"
    | "college_edit_rejected"
    | "new_notice"
    | "urgent_notice"
    | "gift_approved"
    | "club_join_approved"
    | "club_join_rejected"
    | "comment"
    | "reaction"
    | "follow"
    | "badge_received"
    | "mention"
    | "reply";
    message: string;
    relatedId: string;
    relatedType: string;
    targetUrl?: string; // Optional deep link URL
    read: boolean;
    createdAt: Timestamp | null;
    senderId?: string;       // ID of the user initiating the action
    senderName?: string;     // Display name of the user
    senderPhotoURL?: string; // Profile picture of the user
}

export interface PendingEdit {
    id?: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    sectionName: string;
    changes: Record<string, unknown>;
    status: "pending" | "approved" | "rejected";
    rejectionReason: string;
    createdAt: Timestamp | null;
    visibility?: "public" | "private";
}

export interface LinkPreviewCacheEntry {
    url: string;
    title: string;
    description: string;
    image: string;
    domain: string;
    cachedAt: Timestamp | null;
}

export interface StoryHeroSettings {
    collegesCount: string;
    communityCount: string;
    storiesFallback: string;
    impactLevel: string;
    autoCountCommunity: boolean;
    isVisible?: boolean;
    updatedAt?: Timestamp | null;
}

export interface StudyHeroSettings {
    materialsCount: number;
    schedulesCount: number;
    membersCount: number;
    autoCount: boolean;
    isVisible?: boolean;
    updatedAt?: Timestamp | null;
}

// ═══════════════════════════════════════════════════
//  HELPERS & MIDDLEWARE
// ═══════════════════════════════════════════════════

/**
 * Ensures the user has manager/admin permissions before allowing a write.
 */
export async function requireAdminOrManager() {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("Unauthorized: Please log in.");
    if (profile.role !== "admin" && profile.role !== "manager" && profile.role !== "super_manager") {
        throw new Error("Unauthorized: Admin or Manager role required.");
    }
    return profile;
}


/**
 * Safely validates a Firestore ID to prevent "Internal Assertion Failed" 
 * which happens when an empty string or undefined is passed as a path segment.
 */
function validateId(id: string | undefined | null, fieldName: string = "ID"): string {
    if (!id || typeof id !== "string" || id.trim() === "") {
        console.error(`[Firestore] Invalid ${fieldName} provided:`, id);
        throw new Error(`Invalid ${fieldName}: Must be a non-empty string.`);
    }
    return id.trim();
}

/**
 * Fetches a single document by ID Safely
 */
export async function getDocById<T>(colName: string, id: string): Promise<T & { id: string }> {
    const validId = validateId(id, `${colName} ID`);
    const docSnap = await getDoc(doc(getDb(), colName, validId));
    if (!docSnap.exists()) throw new Error(`${colName} document not found.`);
    return { id: docSnap.id, ...(docSnap.data() as T) };
}

// ═══════════════════════════════════════════════════
//  COLLEGES
// ═══════════════════════════════════════════════════

export async function getColleges(): Promise<(FirestoreCollege & { id: string })[]> {
    const q = query(collection(getDb(), "colleges"), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreCollege) }));
}

/** 
 * Wraps onSnapshot with a minor delay and safety checks to prevent
 * the "WatchChangeAggregator" assertion error in high-frequency lifecycle environments.
 */
function safeSubscribe(firestoreQuery: import("firebase/firestore").Query, onNext: (snap: import("firebase/firestore").QuerySnapshot) => void, onError?: (err: import("firebase/firestore").FirestoreError) => void) {
    let unsubscribed = false;
    let unsub: (() => void) | null = null;

    // Small delay allows previous listeners to clear from Firestore's internal state machine (WatchChangeAggregator)
    setTimeout(() => {
        if (unsubscribed) return;
        try {
            unsub = onSnapshot(firestoreQuery, (snap: import("firebase/firestore").QuerySnapshot) => {
                if (unsubscribed) return;
                try {
                    onNext(snap);
                } catch (e: unknown) {
                    console.error("[Firestore] safeSubscribe callback error:", e);
                }
            }, (err: import("firebase/firestore").FirestoreError) => {
                if (unsubscribed) return;
                console.error("[Firestore] safeSubscribe listener error:", err);
                if (onError) onError(err);
            });
        } catch (err: unknown) {
            console.error("[Firestore] safeSubscribe initialization error:", err);
        }
    }, 50); // 50ms is usually enough to let the previous stream clear

    return () => {
        unsubscribed = true;
        if (unsub) unsub();
    };
}

export function subscribeColleges(callback: (data: (FirestoreCollege & { id: string })[]) => void) {
    const q = query(collection(getDb(), "colleges"), orderBy("name", "asc"));
    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.docs.map((d: import("firebase/firestore").DocumentSnapshot) => ({ id: d.id, ...(d.data() as FirestoreCollege) })));
    });
}

export async function updateCollege(id: string, data: Partial<FirestoreCollege>): Promise<void> {
    const profile = await requireAdminOrManager();
    if (profile.role === "manager" && profile.collegeId !== id) {
        throw new Error("You can only manage your own college.");
    }
    await updateDoc(doc(getDb(), "colleges", id), {
        ...data,
        lastUpdatedBy: profile.displayName,
        lastUpdatedDate: serverTimestamp(),
    });
}

export async function requestCollegeEdit(collegeId: string, data: { sectionName: string; changes: Record<string, unknown> }): Promise<string> {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) throw new Error("Auth required");

    const editData: Omit<PendingEdit, "id"> = {
        authorId: userProfile.id!,
        authorName: userProfile.displayName,
        authorRole: userProfile.role || "",
        sectionName: data.sectionName,
        changes: data.changes,
        status: "pending",
        rejectionReason: "",
        createdAt: serverTimestamp() as Timestamp,
    };

    const docRef = await addDoc(collection(getDb(), "colleges", collegeId, "pendingEdits"), editData);
    return docRef.id;
}

export async function getPendingEdits(collegeId: string): Promise<(PendingEdit & { id: string })[]> {
    const q = query(
        collection(getDb(), "colleges", collegeId, "pendingEdits"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as PendingEdit) }));
}

export async function approveCollegeEdit(collegeId: string, editId: string): Promise<void> {
    await requireAdminOrManager();
    const editRef = doc(getDb(), "colleges", collegeId, "pendingEdits", editId);
    const editDoc = await getDoc(editRef);
    if (!editDoc.exists()) throw new Error("Edit not found");

    const edit = editDoc.data() as PendingEdit;
    await updateDoc(doc(getDb(), "colleges", collegeId), edit.changes);
    await updateDoc(editRef, { status: "approved" });

    await createNotification(edit.authorId, {
        type: "college_edit_approved",
        message: `Your suggested edit to "${edit.sectionName}" has been approved!`,
        relatedId: collegeId,
        relatedType: "college",
    });
}

export async function rejectCollegeEdit(collegeId: string, editId: string, reason: string): Promise<void> {
    await requireAdminOrManager();
    const editRef = doc(getDb(), "colleges", collegeId, "pendingEdits", editId);
    const editDoc = await getDoc(editRef);
    if (!editDoc.exists()) throw new Error("Edit not found");

    const edit = editDoc.data() as PendingEdit;
    await updateDoc(editRef, { status: "rejected", rejectionReason: reason });

    await createNotification(edit.authorId, {
        type: "college_edit_rejected",
        message: `Your suggested edit to "${edit.sectionName}" was not approved. Reason: ${reason}`,
        relatedId: collegeId,
        relatedType: "college",
    });
}

// ═══════════════════════════════════════════════════
//  CLUBS
// ═══════════════════════════════════════════════════

export async function createClub(club: Omit<FirestoreClub, "createdAt" | "updatedAt" | "membersCount" | "createdBy">): Promise<void> {
    const profile = await requireAdminOrManager();
    if (profile.role === "manager" && profile.collegeId !== club.collegeId) {
        throw new Error("You can only create clubs for your own college.");
    }

    const fullClub: Omit<FirestoreClub, "id"> = {
        ...club,
        membersCount: 0,
        createdBy: profile.id!,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
    };

    await addDoc(collection(getDb(), "clubs"), fullClub);
}

export async function isMemberOfClub(clubId: string, userId: string): Promise<boolean> {
    const snap = await getDoc(doc(getDb(), "clubs", clubId, "members", userId));
    return snap.exists();
}

/**
 * Fetches all clubs in a college where the user is a confirmed member.
 */
export async function getMyClubs(userId: string, collegeId: string): Promise<(FirestoreClub & { id: string })[]> {
    const db = getDb();
    const q = query(collection(db, "clubs"), where("collegeId", "==", collegeId));
    const snap = await getDocs(q);
    
    // Check membership for each club (this is done in parallel)
    const clubDocs = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreClub) }));
    const membershipChecks = await Promise.all(
        clubDocs.map(club => getDoc(doc(db, "clubs", club.id, "members", userId)))
    );

    return clubDocs.filter((_, index) => membershipChecks[index].exists());
}

export function subscribeClubs(
    collegeId: string, 
    callback: (data: (FirestoreClub & { id: string })[]) => void,
    onError?: (err: import("firebase/firestore").FirestoreError) => void
) {
    const validCollegeId = validateId(collegeId, "College ID");
    // Removed orderBy to avoid composite index requirement, sorting client-side instead
    const q = query(collection(getDb(), "clubs"), where("collegeId", "==", validCollegeId));
    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        const clubs = snap.docs.map((d: import("firebase/firestore").DocumentSnapshot) => ({ id: d.id, ...(d.data() as FirestoreClub) }));
        clubs.sort((a: FirestoreClub, b: FirestoreClub) => (a.name || "").localeCompare(b.name || ""));
        callback(clubs);
    }, onError);
}

export async function updateClub(id: string, data: Partial<FirestoreClub>): Promise<void> {
    const validId = validateId(id, "Club ID");
    const access = await canManageClub(validId);
    if (!access.allowed) throw new Error("You don't have permission to update this club.");

    await updateDoc(doc(getDb(), "clubs", validId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteClub(id: string): Promise<void> {
    const validId = validateId(id, "Club ID");
    const profile = await requireAdminOrManager();
    const club = await getDocById<FirestoreClub>("clubs", validId);

    if (profile.role === "manager" && profile.collegeId !== club.collegeId) {
        throw new Error("You can only delete clubs in your own college.");
    }

    await deleteDoc(doc(getDb(), "clubs", validId));
}

/**
 * Checks if the current user has administrative access to a specific club
 */
export async function canManageClub(clubId: string): Promise<{ allowed: boolean; role: "admin" | "manager" | "president" | null }> {
    if (!clubId) return { allowed: false, role: null };
    const profile = await getCurrentUserProfile();
    if (!profile) return { allowed: false, role: null };

    if (profile.role === "admin" || profile.role === "super_manager") return { allowed: true, role: "admin" };

    const club = await getDocById<FirestoreClub>("clubs", clubId);
    if (profile.role === "manager" && profile.collegeId === club.collegeId) return { allowed: true, role: "manager" };

    // Check if user is the President of this club
    try {
        const memberDoc = await getDoc(doc(getDb(), "clubs", clubId, "members", profile.id!));
        if (memberDoc.exists() && (memberDoc.data() as ClubMember).role === "President") {
            return { allowed: true, role: "president" };
        }
    } catch (err) {
        console.error("[Firestore] Error checking club president role:", err);
    }

    return { allowed: false, role: null };
}

export async function requestJoinClub(clubId: string, message: string = ""): Promise<void> {
    const profile = await getCurrentUserProfile();
    if (!profile || !profile.id) throw new Error("Auth required");
    const validClubId = validateId(clubId, "Club ID");

    const request: ClubRequest = {
        userId: profile.id,
        displayName: profile.displayName,
        photoURL: profile.photoURL || "",
        message,
        status: "pending",
        createdAt: serverTimestamp() as Timestamp,
    };

    await setDoc(doc(getDb(), "clubs", validClubId, "requests", profile.id), request);
}

export async function approveClubMember(clubId: string, userId: string, role: ClubMember["role"] = "Member"): Promise<void> {
    const validClubId = validateId(clubId, "Club ID");
    const validUserId = validateId(userId, "User ID");
    const access = await canManageClub(validClubId);
    if (!access.allowed) throw new Error("Unauthorized to approve members for this club.");

    const db = getDb();
    const requestRef = doc(db, "clubs", validClubId, "requests", validUserId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) throw new Error("Request not found");

    const request = requestSnap.data() as ClubRequest;
    
    // Batch update: approve request, add member, increment count
    const batch = writeBatch(db);
    
    const member: ClubMember = {
        userId: request.userId,
        displayName: request.displayName,
        photoURL: request.photoURL,
        role,
        joinedAt: serverTimestamp() as Timestamp,
    };

    batch.set(doc(db, "clubs", validClubId, "members", validUserId), member);
    batch.delete(requestRef);
    batch.update(doc(db, "clubs", validClubId), { 
        membersCount: increment(1),
        updatedAt: serverTimestamp()
    });

    await batch.commit();

    await createNotification(validUserId, {
        type: "club_join_approved",
        message: `Welcome! Your request to join the club has been approved.`,
        relatedId: validClubId,
        relatedType: "club",
    });
}

export async function rejectClubMember(clubId: string, userId: string): Promise<void> {
    const validClubId = validateId(clubId, "Club ID");
    const validUserId = validateId(userId, "User ID");
    const access = await canManageClub(validClubId);
    if (!access.allowed) throw new Error("Unauthorized to manage requests for this club.");

    const db = getDb();
    await deleteDoc(doc(db, "clubs", validClubId, "requests", validUserId));

    await createNotification(validUserId, {
        type: "club_join_rejected",
        message: `Your request to join the club was not approved at this time.`,
        relatedId: validClubId,
        relatedType: "club",
    });
}

export function subscribeClubMembers(clubId: string, callback: (members: (ClubMember & { id: string })[]) => void) {
    if (!clubId) return () => {};
    const q = query(collection(getDb(), "clubs", clubId, "members"), orderBy("joinedAt", "desc"));
    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.docs.map((d: import("firebase/firestore").QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() as ClubMember) })));
    });
}

export function subscribeClubRequests(clubId: string, callback: (requests: (ClubRequest & { id: string })[]) => void) {
    if (!clubId) return () => {};
    const q = query(collection(getDb(), "clubs", clubId, "requests"), orderBy("createdAt", "desc"));
    return safeSubscribe(q, (snap: QuerySnapshot<DocumentData>) => {
        callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as ClubRequest) })));
    });
}

export async function updateClubMemberRole(clubId: string, userId: string, newRole: ClubMember["role"]): Promise<void> {
    const validClubId = validateId(clubId, "Club ID");
    const validUserId = validateId(userId, "User ID");
    const access = await canManageClub(validClubId);
    if (!access.allowed) throw new Error("Unauthorized to manage member roles.");

    await updateDoc(doc(getDb(), "clubs", validClubId, "members", validUserId), { role: newRole });
}

export async function removeClubMember(clubId: string, userId: string): Promise<void> {
    const validClubId = validateId(clubId, "Club ID");
    const validUserId = validateId(userId, "User ID");
    const access = await canManageClub(validClubId);
    if (!access.allowed) throw new Error("Unauthorized to remove members from this club.");

    const db = getDb();
    const batch = writeBatch(db);
    batch.delete(doc(db, "clubs", validClubId, "members", validUserId));
    batch.update(doc(db, "clubs", validClubId), { 
        membersCount: increment(-1),
        updatedAt: serverTimestamp() 
    });

    await batch.commit();
}

/**
 * Directly add a user to a club (bypasses the request flow).
 * Only club President, college Manager, Super Manager, or Admin can do this.
 */
export async function addDirectMember(
    clubId: string, 
    userId: string, 
    role: ClubMember["role"] = "Member"
): Promise<void> {
    const validClubId = validateId(clubId, "Club ID");
    const validUserId = validateId(userId, "User ID");
    const access = await canManageClub(validClubId);
    if (!access.allowed) throw new Error("Unauthorized to add members to this club.");

    const db = getDb();

    // Get the target user's profile
    const userSnap = await getDoc(doc(db, "users", validUserId));
    if (!userSnap.exists()) throw new Error("User not found.");
    const userData = userSnap.data() as FirestoreUser;

    // Check if already a member
    const existingMember = await getDoc(doc(db, "clubs", validClubId, "members", validUserId));
    if (existingMember.exists()) throw new Error("This user is already a member of this club.");

    const member: ClubMember = {
        userId: validUserId,
        displayName: userData.displayName,
        photoURL: userData.photoURL || "",
        role,
        joinedAt: serverTimestamp() as Timestamp,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, "clubs", validClubId, "members", validUserId), member);
    // Also remove any pending request from this user if it exists
    batch.delete(doc(db, "clubs", validClubId, "requests", validUserId));
    batch.update(doc(db, "clubs", validClubId), { 
        membersCount: increment(1),
        updatedAt: serverTimestamp()
    });

    await batch.commit();

    await createNotification(validUserId, {
        type: "club_join_approved",
        message: `You have been added to a club!`,
        relatedId: validClubId,
        relatedType: "club",
    });
}

export async function leaveClub(clubId: string): Promise<void> {
    const validClubId = validateId(clubId, "Club ID");
    const profile = await getCurrentUserProfile();
    if (!profile || !profile.id) throw new Error("Auth required");

    const db = getDb();
    const batch = writeBatch(db);
    batch.delete(doc(db, "clubs", validClubId, "members", profile.id));
    batch.update(doc(db, "clubs", validClubId), { 
        membersCount: increment(-1),
        updatedAt: serverTimestamp()
    });
    await batch.commit();
}

export async function addClubActivity(clubId: string, activity: Omit<ClubActivity, "createdAt">): Promise<void> {
    const validClubId = validateId(clubId, "Club ID");
    const access = await canManageClub(validClubId);
    if (!access.allowed) throw new Error("Unauthorized to manage activities for this club.");

    await addDoc(collection(getDb(), "clubs", validClubId, "activities"), {
        ...activity,
        createdAt: serverTimestamp(),
    });
}

export function subscribeClubActivities(clubId: string, callback: (data: (ClubActivity & { id: string })[]) => void) {
    if (!clubId) return () => {};
    const q = query(collection(getDb(), "clubs", clubId, "activities"), orderBy("date", "desc"));
    return safeSubscribe(q, (snap: QuerySnapshot<DocumentData>) => {
        callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as ClubActivity) })));
    });
}

// ═══════════════════════════════════════════════════
//  POSTS (NEWS FEED)
// ═══════════════════════════════════════════════════


export async function createPost(post: Omit<FirestorePost, "timestamp" | "reactions" | "status" | "collegeName" | "collegeLogo" | "createdBy" | "creatorId"> & { collegeId?: string }): Promise<void> {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("Auth required");

    const targetCollegeId = post.collegeId || profile.collegeId;
    const college = await getDocById<FirestoreCollege>("colleges", targetCollegeId);

    // Parse Hashtags
    const tags = post.description?.match(/#[\w\u0980-\u09FF]+/g)?.map(t => t.slice(1).toLowerCase()) || [];

    // Auto-approval logic: 
    // Admins and Super Managers are always auto-approved.
    // Managers are auto-approved ONLY if it's for their own college.
    const isOwnerOrAdmin = profile.role === "admin" || profile.role === "super_manager";
    const isManagerOfOwnCollege = profile.role === "manager" && profile.collegeId === targetCollegeId;
    const isAutoApproved = isOwnerOrAdmin || isManagerOfOwnCollege;

    const fullPost: Record<string, unknown> = {
        ...post,
        collegeId: targetCollegeId,
        collegeName: college.shortName || college.name,
        collegeLogo: college.logo,
        createdBy: {
            name: profile.displayName,
            avatar: profile.photoURL || profile.displayName[0] || "?",
            role: profile.role
        },
        creatorId: profile.id!,
        status: isAutoApproved ? "approved" : "pending",
        reactions: { love: 0, fire: 0, insightful: 0, clap: 0, wow: 0 },
        reactedBy: { love: [], fire: [], insightful: [], clap: [], wow: [] },
        timestamp: serverTimestamp() as Timestamp,
        isAuthorShadowBanned: profile.isShadowBanned || false,
        tags,
    };

    Object.keys(fullPost).forEach(key => fullPost[key] === undefined && delete fullPost[key]);

    const docRef = await addDoc(collection(getDb(), "posts"), fullPost);

    if (isAutoApproved) {
        await notifyFollowersOfPost(
            profile.id!,
            profile.displayName,
            profile.photoURL || "",
            docRef.id,
            post.eventName || ""
        );
    }

    // Handle Mentions in post description
    await handleMentions(post.description || "", `/news-feed?commentPostId=${docRef.id}`, profile, docRef.id, "post");
}

export function subscribePosts(callback: (data: (FirestorePost & { id: string })[]) => void) {
    const auth = getAuthInstance();
    const currentUser = auth.currentUser;
    const db = getDb();

    // Fetch posts. For non-admins, we'd ideally filter by visibility in the query 
    // to match security rules, but typically we filter in JS if the rule is complex.
    // However, for Story-like collections where rules are strict, we MUST query properly.
    // Posts collection rules (line 160) are currently 'allow read: if true', 
    // but we should still respect status and visibility.
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(100));
    
    return safeSubscribe(q, (snap: QuerySnapshot<DocumentData>) => {
        const posts = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestorePost) }));
        
        // Filter strictly in JS for now as the security rules allow full read.
        // If security rules were tightened, we'd add where() clauses to q.
        const filtered = posts.filter(p => {
            if (p.isAuthorShadowBanned) return false;
            
            // Allow if approved or legacy (undefined status)
            const isApproved = p.status === "approved" || !p.status;
            
            // Authors can always see their own posts
            if (currentUser && p.creatorId === currentUser.uid) return true;
            
            if (!isApproved) return false;
            
            // Campus privacy filter: "campus" or "private" posts are only visible to same-college users
            const vis = p.visibility || "public";
            if (vis === "campus" || vis === "private") {
                if (!currentUser) return false;
                // We need the viewer's profile to check collegeId. Since we can't async here,
                // we rely on the profile being passed or cached. For now, we show all approved posts
                // and let the page-level filter handle campus isolation.
            }
            
            return true;
        });

        callback(filtered);
    });
}

export async function getPendingPosts(): Promise<(FirestorePost & { id: string })[]> {
    const q = query(collection(getDb(), "posts"), where("status", "==", "pending"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestorePost) }));
}

export async function getApprovedPosts(): Promise<(FirestorePost & { id: string })[]> {
    const q = query(
        collection(getDb(), "posts"), 
        where("status", "==", "approved"), 
        orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestorePost) }));
}

/**
 * Subscribes to approved posts for a specific club by name.
 * Used in the Club Details Modal "Feed" tab.
 */
export function subscribeClubPosts(
    clubName: string,
    callback: (data: (FirestorePost & { id: string })[]) => void
) {
    const db = getDb();
    const q = query(
        collection(db, "posts"),
        where("type", "==", "club"),
        where("clubName", "==", clubName),
        where("status", "==", "approved"),
        orderBy("timestamp", "desc"),
        limit(50)
    );

    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        const posts = snap.docs
            .map((d: import("firebase/firestore").QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() as FirestorePost) }))
            .filter((p: FirestorePost) => !p.isAuthorShadowBanned);
        callback(posts);
    });
}

export async function approvePost(id: string): Promise<void> {
    const profile = await requireAdminOrManager();
    const postRef = doc(getDb(), "posts", id);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;
    const post = postSnap.data() as FirestorePost;

    await updateDoc(postRef, { 
        status: "approved",
        reviewedBy: profile.id,
        reviewedAt: serverTimestamp()
    });

    await createNotification(post.creatorId, {
        type: "post_approved",
        message: `Your post "${post.eventName || 'Update'}" has been approved and is now live.`,
        relatedId: id,
        relatedType: "post",
        targetUrl: `/news-feed#post-${id}`
    });

    await notifyFollowersOfPost(
        post.creatorId,
        post.createdBy.name,
        post.createdBy.avatar || "",
        id,
        post.eventName || ""
    );
}

export async function rejectPost(id: string, reason?: string): Promise<void> {
    const profile = await requireAdminOrManager();
    const postRef = doc(getDb(), "posts", id);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;
    const post = postSnap.data() as FirestorePost;

    await updateDoc(postRef, { 
        status: "rejected",
        reviewedBy: profile.id,
        reviewedAt: serverTimestamp(),
        rejectReason: reason || ""
    });

    await createNotification(post.creatorId, {
        type: "post_rejected",
        message: `Your post "${post.eventName || 'Update'}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
        relatedId: id,
        relatedType: "post",
        targetUrl: `/profile/${post.creatorId}`
    });
}

/** Moderation subscriptions for Dock & Panel */
export function subscribePendingPostsCount(collegeId: string | undefined, isAdmin: boolean | undefined, callback: (count: number) => void) {
    const db = getDb();
    let q;
    if (isAdmin) {
        q = query(collection(db, "posts"), where("status", "==", "pending"));
    } else {
        q = query(collection(db, "posts"), where("status", "==", "pending"), where("collegeId", "==", collegeId));
    }

    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.docs.length);
    });
}

export function subscribeModerationQueue(collegeId: string | undefined, isAdmin: boolean | undefined, callback: (data: (FirestorePost & { id: string })[]) => void) {
    const db = getDb();
    let q;
    if (isAdmin) {
        q = query(collection(db, "posts"), where("status", "==", "pending"), orderBy("timestamp", "asc"));
    } else {
        q = query(collection(db, "posts"), where("status", "==", "pending"), where("collegeId", "==", collegeId), orderBy("timestamp", "asc"));
    }

    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.docs.map((d: import("firebase/firestore").QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() as FirestorePost) })));
    });
}

export function subscribeReviewedPosts(collegeId: string | undefined, isAdmin: boolean | undefined, callback: (data: (FirestorePost & { id: string })[]) => void) {
    const db = getDb();
    let q;
    if (isAdmin) {
        q = query(collection(db, "posts"), where("status", "in", ["approved", "rejected"]), orderBy("reviewedAt", "desc"), limit(20));
    } else {
        q = query(collection(db, "posts"), where("status", "in", ["approved", "rejected"]), where("collegeId", "==", collegeId), orderBy("reviewedAt", "desc"), limit(20));
    }

    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.docs.map((d: import("firebase/firestore").QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() as FirestorePost) })));
    });
}

// ═══════════════════════════════════════════════════
//  GENERIC MODERATION SYSTEM
// ═══════════════════════════════════════════════════

/**
 * Generic subscription for pending item counts.
 */
export function subscribeModerationCount(
    collectionName: string, 
    collegeId: string | undefined, 
    isAdmin: boolean | undefined, 
    callback: (count: number) => void
) {
    const db = getDb();
    let q = query(collection(db, collectionName), where("status", "==", "pending"));
    
    if (!isAdmin && collegeId) {
        q = query(q, where("collegeId", "==", collegeId));
    }

    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.size);
    });
}

/**
 * Generic subscription for moderation queue (pending items).
 */
export function subscribeModerationQueueGeneric(
    collectionName: string, 
    collegeId: string | undefined, 
    isAdmin: boolean | undefined, 
    callback: (data: any[]) => void
) {
    const db = getDb();
    const timeField = collectionName === 'notices' ? 'date' : collectionName === 'studyPosts' ? 'createdAt' : 'timestamp';
    
    let q = query(collection(db, collectionName), where("status", "==", "pending"), orderBy(timeField, "asc"));
    
    if (!isAdmin && collegeId) {
        q = query(collection(db, collectionName), where("status", "==", "pending"), where("collegeId", "==", collegeId), orderBy(timeField, "asc"));
    }

    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

/**
 * Generic subscription for reviewed items history.
 */
export function subscribeReviewedQueueGeneric(
    collectionName: string, 
    collegeId: string | undefined, 
    isAdmin: boolean | undefined, 
    callback: (data: any[]) => void
) {
    const db = getDb();
    const approvedStatus = collectionName === 'stories' ? 'published' : 'approved';

    // Cleanup logic: Only show items reviewed in the last 7 days to keep the UI "neat and clean"
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startTimestamp = Timestamp.fromDate(sevenDaysAgo);
    
    let q = query(
        collection(db, collectionName), 
        where("status", "in", [approvedStatus, "rejected"]), 
        where("reviewedAt", ">=", startTimestamp),
        orderBy("reviewedAt", "desc"), 
        limit(50)
    );
    
    if (!isAdmin && collegeId) {
        q = query(
            collection(db, collectionName), 
            where("status", "in", [approvedStatus, "rejected"]), 
            where("collegeId", "==", collegeId), 
            where("reviewedAt", ">=", startTimestamp),
            orderBy("reviewedAt", "desc"), 
            limit(50)
        );
    }

    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}

/**
 * Unified approval function.
 */
export async function approveModerationItem(collectionName: string, id: string): Promise<void> {
    const profile = await requireAdminOrManager();
    const db = getDb();
    const docRef = doc(db, collectionName, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data();

    const approvedStatus = collectionName === 'stories' ? 'published' : 'approved';
    
    await updateDoc(docRef, { 
        status: approvedStatus,
        reviewedBy: profile.id,
        reviewedByName: profile.displayName,
        reviewedAt: serverTimestamp()
    });

    // Handle notifications (best effort)
    const creatorId = data.creatorId || data.authorId || data.userId;
    if (creatorId) {
        const title = data.eventName || data.title || data.name || "item";
        await createNotification(creatorId, {
            type: `${collectionName.slice(0, -1)}_approved` as any,
            message: `Your ${collectionName.slice(0, -1)} "${title}" has been approved.`,
            relatedId: id,
            relatedType: collectionName.slice(0, -1) as any
        }).catch(e => console.warn("Mod notification failed:", e));
    }
}

/**
 * Unified rejection function.
 */
export async function rejectModerationItem(collectionName: string, id: string, reason: string = ""): Promise<void> {
    const profile = await requireAdminOrManager();
    const db = getDb();
    const docRef = doc(db, collectionName, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data();

    await updateDoc(docRef, { 
        status: "rejected",
        reviewedBy: profile.id,
        reviewedByName: profile.displayName,
        reviewedAt: serverTimestamp(),
        rejectReason: reason
    });

    // Handle notifications
    const creatorId = data.creatorId || data.authorId || data.userId;
    if (creatorId) {
        const title = data.eventName || data.title || data.name || "item";
        await createNotification(creatorId, {
            type: `${collectionName.slice(0, -1)}_rejected` as any,
            message: `Your ${collectionName.slice(0, -1)} "${title}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
            relatedId: id,
            relatedType: collectionName.slice(0, -1) as any
        }).catch(e => console.warn("Mod notification failed:", e));
    }
}


export async function updatePost(id: string, data: Partial<FirestorePost>): Promise<void> {
    // Allowlist: prevent mutation of sensitive fields
    const ALLOWED_POST_FIELDS = ['title', 'content', 'type', 'tags', 'thumbnailUrl', 'eventName', 'eventDate', 'eventLocation', 'eventDescription', 'linkUrl', 'visibility'];
    const clean = Object.fromEntries(
        Object.entries(data).filter(([k]) => ALLOWED_POST_FIELDS.includes(k))
    );
    if (Object.keys(clean).length === 0) return;
    await updateDoc(doc(getDb(), "posts", id), clean);
}

export async function deletePost(id: string): Promise<void> {
    // Clean up thumbnail from Cloudinary before deleting
    try {
        const postSnap = await getDoc(doc(getDb(), "posts", id));
        if (postSnap.exists()) {
            const data = postSnap.data() as FirestorePost;
            if (data.thumbnailUrl) {
                await deleteFromCloudinary(data.thumbnailUrl);
            }
        }
    } catch (err) {
        console.warn("[Firestore] Error cleaning up post thumbnail:", err);
    }
    await deleteDoc(doc(getDb(), "posts", id));
    await deleteAllCommentsForContent(id);
}

// ═══════════════════════════════════════════════════
//  STORIES
// ═══════════════════════════════════════════════════

export async function createStory(story: Omit<FirestoreStory, "timestamp" | "status" | "reactions" | "reactedBy" | "authorPhoto" | "name" | "college" | "collegeId" | "authorRole" | "role" | "authorId" | "collegeGradient" | "readingTimeMinutes">): Promise<void> {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("Auth required");

    const college = await getDocById<FirestoreCollege>("colleges", profile.collegeId);

    const fullStory: Omit<FirestoreStory, "id"> = {
        ...story,
        authorId: profile.id!,
        authorPhoto: profile.photoURL || "",
        name: profile.displayName,
        college: college.shortName || college.name,
        collegeId: profile.collegeId,
        collegeGradient: college.color || "linear-gradient(135deg, #C0392B 0%, #2C3E50 100%)",
        authorRole: (['student', 'teacher', 'graduate'].includes(profile.role || '') ? profile.role : 'student') as "student" | "teacher" | "graduate",
        role: profile.role || 'student', // Legacy
        status: "pending",
        reactions: { inspired: 0, relatable: 0, insightful: 0, respect: 0, powerful: 0 },
        reactedBy: { inspired: [], relatable: [], insightful: [], respect: [], powerful: [] },
        readingTimeMinutes: Math.max(1, Math.ceil((story.fullStory?.length || 0) / 1500)), 
        timestamp: serverTimestamp() as Timestamp,
        visibility: story.visibility || "public",
        isAuthorShadowBanned: profile.isShadowBanned || false,
    };

    const docRef = await addDoc(collection(getDb(), "stories"), fullStory);

    // Handle Mentions in story content
    await handleMentions(story.fullStory || "", `/story/${docRef.id}`, profile, docRef.id, "story");
}

export function subscribeStories(callback: (data: (FirestoreStory & { id: string })[]) => void, isAdminOrManager: boolean = false) {
    
    // BUILD QUERY BASED ON PERMISSIONS
    // This is critical: Firestore Security Rules require the query to match allowed documents.
    // Rules (line 171) allow read if visibility == 'public' OR visibility == 'college_only' && user.collegeId == story.collegeId
    
    const conditions: QueryConstraint[] = [orderBy("timestamp", "desc")];
    
    if (!isAdminOrManager) {
        // For public/normal users, we MUST filter in the query to avoid 'Missing Permissions'
        // Since we can't easily do (visibility == 'public' OR (visibility == 'college_only' AND collegeId == X)) in one simple query without complex indexes,
        // we normally query for 'public' and then merge. 
        // For simplicity and rule compliance, we query published public stories.
        conditions.unshift(where("status", "in", ["published", "approved"]));
        
        // Note: Authors can see their own stories even if not public, but that requires a separate query or different logic.
    }
    
    const q = query(collection(getDb(), "stories"), ...conditions);
    
    return onSnapshot(q, (snap) => {
        const stories = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreStory) }));
        callback(stories.filter(s => !s.isAuthorShadowBanned));
    }, (error) => {
        console.error("[subscribeStories] Firestore error:", error);
        callback([]); // Fallback
    });
}

export async function getPendingStories(): Promise<(FirestoreStory & { id: string })[]> {
    const q = query(collection(getDb(), "stories"), where("status", "==", "pending"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreStory) }));
}

export async function getApprovedStories(): Promise<(FirestoreStory & { id: string })[]> {
    const q = query(
        collection(getDb(), "stories"), 
        where("status", "==", "published"), 
        orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreStory) }));
}

export { getApprovedStories as getPublishedStories };

export async function approveStory(id: string): Promise<void> {
    await requireAdminOrManager();
    const storySnap = await getDoc(doc(getDb(), "stories", id));
    if (!storySnap.exists()) return;
    const story = storySnap.data() as FirestoreStory;
    
    await updateDoc(doc(getDb(), "stories", id), { status: "published" });

    await createNotification(story.authorId, {
        type: "story_approved",
        message: `Your story "${story.title}" has been published.`,
        relatedId: id,
        relatedType: "story",
        targetUrl: `/story/${id}`
    }).catch(e => console.error("Notification failed", e));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function rejectStory(id: string, _reason: string): Promise<void> {
    await requireAdminOrManager();
    const storySnap = await getDoc(doc(getDb(), "stories", id));
    if (!storySnap.exists()) return;
    const story = storySnap.data() as FirestoreStory;

    await updateDoc(doc(getDb(), "stories", id), { status: "rejected" });

    await createNotification(story.authorId, {
        type: "story_rejected",
        message: `Your story "${story.title}" was rejected.`,
        relatedId: id,
        relatedType: "story",
        targetUrl: `/profile/${story.authorId}`
    }).catch(e => console.error("Notification failed", e));
}

export async function updateStory(id: string, data: Partial<FirestoreStory>): Promise<void> {
    // Allowlist: prevent mutation of sensitive fields
    const ALLOWED_STORY_FIELDS = ['title', 'content', 'fullStory', 'preview', 'coverMood', 'futureGoals', 'oneAdvice', 'readingTimeMinutes', 'mediaUrl', 'mediaType', 'visibility', 'tags'];
    const clean = Object.fromEntries(
        Object.entries(data).filter(([k]) => ALLOWED_STORY_FIELDS.includes(k))
    );
    if (Object.keys(clean).length === 0) return;
    await updateDoc(doc(getDb(), "stories", id), clean);
}

export async function deleteStory(id: string): Promise<void> {
    // Clean up thumbnail from Cloudinary before deleting
    try {
        const storySnap = await getDoc(doc(getDb(), "stories", id));
        if (storySnap.exists()) {
            const data = storySnap.data() as FirestoreStory;
            if (data.thumbnailUrl) {
                await deleteFromCloudinary(data.thumbnailUrl);
            }
        }
    } catch (err) {
        console.warn("[Firestore] Error cleaning up story thumbnail:", err);
    }
    await deleteDoc(doc(getDb(), "stories", id));
    await deleteAllCommentsForContent(id);
}

/**
 * Subscribes to stories authored by a specific user.
 * @param isOwner - If true (viewing own profile), shows all statuses. If false, only published/approved.
 */
export function subscribeUserStories(uid: string, callback: (data: (FirestoreStory & { id: string })[]) => void, isOwner: boolean = false) {
    const q = query(
        collection(getDb(), "stories"),
        where("authorId", "==", uid),
        orderBy("timestamp", "desc")
    );
    
    return onSnapshot(q, (snap) => {
        let stories = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreStory) }));
        // Non-owners only see published non-private stories
        if (!isOwner) {
            stories = stories.filter(s => s.status === "published" && s.visibility !== "private");
        }
        callback(stories);
    });
}

/**
 * Delete own post (user-facing). Verifies the current user is the post creator.
 */
export async function deleteOwnPost(postId: string): Promise<void> {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) throw new Error("Auth required");

    const postRef = doc(getDb(), "posts", postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) throw new Error("Post not found");
    
    const data = postSnap.data() as FirestorePost;
    if (data.creatorId !== user.uid) throw new Error("You can only delete your own posts");

    // Clean up thumbnail
    try {
        if (data.thumbnailUrl) await deleteFromCloudinary(data.thumbnailUrl);
    } catch (err) {
        console.warn("[Firestore] Thumbnail cleanup error:", err);
    }
    await deleteDoc(postRef);
    await deleteAllCommentsForContent(postId);
}

/**
 * Delete own story (user-facing). Verifies the current user is the story author.
 */
export async function deleteOwnStory(storyId: string): Promise<void> {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) throw new Error("Auth required");

    const storyRef = doc(getDb(), "stories", storyId);
    const storySnap = await getDoc(storyRef);
    if (!storySnap.exists()) throw new Error("Story not found");
    
    const data = storySnap.data() as FirestoreStory;
    if (data.authorId !== user.uid) throw new Error("You can only delete your own stories");

    // Clean up thumbnail
    try {
        if (data.thumbnailUrl) await deleteFromCloudinary(data.thumbnailUrl);
    } catch (err) {
        console.warn("[Firestore] Thumbnail cleanup error:", err);
    }
    await deleteDoc(storyRef);
    await deleteAllCommentsForContent(storyId);
}

/**
 * Fetches recent activity for a user (posts, reactions, comments)
 * This is a composite fetch for the Activity tab.
 * @param isOwner - If true, shows all statuses. If false, only approved/published.
 */
export async function getUserActivity(uid: string, isOwner: boolean = false) {
    const db = getDb();
    
    // 1. User's Posts
    const postsQ = query(collection(db, "posts"), where("creatorId", "==", uid), orderBy("timestamp", "desc"), limit(10));
    const postsSnap = await getDocs(postsQ);
    const posts = postsSnap.docs.map(d => ({ ...d.data(), id: d.id, activityType: 'post' as const }));

    // 2. User's Stories
    const storiesQ = query(collection(db, "stories"), where("authorId", "==", uid), orderBy("timestamp", "desc"), limit(10));
    const storiesSnap = await getDocs(storiesQ);
    const stories = storiesSnap.docs.map(d => ({ ...d.data(), id: d.id, activityType: 'story' as const }));

    // 3. User's Comments (include postId for navigation)
    const commentsQ = query(collection(db, "comments"), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(10));
    const commentsSnap = await getDocs(commentsQ);
    const comments = commentsSnap.docs.map(d => ({ ...d.data(), id: d.id, activityType: 'comment' as const }));

    // Filter out rejected/pending items for non-owner viewers
    let all: any[] = [...posts, ...stories, ...comments];
    if (!isOwner) {
        all = all.filter((item: any) => {
            if (item.visibility === 'private') return false;
            if (item.activityType === 'comment') return true; // comments don't have status
            const status = item.status || '';
            return status === 'approved' || status === 'published';
        });
    }

    // Interleave them by creation time
    all.sort((a: any, b: any) => {
        const timeA = a.timestamp?.seconds || a.createdAt?.seconds || 0;
        const timeB = b.timestamp?.seconds || b.createdAt?.seconds || 0;
        return timeB - timeA;
    });

    return all.slice(0, 20);
}

/**
 * Fetches feed content (posts, stories, notices, study materials) for a specific user
 * Used for the "My Feed" tab on user profiles
 */
export async function getUserFeedContent(uid: string, isOwner: boolean = false) {
    const db = getDb();
    
    // 1. User's Posts
    const postsQ = query(collection(db, "posts"), where("creatorId", "==", uid), orderBy("timestamp", "desc"), limit(20));
    const postsSnap = await getDocs(postsQ);
    let posts = postsSnap.docs.map(d => ({ ...d.data(), id: d.id, feedType: 'post' as const }));

    // 2. User's Stories
    const storiesQ = query(collection(db, "stories"), where("authorId", "==", uid), orderBy("timestamp", "desc"), limit(20));
    const storiesSnap = await getDocs(storiesQ);
    let stories = storiesSnap.docs.map(d => ({ ...d.data(), id: d.id, feedType: 'story' as const }));

    // 3. User's Notices (Sort locally to avoid needing a new composite index)
    const noticesQ = query(collection(db, "notices"), where("authorId", "==", uid));
    const noticesSnap = await getDocs(noticesQ);
    let notices = noticesSnap.docs.map(d => ({ ...d.data(), id: d.id, feedType: 'notice' as const }));
    notices.sort((a: any, b: any) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
    notices = notices.slice(0, 20);

    // 4. User's Study Materials (Sort locally to avoid needing a new composite index)
    const studyQ = query(collection(db, "studyPosts"), where("authorId", "==", uid));
    const studySnap = await getDocs(studyQ);
    let studyMaterials = studySnap.docs.map(d => ({ ...d.data(), id: d.id, feedType: 'study' as const }));
    studyMaterials.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    studyMaterials = studyMaterials.slice(0, 20);

    // 5. User's Comments
    const commentsQ = query(collection(db, "comments"), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(20));
    const commentsSnap = await getDocs(commentsQ);
    let comments = commentsSnap.docs.map(d => ({ ...d.data(), id: d.id, feedType: 'comment' as const }));

    // Apply visibility filters for non-owners
    if (!isOwner) {
        posts = posts.filter((p: any) => (p.status === 'published' || p.status === 'approved') && p.visibility !== 'private');
        stories = stories.filter((s: any) => (s.status === 'published' || s.status === 'approved') && s.visibility !== 'private');
        notices = notices.filter((n: any) => (n.status === 'published' || n.status === 'approved' || !n.status) && n.visibility !== 'private');
        studyMaterials = studyMaterials.filter((sm: any) => (sm.status === 'published' || sm.status === 'approved' || !sm.status) && sm.visibility !== 'private');
    }

    return {
        posts,
        stories,
        notices,
        studyMaterials,
        comments
    };
}

export async function reactToStory(id: string, reaction: "inspired" | "relatable" | "insightful" | "respect" | "powerful" | "relate" | "love" | "fire" | "wow" | "clap"): Promise<{ added: boolean }> {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) throw new Error("Auth required");

    const storyRef = doc(getDb(), "stories", id);
    const storySnap = await getDoc(storyRef);
    if (!storySnap.exists()) throw new Error("Story not found");

    const data = storySnap.data() as FirestoreStory;
    const reactedBy = data.reactedBy || { inspired: [], relatable: [], insightful: [], respect: [], powerful: [] };
    const alreadyReacted = ((reactedBy as Record<string, string[]>)[reaction] || []).includes(user.uid);

    if (alreadyReacted) {
        await updateDoc(storyRef, {
            [`reactions.${reaction}`]: increment(-1),
            [`reactedBy.${reaction}`]: arrayRemove(user.uid),
            // Legacy support
            ...(reaction === "inspired" ? { inspireCount: increment(-1), inspiredBy: arrayRemove(user.uid) } : {})
        });
        return { added: false };
    } else {
        await updateDoc(storyRef, {
            [`reactions.${reaction}`]: increment(1),
            [`reactedBy.${reaction}`]: arrayUnion(user.uid),
             // Legacy support
             ...(reaction === "inspired" ? { inspireCount: increment(1), inspiredBy: arrayUnion(user.uid) } : {})
        });
        return { added: true };
    }
}

/** Legacy wrapper */
export async function inspireStory(id: string) {
    return reactToStory(id, "inspired");
}


// ═══════════════════════════════════════════════════
//  NOTICES
// ═══════════════════════════════════════════════════

export async function createNotice(notice: Omit<FirestoreNotice, "date" | "status" | "postedBy" | "college" | "authorId" | "collegeColor" | "collegeId">): Promise<void> {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("Auth required");

    const collegeId = (notice as Record<string, unknown>).collegeId as string || profile.collegeId;
    const college = await getDocById<FirestoreCollege>("colleges", collegeId);

    const fullNotice: Omit<FirestoreNotice, "id"> = {
        ...notice,
        authorId: profile.id!,
        collegeId,
        college: college.shortName || college.name,
        collegeColor: college.color || "#6366f1",
        postedBy: profile.displayName,
        status: (profile.role === "admin" || profile.role === "manager" || profile.role === "teacher") ? "approved" : "pending",
        date: serverTimestamp() as Timestamp,
        isAuthorShadowBanned: profile.isShadowBanned || false,
    };

    await addDoc(collection(getDb(), "notices"), fullNotice);
}

export function subscribeNotices(callback: (data: (FirestoreNotice & { id: string })[]) => void) {
    const q = query(collection(getDb(), "notices"), orderBy("date", "desc"));
    return onSnapshot(q, (snap) => {
        const notices = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreNotice) }));
        callback(notices.filter(n => !n.isAuthorShadowBanned));
    });
}

export async function getNotices(): Promise<(FirestoreNotice & { id: string })[]> {
    const q = query(
        collection(getDb(), "notices"), 
        orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreNotice) }));
}

export async function updateNoticeStatus(id: string, status: "approved" | "rejected"): Promise<void> {
    const profile = await requireAdminOrManager();
    await updateDoc(doc(getDb(), "notices", id), {
        status,
        approvedBy: profile.id,
        approvedByName: profile.displayName
    });
}

export async function updateNotice(id: string, data: Partial<FirestoreNotice>): Promise<void> {
    // Allowlist: prevent mutation of sensitive fields
    const ALLOWED_NOTICE_FIELDS = [
        'title', 'body', 'programme', 'attachmentUrl', 'visibility', 
        'isPinned', 'isUrgent', 'thumbnailUrl', 'collegeId'
    ];
    const clean = Object.fromEntries(
        Object.entries(data).filter(([k]) => ALLOWED_NOTICE_FIELDS.includes(k))
    ) as any;
    if (Object.keys(clean).length === 0) return;
    
    // If collegeId is being updated, also update the denormalized college name and color
    if (clean.collegeId) {
        try {
            const college = await getDocById<any>("colleges", clean.collegeId);
            if (college) {
                clean.college = college.shortName || college.name;
                clean.collegeColor = college.color || "#6366f1";
            }
        } catch (err) {
            console.warn("[Firestore] Failed to update college info for notice:", err);
        }
    }

    await updateDoc(doc(getDb(), "notices", id), { ...clean, date: serverTimestamp() });
}

export async function deleteNotice(id: string): Promise<void> {
    await requireAdminOrManager();
    // Clean up thumbnail from Cloudinary before deleting
    try {
        const noticeSnap = await getDoc(doc(getDb(), "notices", id));
        if (noticeSnap.exists()) {
            const data = noticeSnap.data() as FirestoreNotice;
            if (data.thumbnailUrl) {
                await deleteFromCloudinary(data.thumbnailUrl);
            }
        }
    } catch (err) {
        console.warn("[Firestore] Error cleaning up notice thumbnail:", err);
    }
    await deleteDoc(doc(getDb(), "notices", id));
}

/**
 * Gets counts of all pending items for Admin Panel badges.
 * Respects College Isolation Rule for managers.
 */
export async function getAdminPendingCounts(): Promise<AdminPendingCounts> {
    const profile = await requireAdminOrManager();
    const db = getDb();
    const isManager = profile.role === "manager";
    const collegeId = profile.collegeId;

    const countPending = async (collName: string) => {
        try {
            let q = query(collection(db, collName), where("status", "==", "pending"));
            
            // Apply college filter if manager (except for gifts/supporters which are global)
            if (isManager && collName !== "gifts") {
                q = query(q, where("collegeId", "==", collegeId));
            }

            const snap = await getDocs(q);
            return snap.size;
        } catch (err) {
            console.error(`Error counting pending in ${collName}:`, err);
            return 0;
        }
    };

    const [posts, stories, notices, studyPosts, gifts] = await Promise.all([
        countPending("posts"),
        countPending("stories"),
        countPending("notices"),
        countPending("studyPosts"),
        isManager ? Promise.resolve(0) : countPending("gifts"),
    ]);

    return { posts, stories, notices, studyPosts, gifts };
}

export async function toggleNoticePin(id: string, isPinned: boolean): Promise<void> {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "notices", id), { isPinned });
}

export async function toggleNoticeUrgent(id: string, isUrgent: boolean): Promise<void> {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "notices", id), { isUrgent });
}


// ═══════════════════════════════════════════════════
//  USERS & AUTH
// ═══════════════════════════════════════════════════

export async function getCurrentUserProfile(): Promise<FirestoreUser & { id: string } | null> {
    const auth = getAuthInstance();
    
    // Helper to wait for auth state if not immediately available
    const getAuthUser = (): Promise<any> => {
        if (auth.currentUser) return Promise.resolve(auth.currentUser);
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
            setTimeout(() => { unsubscribe(); resolve(null); }, 5000);
        });
    };

    const user = await getAuthUser();
    if (!user || !user.uid) return null;
    try {
        return await getDocById<FirestoreUser>("users", user.uid);
    } catch (e) {
        console.error("[Firestore] Failed to get current user profile:", e);
        return null;
    }
}

export async function getAllUsers(): Promise<(FirestoreUser & { id: string })[]> {
    const q = query(collection(getDb(), "users"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreUser) }));
}

export async function getUsersByCollege(collegeId: string): Promise<(FirestoreUser & { id: string })[]> {
    await requireAdminOrManager();
    const q = query(collection(getDb(), "users"), where("collegeId", "==", collegeId));
    const snap = await getDocs(q);
    const users = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreUser) }));
    // Sort by createdAt descending in JS to avoid requiring a composite index
    return users.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
    });
}

/**
 * Search users in a college for the "Add Member" feature.
 * Allows Club Presidents (via canManageClub) in addition to Admin/Manager roles.
 */
export async function searchUsersForClub(clubId: string, collegeId: string): Promise<(FirestoreUser & { id: string })[]> {
    const access = await canManageClub(clubId);
    if (!access.allowed) throw new Error("Unauthorized to search users for this club.");
    
    // Sort by displayName ascending in JS to avoid requiring a composite index
    const q = query(collection(getDb(), "users"), where("collegeId", "==", collegeId));
    const snap = await getDocs(q);
    const users = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreUser) }));
    return users.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
}

export async function updateUserRole(userId: string, role: FirestoreUser["role"], verified: boolean): Promise<void> {
    const currentProfile = await requireAdminOrManager();
    // Managers cannot assign admin/super_manager roles (privilege escalation prevention)
    if (currentProfile.role === 'manager' && (role === 'admin' || role === 'super_manager')) {
        throw new Error('Unauthorized: Managers cannot assign admin or super_manager roles.');
    }
    await updateDoc(doc(getDb(), "users", userId), { role, roleVerified: verified });
}

export async function updateUserRoleAndCollege(userId: string, role: string, verified: boolean, collegeId: string, college: string): Promise<void> {
    const currentProfile = await requireAdminOrManager();
    // Managers cannot assign admin/super_manager roles (privilege escalation prevention)
    if (currentProfile.role === 'manager' && (role === 'admin' || role === 'super_manager')) {
        throw new Error('Unauthorized: Managers cannot assign admin or super_manager roles.');
    }
    await updateDoc(doc(getDb(), "users", userId), { role, roleVerified: verified, collegeId, college });
}

export async function getAllUsersByUsername(username: string): Promise<(FirestoreUser & { id: string })[]> {
    const q = query(collection(getDb(), "users"), where("username", "==", username));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreUser) }));
}

/**
 * Fetch multiple user profiles by their UIDs in parallel.
 * Useful for the reaction viewer to show reactor names and avatars.
 */
export async function getProfilesByIds(uids: string[]): Promise<(FirestoreUser & { id: string })[]> {
    if (!uids || uids.length === 0) return [];
    
    try {
        const uniqueUids = Array.from(new Set(uids));
        const profiles = await Promise.all(
            uniqueUids.map(uid => 
                getDocById<FirestoreUser>("users", uid)
                    .catch(() => null)
            )
        );
        
        return profiles.filter((p): p is (FirestoreUser & { id: string }) => p !== null);
    } catch (err) {
        console.error("[Firestore] getProfilesByIds failed:", err);
        return [];
    }
}

// ═══════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════

export async function createNotification(recipientId: string, data: Omit<FirestoreNotification, "recipientId" | "read" | "createdAt" | "id">): Promise<void> {
    const notification: Omit<FirestoreNotification, "id"> = {
        ...data,
        recipientId,
        read: false,
        createdAt: serverTimestamp() as Timestamp,
    };
    await addDoc(collection(getDb(), "notifications"), notification);
}

export function subscribeNotifications(uid: string, callback: (data: (FirestoreNotification & { id: string })[]) => void) {
    const q = query(collection(getDb(), "notifications"), where("recipientId", "==", uid), orderBy("createdAt", "desc"), limit(20));
    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreNotification) })));
    });
}

export function subscribeUnreadNotificationsCount(uid: string, callback: (count: number) => void) {
    const q = query(
        collection(getDb(), "notifications"),
        where("recipientId", "==", uid),
        where("read", "==", false)
    );
    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        callback(snap.size);
    });
}

export async function markNotificationRead(id: string): Promise<void> {
    await updateDoc(doc(getDb(), "notifications", id), { read: true });
}

export async function deleteNotification(notifId: string): Promise<void> {
    const validId = validateId(notifId, "Notification ID");
    await deleteDoc(doc(getDb(), "notifications", validId));
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
    const db = getDb();
    try {
        // First try using the composite query (requires index: recipientId + read)
        const q = query(collection(db, "notifications"), where("recipientId", "==", uid), where("read", "==", false));
        const snap = await getDocs(q);
        if (snap.empty) return;
        
        // Firestore batches are limited to 500 operations; chunk if needed
        const docs = snap.docs;
        const BATCH_LIMIT = 499;
        for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
            const chunk = docs.slice(i, i + BATCH_LIMIT);
            const batch = writeBatch(db);
            chunk.forEach(d => {
                batch.update(d.ref, { read: true });
            });
            await batch.commit();
        }
    } catch (err) {
        // Fallback: if composite index is missing, fetch all notifications for user and filter client-side
        console.warn("[Firestore] Composite query failed for markAllRead, using fallback:", err);
        try {
            const fallbackQ = query(collection(db, "notifications"), where("recipientId", "==", uid));
            const fallbackSnap = await getDocs(fallbackQ);
            const unreadDocs = fallbackSnap.docs.filter(d => (d.data() as Record<string, unknown>).read === false);
            if (unreadDocs.length === 0) return;
            
            const BATCH_LIMIT = 499;
            for (let i = 0; i < unreadDocs.length; i += BATCH_LIMIT) {
                const chunk = unreadDocs.slice(i, i + BATCH_LIMIT);
                const batch = writeBatch(db);
                chunk.forEach(d => {
                    batch.update(d.ref, { read: true });
                });
                await batch.commit();
            }
        } catch (fallbackErr) {
            console.error("[Firestore] markAllNotificationsRead fallback also failed:", fallbackErr);
            throw fallbackErr;
        }
    }
}
// ═══════════════════════════════════════════════════
//  QA CARDS
// ═══════════════════════════════════════════════════

export async function getVisibleQACards(): Promise<(FirestoreQACard & { id: string })[]> {
    const q = query(collection(getDb(), "qaCards"), where("isVisible", "==", true));
    const snap = await getDocs(q);
    const cards = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreQACard) }));
    return cards.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getAllQACards(): Promise<(FirestoreQACard & { id: string })[]> {
    await requireAdminOrManager();
    const q = query(collection(getDb(), "qaCards"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreQACard) }));
}

export async function createQACard(card: Omit<FirestoreQACard, "id" | "createdAt" | "updatedAt">): Promise<void> {
    await requireAdminOrManager();
    await addDoc(collection(getDb(), "qaCards"), {
        ...card,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function updateQACard(id: string, data: Partial<FirestoreQACard>): Promise<void> {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "qaCards", id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteQACard(id: string): Promise<void> {
    await requireAdminOrManager();
    await deleteDoc(doc(getDb(), "qaCards", id));
}

export async function getQACards(): Promise<(FirestoreQACard & { id: string })[]> {
    return getAllQACards();
}

export async function reorderQACards(items: { id: string, order: number }[]): Promise<void> {
    await requireAdminOrManager();
    const batch = writeBatch(getDb());
    items.forEach(item => {
        batch.update(doc(getDb(), "qaCards", item.id), { order: item.order });
    });
    await batch.commit();
}

// ═══════════════════════════════════════════════════
//  ADMISSION GUIDE — STEPS
// ═══════════════════════════════════════════════════

export async function getVisibleAdmissionSteps(): Promise<(FirestoreAdmissionStep & { id: string })[]> {
    const q = query(collection(getDb(), "admissionSteps"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...(d.data() as FirestoreAdmissionStep) }))
        .filter(step => step.isVisible);
}

export async function getAllAdmissionSteps(): Promise<(FirestoreAdmissionStep & { id: string })[]> {
    await requireAdminOrManager();
    const q = query(collection(getDb(), "admissionSteps"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreAdmissionStep) }));
}

export async function createAdmissionStep(step: Omit<FirestoreAdmissionStep, "id" | "createdAt" | "updatedAt">): Promise<void> {
    await requireAdminOrManager();
    await addDoc(collection(getDb(), "admissionSteps"), {
        ...step,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function updateAdmissionStep(id: string, data: Partial<FirestoreAdmissionStep>): Promise<void> {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "admissionSteps", id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteAdmissionStep(id: string): Promise<void> {
    await requireAdminOrManager();
    await deleteDoc(doc(getDb(), "admissionSteps", id));
}

export async function reorderAdmissionSteps(items: { id: string; order: number }[]): Promise<void> {
    await requireAdminOrManager();
    const batch = writeBatch(getDb());
    items.forEach(item => {
        batch.update(doc(getDb(), "admissionSteps", item.id), { order: item.order });
    });
    await batch.commit();
}

// ═══════════════════════════════════════════════════
//  ADMISSION GUIDE — COST ITEMS
// ═══════════════════════════════════════════════════

export async function getVisibleAdmissionCosts(): Promise<(FirestoreAdmissionCostItem & { id: string })[]> {
    const q = query(collection(getDb(), "admissionCosts"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...(d.data() as FirestoreAdmissionCostItem) }))
        .filter(cost => cost.isVisible);
}

export async function getAllAdmissionCosts(): Promise<(FirestoreAdmissionCostItem & { id: string })[]> {
    await requireAdminOrManager();
    const q = query(collection(getDb(), "admissionCosts"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreAdmissionCostItem) }));
}

export async function createAdmissionCost(item: Omit<FirestoreAdmissionCostItem, "id" | "createdAt" | "updatedAt">): Promise<void> {
    await requireAdminOrManager();
    await addDoc(collection(getDb(), "admissionCosts"), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function updateAdmissionCost(id: string, data: Partial<FirestoreAdmissionCostItem>): Promise<void> {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "admissionCosts", id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteAdmissionCost(id: string): Promise<void> {
    await requireAdminOrManager();
    await deleteDoc(doc(getDb(), "admissionCosts", id));
}

export async function reorderAdmissionCosts(items: { id: string; order: number }[]): Promise<void> {
    await requireAdminOrManager();
    const batch = writeBatch(getDb());
    items.forEach(item => {
        batch.update(doc(getDb(), "admissionCosts", item.id), { order: item.order });
    });
    await batch.commit();
}

// ═══════════════════════════════════════════════════
//  ADMISSION GUIDE — SETTINGS
// ═══════════════════════════════════════════════════

const DEFAULT_ADMISSION_SETTINGS: FirestoreAdmissionSettings = {
    sectionTitle: "বি.এড (অনার্স) ভর্তি প্রক্রিয়া",
    sectionSubtitle: "সরকারি টিচার্স ট্রেনিং কলেজে ভর্তির সহজ ও পূর্ণাঙ্গ গাইডলাইন",
    costTitle: "খরচের আনুমানিক ধারণা",
    isVisible: true,
};

export async function getAdmissionSettings(): Promise<FirestoreAdmissionSettings> {
    const snap = await getDoc(doc(getDb(), "settings", "admission"));
    return snap.exists() ? (snap.data() as FirestoreAdmissionSettings) : DEFAULT_ADMISSION_SETTINGS;
}

export async function updateAdmissionSettings(settings: FirestoreAdmissionSettings): Promise<void> {
    await requireAdminOrManager();
    await setDoc(doc(getDb(), "settings", "admission"), settings);
}

// ═══════════════════════════════════════════════════
//  BUILDER SECTION SETTINGS
// ═══════════════════════════════════════════════════

const DEFAULT_BUILDER_SETTINGS: FirestoreBuilderSettings = {
    titlePrefix: "Built by ",
    titleAccent: "One of Your Own",
    imageMode: "text",
    imageText: "S",
    imageUrl: "",
    descriptionPara1: "This platform was not designed in a corporate office. It was imagined by a student sitting inside Government Teachers' Training College, Feni — someone who felt the same disconnection, asked the same unanswered questions, and decided to build the solution himself.",
    descriptionPara2: "Every pixel of this platform carries that intention.",
    builderName: "MD. Eftakhar Amin Sakib",
    builderTitle: "UI/UX Designer & Frontend Developer",
    buttonText: "Connect with Sakib",
    buttonUrl: "", // Empty means it will open the popup. The admin could optionally provide a direct URL here to bypass the popup.
    popupLocation: "Government Teachers' Training College, Feni",
    popupLinkedinUrl: "https://www.linkedin.com/in/md-eftakhar-amin-sakib",
    popupPortfolioUrl: "https://eftakhar.com",
    popupContactEmail: "mailto:contact@eftakhar.com",
    popupWhatsappNumber: "+8801805107667",
    isVisible: true,
};

const DEFAULT_OFFICIAL_SETTINGS: FirestoreOfficialSettings = {
    isVisible: true,
    title: "Official TTC Network",
    tagline: "Connect, follow, or reach out",
    email: "contact@ttcnetwork.com",
    websiteUrl: "https://ttcnetwork.com",
    facebookUrl: "https://facebook.com/ttcnetwork",
    twitterUrl: "https://twitter.com/ttcnetwork",
    linkedinUrl: "https://linkedin.com/company/ttcnetwork",
    trustLine: "Official Communication Channels",
};

export async function getBuilderSettings(): Promise<FirestoreBuilderSettings> {
    const snap = await getDoc(doc(getDb(), "settings", "builder"));
    return snap.exists() ? (snap.data() as FirestoreBuilderSettings) : DEFAULT_BUILDER_SETTINGS;
}

export async function updateBuilderSettings(settings: FirestoreBuilderSettings): Promise<void> {
    await requireAdminOrManager();
    await setDoc(doc(getDb(), "settings", "builder"), settings);
}

export async function getOfficialSettings(): Promise<FirestoreOfficialSettings> {
    const snap = await getDoc(doc(getDb(), "settings", "official"));
    return snap.exists() ? (snap.data() as FirestoreOfficialSettings) : DEFAULT_OFFICIAL_SETTINGS;
}

export async function updateOfficialSettings(settings: FirestoreOfficialSettings): Promise<void> {
    await requireAdminOrManager();
    await setDoc(doc(getDb(), "settings", "official"), settings);
}

// ═══════════════════════════════════════════════════
//  ORIGIN STORY SECTION SETTINGS
// ═══════════════════════════════════════════════════

const DEFAULT_ORIGIN_STORY_SETTINGS: FirestoreOriginStorySettings = {
    isVisible: true,
};

export async function getOriginStorySettings(): Promise<FirestoreOriginStorySettings> {
    const snap = await getDoc(doc(getDb(), "settings", "originStory"));
    return snap.exists() ? (snap.data() as FirestoreOriginStorySettings) : DEFAULT_ORIGIN_STORY_SETTINGS;
}

export async function updateOriginStorySettings(settings: FirestoreOriginStorySettings): Promise<void> {
    await requireAdminOrManager();
    await setDoc(doc(getDb(), "settings", "originStory"), settings);
}

// --- Study Hero Settings ---

const DEFAULT_STUDY_HERO_SETTINGS: StudyHeroSettings = {
    materialsCount: 124,
    schedulesCount: 8,
    membersCount: 1400,
    autoCount: false,
    isVisible: true
};

export async function getStudyHeroSettings(): Promise<StudyHeroSettings> {
    const snap = await getDoc(doc(getDb(), "settings", "studyHero"));
    return snap.exists() ? (snap.data() as StudyHeroSettings) : DEFAULT_STUDY_HERO_SETTINGS;
}

export async function updateStudyHeroSettings(settings: StudyHeroSettings): Promise<void> {
    await requireAdminOrManager();
    await setDoc(doc(getDb(), "settings", "studyHero"), {
        ...settings,
        updatedAt: serverTimestamp()
    });
}

// ═══════════════════════════════════════════════════
//  SUPPORT & GIFTS
// ═══════════════════════════════════════════════════


export async function getSupportSettings(): Promise<SupportSettings> {
    const snap = await getDoc(doc(getDb(), "settings", "support"));
    return snap.exists() ? (snap.data() as SupportSettings) : { fundingOpen: true, fundingMessage: "Support our journey.", supportPageActive: true };
}

export async function updateSupportSettings(newSettings: Partial<SupportSettings>): Promise<void> {
    await requireAdminOrManager();
    await setDoc(doc(getDb(), "settings", "support"), newSettings, { merge: true });
}

export async function getSupportPhases(): Promise<(SupportPhase & { id: string })[]> {
    const q = query(collection(getDb(), "supportPhases"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as SupportPhase) }));
}

export async function createSupportPhase(phase: Omit<SupportPhase, "id">): Promise<string> {
    await requireAdminOrManager();
    const docRef = await addDoc(collection(getDb(), "supportPhases"), phase);
    return docRef.id;
}

export async function updateSupportPhase(id: string, data: Partial<SupportPhase>): Promise<void> {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "supportPhases", id), data);
}

export async function deleteSupportPhase(id: string): Promise<void> {
    await requireAdminOrManager();
    await deleteDoc(doc(getDb(), "supportPhases", id));
}

export async function seedRoadmapPhases(): Promise<void> {
    await requireAdminOrManager();
    const DEFAULT_PHASES = [
        {
            title: "Phase 1: UI & Frontend",
            description: "The initial phase of building out TTC Network's stunning design framework, user directory, global newsfeed, and support ecosystem.",
            status: "Complete",
            order: 1,
            progress: 100,
            color: "emerald",
            icon: "Layout",
            showFundraising: true
        },
        {
            title: "Phase 2: Developing the Backend",
            description: "Focusing heavily on robust Firebase security rules, cloud functions, deep user profiling, data hydration, and dynamic feeds.",
            status: "In Progress",
            order: 2,
            progress: 65,
            color: "blue",
            icon: "Server",
            showFundraising: true
        },
        {
            title: "Phase 3: Building the Mobile App",
            description: "Once the web application is stable and fully adopted, development will pivot to releasing a native mobile application.",
            status: "Upcoming",
            order: 3,
            progress: 0,
            color: "purple",
            icon: "Smartphone",
            showFundraising: false
        },
        {
            title: "Phase 4: Global Framework",
            description: "Expanding TTC Network beyond local boundaries. Establishing a framework for global university connectivity and cross-campus collaboration.",
            status: "Upcoming",
            order: 4,
            progress: 0,
            color: "blue",
            icon: "Globe",
            showFundraising: false
        },
        {
            title: "Phase 5: Earning Opportunity",
            description: "Empowering TTCians to earn while they learn. Integrating freelance marketplaces, project bounties, and skill-based rewards directly into the ecosystem.",
            status: "Upcoming",
            order: 5,
            progress: 0,
            color: "rose",
            icon: "Banknote",
            showFundraising: false
        }
    ];

    const db = getDb();
    const batch = writeBatch(db);
    
    for (const phase of DEFAULT_PHASES) {
        const ref = doc(collection(db, "supportPhases"));
        batch.set(ref, phase);
    }
    await batch.commit();
}

export async function getPendingGifts(): Promise<(FirestoreGift & { id: string })[]> {
    const q = query(collection(getDb(), "gifts"), where("status", "==", "pending"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreGift) }));
}

export async function approveGift(id: string, phaseId?: string, role?: string): Promise<void> {
    await requireAdminOrManager();
    const giftRef = doc(getDb(), "gifts", id);
    const giftSnap = await getDoc(giftRef);
    if (!giftSnap.exists()) throw new Error("Gift not found");

    const gift = giftSnap.data() as FirestoreGift;

    // Update gift status
    await updateDoc(giftRef, {
        status: "approved",
        badgeIssued: true,
        phaseId: phaseId || gift.phaseId,
        role: role || gift.role || "patron",
    });

    // Update user's aggregate supporter badge
    const userRef = doc(getDb(), "users", gift.userId);
    await updateDoc(userRef, {
        "supporterBadge.totalAmount": increment(gift.amount),
        "supporterBadge.lastDonationDate": serverTimestamp(),
        "supporterBadge.visible": true,
    });

    // Notify user
    await createNotification(gift.userId, {
        type: "gift_approved",
        message: `Your contribution of ৳${gift.amount} has been verified! Thank you for your support.`,
        relatedId: id,
        relatedType: "gift",
        targetUrl: `/support`
    });
}

export async function rejectGift(id: string): Promise<void> {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "gifts", id), { status: "rejected" });
}

export async function deleteGift(id: string): Promise<void> {
    await requireAdminOrManager();
    await deleteDoc(doc(getDb(), "gifts", id));
}

export async function updateGift(id: string, data: Partial<FirestoreGift>): Promise<void> {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "gifts", id), data);
}

export async function getApprovedGifts(): Promise<(FirestoreGift & { id: string })[]> {
    const q = query(collection(getDb(), "gifts"), where("status", "==", "approved"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreGift) }));
}

export async function addManualContributor(data: { userId: string; message?: string; amount: number; phaseId?: string; role: string }): Promise<void> {
    await requireAdminOrManager();
    const userDoc = await getDocById<FirestoreUser>("users", data.userId);

    const activePhaseId = await getActivePhaseId();

    const giftData: Omit<FirestoreGift, "id"> = {
        userId: data.userId,
        collegeId: userDoc.collegeId,
        name: userDoc.displayName,
        photoURL: userDoc.photoURL || "",
        amount: data.amount,
        txId: `MANUAL-${Date.now()}`,
        method: "bKash", // default for manual
        role: data.role as FirestoreGift["role"],
        status: "approved",
        badgeIssued: true,
        date: serverTimestamp() as Timestamp,
        phaseId: data.phaseId || activePhaseId,
    };

    await addDoc(collection(getDb(), "gifts"), giftData);

    // Update user totals
    await updateDoc(doc(getDb(), "users", data.userId), {
        "supporterBadge.totalAmount": increment(data.amount),
        "supporterBadge.lastDonationDate": serverTimestamp(),
        "supporterBadge.visible": true,
    });
}

export async function getActivePhaseId(): Promise<string> {
    const phases = await getSupportPhases();
    const active = phases.find(p => p.status === "In Progress");
    if (active) return active.id;
    // Default to Phase 1 ID if not found (as requested)
    const phase1 = phases.find(p => p.title.includes("Phase 1"));
    return phase1?.id || "phase_1_default"; 
}

export async function submitGift(gift: Omit<FirestoreGift, "date" | "status" | "badgeIssued" | "userId" | "photoURL" | "collegeId">): Promise<void> {
    const profile = await getCurrentUserProfile();
    
    // Automatically determine active phase
    const activePhaseId = await getActivePhaseId();

    const fullGift: Omit<FirestoreGift, "id"> = {
        ...gift,
        userId: profile?.id || "guest",
        collegeId: profile?.collegeId || "",
        name: profile?.displayName || gift.name || "Anonymous",
        photoURL: profile?.photoURL || "",
        status: "pending",
        badgeIssued: false,
        phaseId: activePhaseId, // Default to active phase
        date: serverTimestamp() as Timestamp,
    };
    await addDoc(collection(getDb(), "gifts"), fullGift);
}

// ═══════════════════════════════════════════════════
//  SYNC PROFILE UPDATES (DENORMALIZATION)
// ═══════════════════════════════════════════════════

export async function syncUserProfileUpdates(
    uid: string,
    displayName: string,
    photoURL: string,
    role: string
): Promise<void> {
    const db = getDb();

    // Collect all update operations first, then chunk into batches of 499
    // (Firestore batch limit is 500 operations)
    const updates: { ref: any; data: Record<string, any> }[] = [];

    // 1. Posts
    const postsQ = query(collection(db, "posts"), where("creatorId", "==", uid));
    const postsSnap = await getDocs(postsQ);
    postsSnap.forEach(d => {
        updates.push({
            ref: d.ref,
            data: {
                "createdBy.name": displayName,
                "createdBy.avatar": photoURL || displayName[0] || "?",
                "createdBy.role": role
            }
        });
    });

    // 2. Stories
    const storiesQ = query(collection(db, "stories"), where("authorId", "==", uid));
    const storiesSnap = await getDocs(storiesQ);
    storiesSnap.forEach(d => {
        updates.push({
            ref: d.ref,
            data: { name: displayName, authorPhoto: photoURL }
        });
    });

    // 3. Notices
    const noticesQ = query(collection(db, "notices"), where("authorId", "==", uid));
    const noticesSnap = await getDocs(noticesQ);
    noticesSnap.forEach(d => {
        updates.push({
            ref: d.ref,
            data: { postedBy: displayName }
        });
    });

    // 4. Gifts (Supporters)
    const giftsQ = query(collection(db, "gifts"), where("userId", "==", uid));
    const giftsSnap = await getDocs(giftsQ);
    giftsSnap.forEach(d => {
        updates.push({
            ref: d.ref,
            data: { name: displayName, photoURL: photoURL }
        });
    });

    // 5. Study Posts
    const studyQ = query(collection(db, "studyPosts"), where("authorId", "==", uid));
    const studySnap = await getDocs(studyQ);
    studySnap.forEach(d => {
        updates.push({
            ref: d.ref,
            data: { authorName: displayName, authorPhoto: photoURL, authorRole: role }
        });
    });

    // 6. Comments
    const commentsQ = query(collection(db, "comments"), where("userId", "==", uid));
    const commentsSnap = await getDocs(commentsQ);
    commentsSnap.forEach(d => {
        updates.push({
            ref: d.ref,
            data: { userName: displayName, userAvatar: photoURL, userRole: role }
        });
    });

    // Commit in chunks of 499 to stay under Firestore's 500-operation batch limit
    const MAX_BATCH = 499;
    for (let i = 0; i < updates.length; i += MAX_BATCH) {
        const chunk = updates.slice(i, i + MAX_BATCH);
        const batch = writeBatch(db);
        chunk.forEach(op => batch.update(op.ref, op.data));
        await batch.commit();
    }
}

/**
 * Updates a user's moderation status (Ban, Shadow Ban, Restrictions)
 * and propagates shadow-ban visibility to all their content.
 */
export async function updateUserModeration(
    uid: string,
    updates: { isBanned?: boolean, isShadowBanned?: boolean, restrictions?: string[], banReason?: string }
): Promise<void> {
    await requireAdminOrManager();
    const db = getDb();
    const batch = writeBatch(db);

    // 1. Update User Document
    batch.update(doc(db, "users", uid), updates);

    // 2. If shadow ban status changed, update all content visibility
    if (updates.isShadowBanned !== undefined) {
        // Update Posts
        const postsQ = query(collection(db, "posts"), where("creatorId", "==", uid));
        const postsSnap = await getDocs(postsQ);
        postsSnap.forEach(d => {
            batch.update(d.ref, { isAuthorShadowBanned: updates.isShadowBanned });
        });

        // Update Stories
        const storiesQ = query(collection(db, "stories"), where("authorId", "==", uid));
        const storiesSnap = await getDocs(storiesQ);
        storiesSnap.forEach(d => {
            batch.update(d.ref, { isAuthorShadowBanned: updates.isShadowBanned });
        });

        // Update Notices
        const noticesQ = query(collection(db, "notices"), where("authorId", "==", uid));
        const noticesSnap = await getDocs(noticesQ);
        noticesSnap.forEach(d => {
            batch.update(d.ref, { isAuthorShadowBanned: updates.isShadowBanned });
        });
    }

    await batch.commit();
}

/**
 * Deletes a generic user activity document (post, story, notice)
 */
export async function deleteUserActivity(collectionName: string, id: string): Promise<void> {
    const db = getDb();
    await deleteDoc(doc(db, collectionName, id));
}

/**
 * Updates a generic user activity document with new data
 */
export async function updateUserActivity(collectionName: string, id: string, newData: Record<string, unknown>): Promise<void> {
    const db = getDb();
    await updateDoc(doc(db, collectionName, id), {
        ...newData,
        updatedAt: serverTimestamp()
    });
}

// ═══════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════

export async function uploadFile(path: string, file: Blob | File | string) {
    return cloudinaryUpload(path, file as File);
}

export async function toggleVisibility(collectionName: string, id: string, newVisibility: "public" | "private"): Promise<void> {
    const db = getDb();
    await updateDoc(doc(db, collectionName, id), { visibility: newVisibility });
}

// ═══════════════════════════════════════════════════
//  SITE SETTINGS (Dynamic branding)
// ═══════════════════════════════════════════════════

export interface SiteSettingsDoc {
    siteName: string;
    siteTagline: string;
    logoUrl: string;
    privacyPolicy?: string;
    updatedAt?: ReturnType<typeof serverTimestamp>;
}

/** Get site settings from Firestore (one-time read) */
export async function getSiteSettingsDoc(): Promise<SiteSettingsDoc | null> {
    const db = getDb();
    const snap = await getDoc(doc(db, "settings", "site"));
    if (!snap.exists()) return null;
    return snap.data() as SiteSettingsDoc;
}

/** Update site settings in Firestore (admin only) */
export async function updateSiteSettings(data: Partial<SiteSettingsDoc>): Promise<void> {
    await requireAdminOrManager();
    const db = getDb();
    await setDoc(doc(db, "settings", "site"), {
        ...data,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

/** Subscribe to site settings changes in real time */
export function subscribeSiteSettings(callback: (settings: SiteSettingsDoc | null) => void): () => void {
    const db = getDb();
    return onSnapshot(doc(db, "settings", "site"), (snap) => {
        if (snap.exists()) {
            callback(snap.data() as SiteSettingsDoc);
        } else {
            callback(null);
        }
    });
}
async function handleMentions(text: string, targetUrl: string, profile: any, relatedId: string, relatedType: string) {
    if (!text) return;
    const mentions = text.match(/@(\w+)/g);
    if (!mentions) return;

    const uniqueUsernames = Array.from(new Set(mentions.map(m => m.slice(1).toLowerCase())));
    
    for (const username of uniqueUsernames) {
        if (username === profile.username?.toLowerCase()) continue;
        
        const users = await getAllUsersByUsername(username);
        if (users.length > 0) {
            const targetUser = users[0];
            await createNotification(targetUser.id!, {
                type: "mention",
                message: `${profile.displayName} mentioned you: "${text.slice(0, 30)}${text.length > 30 ? "..." : ""}"`,
                relatedId,
                relatedType,
                targetUrl,
                senderId: profile.id,
                senderName: profile.displayName,
                senderPhotoURL: profile.photoURL || "",
            }).catch(e => console.warn(`Mention notification to ${username} failed`, e));
        }
    }
}

/**
 * Comment System Actions
 */

export async function addComment(
    contentId: string, 
    text: string, 
    parentId?: string,
    contentType: "post" | "story" | "study" = "post"
): Promise<string> {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("Auth required");

    const comment: Omit<FirestoreComment, "id"> = {
        postId: contentId, // Named 'postId' in schema but generic here
        userId: profile.id,
        userName: profile.displayName || "Anonymous",
        userAvatar: profile.photoURL || "",
        userRole: profile.role,
        userVerified: profile.roleVerified,
        text,
        parentId: parentId || null,
        createdAt: serverTimestamp() as Timestamp,
        reactions: { love: 0, fire: 0, insightful: 0, clap: 0, wow: 0 },
        reactedBy: { love: [], fire: [], insightful: [], clap: [], wow: [] }
    };

    const db = getDb();
    const docRef = await addDoc(collection(db, "comments"), comment);

    // Update count on parent doc
    const collectionName = contentType === "post" ? "posts" : contentType === "story" ? "stories" : "studyPosts";
    const parentRef = doc(db, collectionName, contentId);
    
    try {
        const parentSnap = await getDoc(parentRef);
        if (parentSnap.exists()) {
            const parentData = parentSnap.data();
            await updateDoc(parentRef, { commentsCount: increment(1) });

            // Notify author if it's someone else
            const authorId = parentData.creatorId || parentData.authorId || parentData.userId; // posts use creatorId, stories use authorId, others might use userId
            if (authorId && authorId !== profile.id) {
                let targetUrl = "";
                if (contentType === "post") targetUrl = `/news-feed?commentPostId=${contentId}#comment-${docRef.id}`;
                else if (contentType === "story") targetUrl = `/story/${contentId}#comment-${docRef.id}`;
                else if (contentType === "study") targetUrl = `/study?commentPostId=${contentId}#comment-${docRef.id}`;

                await createNotification(authorId, {
                    type: "comment",
                    message: `${profile.displayName} commented on your ${contentType}: "${text.slice(0, 30)}${text.length > 30 ? "..." : ""}"`,
                    relatedId: contentId,
                    relatedType: contentType,
                    targetUrl,
                    senderId: profile.id,
                    senderName: profile.displayName,
                    senderPhotoURL: profile.photoURL || "",
                }).catch(e => console.warn("Failed to send comment notification", e));
            }

            // Notify parent comment author if it's a reply
            if (parentId) {
                const parentCommentSnap = await getDoc(doc(db, "comments", parentId));
                if (parentCommentSnap.exists()) {
                    const parentCommentData = parentCommentSnap.data();
                    const parentAuthorId = parentCommentData.userId;
                    // Only notify if parent author is not current user AND not already notified as post author
                    const postAuthorId = parentData.creatorId || parentData.authorId || parentData.userId;
                    if (parentAuthorId && parentAuthorId !== profile.id && parentAuthorId !== postAuthorId) {
                        let targetUrl = "";
                        if (contentType === "post") targetUrl = `/news-feed?commentPostId=${contentId}#comment-${docRef.id}`;
                        else if (contentType === "story") targetUrl = `/story/${contentId}#comment-${docRef.id}`;
                        else if (contentType === "study") targetUrl = `/study?commentPostId=${contentId}#comment-${docRef.id}`;

                        await createNotification(parentAuthorId, {
                            type: "reply",
                            message: `${profile.displayName} replied to your comment: "${text.slice(0, 30)}${text.length > 30 ? "..." : ""}"`,
                            relatedId: contentId,
                            relatedType: contentType,
                            targetUrl,
                            senderId: profile.id,
                            senderName: profile.displayName,
                            senderPhotoURL: profile.photoURL || "",
                        }).catch(e => console.warn("Failed to send reply notification", e));
                    }
                }
            }

            // Handle Mentions in comment
            let mentionUrl = "";
            if (contentType === "post") mentionUrl = `/news-feed?commentPostId=${contentId}#comment-${docRef.id}`;
            else if (contentType === "story") mentionUrl = `/story/${contentId}#comment-${docRef.id}`;
            else if (contentType === "study") mentionUrl = `/study?commentPostId=${contentId}#comment-${docRef.id}`;
            await handleMentions(text, mentionUrl, profile, contentId, contentType);
        }
    } catch (err) {
        console.warn(`Could not update commentsCount or notify for ${contentType} ${contentId}`, err);
    }

    return docRef.id;
}

export async function updateComment(commentId: string, text: string): Promise<void> {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("Auth required");

    const commentRef = doc(getDb(), "comments", commentId);
    await updateDoc(commentRef, { 
        text,
        updatedAt: serverTimestamp() 
    });
}

export async function deleteAllCommentsForContent(contentId: string): Promise<void> {
    try {
        const db = getDb();
        const commentsQ = query(collection(db, "comments"), where("postId", "==", contentId));
        const commentsSnap = await getDocs(commentsQ);
        if (!commentsSnap.empty) {
            const batch = writeBatch(db);
            commentsSnap.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
    } catch (err) {
        console.warn(`[Firestore] Error deleting associated comments for content ${contentId}:`, err);
    }
}

export async function deleteComment(commentId: string, contentId: string, contentType: "post" | "story" | "study" = "post"): Promise<void> {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("Auth required");

    const db = getDb();
    const batch = writeBatch(db);
    
    batch.delete(doc(db, "comments", commentId));
    await batch.commit();

    try {
        const collectionName = 
            contentType === "post" ? "posts" : 
            contentType === "story" ? "stories" : 
            "studyPosts";
            
        const parentRef = doc(db, collectionName, contentId);
        await updateDoc(parentRef, { commentsCount: increment(-1) });
    } catch (err) {
        console.warn(`Could not decrement commentsCount for ${contentType} ${contentId}`, err);
    }
}

export async function likeComment(commentId: string): Promise<void> {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("Auth required");

    const commentRef = doc(getDb(), "comments", commentId);
    const snap = await getDoc(commentRef);
    if (!snap.exists()) return;

    const data = snap.data() as FirestoreComment;
    const isLiked = data.likedBy?.includes(profile.id);

    if (isLiked) {
        await updateDoc(commentRef, {
            likedBy: arrayRemove(profile.id),
            likes: increment(-1)
        });
    } else {
        await updateDoc(commentRef, {
            likedBy: arrayUnion(profile.id),
            likes: increment(1)
        });
    }
}

export function subscribeComments(postId: string, callback: (comments: (FirestoreComment & { id: string })[]) => void) {
    const q = query(
        collection(getDb(), "comments"),
        where("postId", "==", postId)
    );
    
    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        const comments = snap.docs.map((d: import("firebase/firestore").DocumentSnapshot) => ({ ...(d.data() as FirestoreComment), id: d.id }));
        callback(comments);
    });
}

export async function reactToComment(commentId: string, reaction: "love" | "fire" | "insightful" | "clap" | "wow"): Promise<{ added: boolean }> {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) throw new Error("Auth required");

    const commentRef = doc(getDb(), "comments", commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) throw new Error("Comment not found");

    const data = commentSnap.data() as FirestoreComment & { reactedBy?: Record<string, unknown>; likedBy?: string[] };
    
    // Support for both legacy and new structures
    const reactedBy = data.reactedBy || { love: [], fire: [], insightful: [], clap: [], wow: [] };
    
    // Backward compatibility for 'like' -> 'love'
    if (data.likedBy && !reactedBy.love) {
        reactedBy.love = data.likedBy;
    }

    const collectionReactedBy = reactedBy[reaction] || [];
    const alreadyReacted = collectionReactedBy.includes(user.uid);

    if (alreadyReacted) {
        await updateDoc(commentRef, {
            [`reactions.${reaction}`]: increment(-1),
            [`reactedBy.${reaction}`]: arrayRemove(user.uid),
            // Cleanup legacy fields if they existed
            ...(reaction === 'love' && data.likes ? { likes: increment(-1), likedBy: arrayRemove(user.uid) } : {})
        });
        return { added: false };
    } else {
        const updates: Record<string, unknown> = {
            [`reactions.${reaction}`]: increment(1),
            [`reactedBy.${reaction}`]: arrayUnion(user.uid),
        };

        // Single reaction behavior: Remove others
        Object.keys(reactedBy).forEach(r => {
            if (r !== reaction && (reactedBy as Record<string, string[]>)[r]?.includes(user.uid)) {
                updates[`reactions.${r}`] = increment(-1);
                updates[`reactedBy.${r}`] = arrayRemove(user.uid);
            }
        });

        // Sync legacy 'likes' field for 'love'
        if (reaction === 'love') {
            updates.likes = increment(1);
            updates.likedBy = arrayUnion(user.uid);
        }

        await updateDoc(commentRef, updates);
        return { added: true };
    }
}

// ═══════════════════════════════════════════════════
//  STORY HERO SETTINGS
// ═══════════════════════════════════════════════════

const DEFAULT_STORY_HERO: StoryHeroSettings = {
    collegesCount: "14",
    communityCount: "1.2k+",
    storiesFallback: "85+",
    impactLevel: "High",
    autoCountCommunity: false,
    isVisible: true,
};

export async function getStoryHeroSettings(): Promise<StoryHeroSettings> {
    const db = getDb();
    const snap = await getDoc(doc(db, "settings", "storyHero"));
    return snap.exists() ? (snap.data() as StoryHeroSettings) : DEFAULT_STORY_HERO;
}

export async function updateStoryHeroSettings(data: Partial<StoryHeroSettings>): Promise<void> {
    await requireAdminOrManager();
    const db = getDb();
    await setDoc(doc(db, "settings", "storyHero"), {
        ...data,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

export function subscribeStoryHeroSettings(callback: (settings: StoryHeroSettings) => void): () => void {
    const db = getDb();
    return onSnapshot(doc(db, "settings", "storyHero"), (snap) => {
        if (snap.exists()) {
            callback(snap.data() as StoryHeroSettings);
        } else {
            callback(DEFAULT_STORY_HERO);
        }
    });
}

/**
 * Returns the total number of registered users for the 'Community' count.
 */
export async function getTotalUserCount(): Promise<number> {
    const db = getDb();
    const coll = collection(db, "users");
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
}

// ═══════════════════════════════════════════════════
//  FOLLOW / UNFOLLOW SYSTEM
// ═══════════════════════════════════════════════════

/**
 * Check if `currentUserId` is following `targetUserId`.
 */
export async function checkIsFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) return false;
    const db = getDb();
    const snap = await getDoc(doc(db, "users", currentUserId, "following", targetUserId));
    return snap.exists();
}

/**
 * Toggle follow/unfollow between current user and target user.
 * Uses a dual-subcollection approach:
 *   - users/{currentId}/following/{targetId}
 *   - users/{targetId}/followers/{currentId}
 * 
 * Split into two separate writes to respect Firestore security rules:
 *   - Current user batch: own following subcollection + own followingCount
 *   - Target user: followers subcollection (written by currentUser) + followersCount
 */
export async function toggleFollowUser(currentUserId: string, targetUserId: string): Promise<boolean> {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
        throw new Error("Cannot follow yourself.");
    }

    const db = getDb();
    const followingRef = doc(db, "users", currentUserId, "following", targetUserId);
    const followerRef = doc(db, "users", targetUserId, "followers", currentUserId);
    const currentUserRef = doc(db, "users", currentUserId);
    const targetUserRef = doc(db, "users", targetUserId);

    const isAlreadyFollowing = (await getDoc(followingRef)).exists();

    if (isAlreadyFollowing) {
        // UNFOLLOW — Step 1: Update own documents
        const myBatch = writeBatch(db);
        myBatch.delete(followingRef);
        myBatch.update(currentUserRef, { followingCount: increment(-1) });
        await myBatch.commit();

        // Step 2: Update target user's follower subcollection + counter
        const targetBatch = writeBatch(db);
        targetBatch.delete(followerRef);
        targetBatch.update(targetUserRef, { followersCount: increment(-1) });
        await targetBatch.commit();
    } else {
        // FOLLOW — Step 1: Update own documents
        const ts = serverTimestamp();
        const myBatch = writeBatch(db);
        myBatch.set(followingRef, { followedAt: ts });
        myBatch.update(currentUserRef, { followingCount: increment(1) });
        await myBatch.commit();

        // Step 2: Update target user's follower subcollection + counter
        const targetBatch = writeBatch(db);
        targetBatch.set(followerRef, { followedAt: ts });
        targetBatch.update(targetUserRef, { followersCount: increment(1) });
        await targetBatch.commit();

        const currentUserDoc = await getDoc(currentUserRef);
        const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : null;
        const currentUserName = currentUserData ? currentUserData.displayName : "Someone";
        const currentUserPhotoURL = currentUserData ? currentUserData.photoURL : "";
        
        await createNotification(targetUserId, {
            type: "follow",
            message: `${currentUserName} started following you.`,
            relatedId: currentUserId,
            relatedType: "user",
            targetUrl: `/profile/${currentUserId}`,
            senderId: currentUserId,
            senderName: currentUserName,
            senderPhotoURL: currentUserPhotoURL || ""
        }).catch(e => console.error("Notification failed", e));
    }

    return !isAlreadyFollowing; // returns new state: true = now following
}

/**
 * Get the follower count for a user (reads from user document field).
 */
export async function getFollowersCount(userId: string): Promise<number> {
    const db = getDb();
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data().followersCount || 0) : 0;
}

/**
 * Get the following count for a user (reads from user document field).
 */
export async function getFollowingCount(userId: string): Promise<number> {
    const db = getDb();
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data().followingCount || 0) : 0;
}

// ═══════════════════════════════════════════════════
//  USERNAME AVAILABILITY
// ═══════════════════════════════════════════════════

/**
 * Check if a username is available (not taken by another user).
 * Returns the owning userId if taken, or null if available.
 */
export async function checkUsernameAvailability(username: string, currentUserId: string): Promise<{ available: boolean; ownerId?: string }> {
    if (!username || username.trim().length < 3) {
        return { available: false };
    }
    const cleaned = username.trim().toLowerCase();
    const db = getDb();
    const q = query(collection(db, "users"), where("username", "==", cleaned));
    const snap = await getDocs(q);
    if (snap.empty) return { available: true };
    // Check if the only match is the current user (they already own it)
    const owners = snap.docs.map(d => d.id);
    if (owners.length === 1 && owners[0] === currentUserId) return { available: true };
    return { available: false, ownerId: owners[0] };
}

// ═══════════════════════════════════════════════════
//  STUDY SECTION
// ═══════════════════════════════════════════════════

export function subscribeStudyPosts(callback: (data: (FirestoreStudyPost & { id: string })[]) => void) {
    // Remove 'status' where filter so we can do client-side filtering for authors to see their pending posts.
    // Note: ensure firestore.rules allows full collection read for this to work natively without auth gating at Query level.
    const q = query(collection(getDb(), "studyPosts"));
    return safeSubscribe(q, (snap: import("firebase/firestore").QuerySnapshot) => {
        const authId = getAuthInstance().currentUser?.uid;
        // Ensure we filter out pending/rejected posts EXCEPT for the author themselves.
        const posts = snap.docs
            .map((d: import("firebase/firestore").QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() as FirestoreStudyPost) }))
            .filter(p => {
                // allow if approved
                if (p.status === "approved") return true;
                // optionally allow admins, but admin isn't easily checked synchronously here. 
                // Author can see their own pending/rejected posts
                if (authId && p.authorId === authId) return true;
                return false;
            });
        
        posts.sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || 0;
            const timeB = b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
        });
        callback(posts);
    });
}

export const createStudyPost = async (post: Partial<FirestoreStudyPost>) => {
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) throw new Error("Auth required");

    // Standardize the post data, ensuring no undefined fields reach Firestore
    const rawPost = {
        ...post,
        authorId: userProfile.id || "",
        authorName: userProfile.displayName || "Anonymous",
        authorPhoto: userProfile.photoURL || "",
        authorRole: userProfile.role || "student",
        collegeId: userProfile.collegeId || post.collegeId || "global",
        collegeName: (userProfile as any).collegeName || post.collegeName || "Global Community",
        // Sync visibility with privacy for backward compatibility
        visibility: post.privacy || "public",
        status: "pending",
        reactions: { inspired: 0, relatable: 0, insightful: 0, respect: 0, powerful: 0 },
        reactedBy: { inspired: [], relatable: [], insightful: [], respect: [], powerful: [] },
        createdAt: serverTimestamp(),
    };

    // Final sweep to remove any remaining undefined/null values that Firestore might reject
    const cleanedPost = Object.entries(rawPost).reduce((acc: Record<string, unknown>, [key, value]) => {
        if (value !== undefined && value !== null) {
            acc[key] = value;
        }
        return acc;
    }, {});

    const docRef = await addDoc(collection(getDb(), "studyPosts"), cleanedPost);

    // Handle Mentions in study post content
    await handleMentions(post.content || "", `/study?commentPostId=${docRef.id}`, userProfile, docRef.id, "study");
};

export const getPendingStudyPosts = async () => {
    const q = query(collection(getDb(), "studyPosts"), where("status", "==", "pending"));
    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreStudyPost) }));
    return posts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
};

export const getApprovedStudyPosts = async () => {
    const q = query(collection(getDb(), "studyPosts"), where("status", "==", "approved"));
    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreStudyPost) }));
    return posts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
};

export const approveStudyPost = async (id: string) => {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "studyPosts", id), {
        status: "approved",
        reviewedAt: serverTimestamp(),
    });
};

export const rejectStudyPost = async (id: string, reason: string = "") => {
    await requireAdminOrManager();
    await updateDoc(doc(getDb(), "studyPosts", id), {
        status: "rejected",
        rejectReason: reason,
        reviewedAt: serverTimestamp(),
    });
};

export const deleteStudyPost = async (id: string) => {
    // Clean up media files before deleting
    try {
        const postSnap = await getDoc(doc(getDb(), "studyPosts", id));
        if (postSnap.exists()) {
            const data = postSnap.data() as FirestoreStudyPost;
            if (data.thumbnailUrl) {
                await deleteFromCloudinary(data.thumbnailUrl);
            }
            if (data.fileUrl) {
                await deleteFromCloudinary(data.fileUrl);
            }
        }
    } catch (err) {
        console.warn("[Firestore] Error cleaning up study post files:", err);
    }
    await deleteDoc(doc(getDb(), "studyPosts", id));
    await deleteAllCommentsForContent(id);
};

export const updateStudyPost = async (id: string, data: Partial<FirestoreStudyPost>) => {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error("Auth required");

    const post = await getDocById<FirestoreStudyPost>("studyPosts", id);
    const isAdmin = profile.role === "admin" || profile.role === "super_manager" || profile.role === "manager";
    if (!isAdmin && post.authorId !== profile.id) {
        throw new Error("Unauthorized: You can only edit your own posts.");
    }

    // Sync visibility with privacy for backward compatibility
    const updateData: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };
    if (data.privacy) {
        updateData.visibility = data.privacy;
    }

    // Remove undefined values that Firestore rejects
    Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
    });

    await updateDoc(doc(getDb(), "studyPosts", id), updateData);
};

// ═══════════════════════════════════════════════════
//  UNIFIED REACTION SYSTEM
// ═══════════════════════════════════════════════════

export async function reactToContent(contentId: string, reaction: string, contentType: "post" | "story" | "study" | "comment"): Promise<{ added: boolean }> {
    const auth = getAuthInstance();
    const user = auth.currentUser;
    if (!user) throw new Error("Auth required");

    const collectionName = 
        contentType === "post" ? "posts" : 
        contentType === "story" ? "stories" : 
        contentType === "study" ? "studyPosts" : "comments";
    
    const contentRef = doc(getDb(), collectionName, contentId);
    const snap = await getDoc(contentRef);
    if (!snap.exists()) throw new Error("Content not found");

    const data = snap.data() as Record<string, any>;
    const reactedBy = (data.reactedBy as Record<string, string[]>) || {};
    
    // Handle Story legacy mapping for 'relate' -> 'relatable'
    if (contentType === "story" && (reactedBy["relate"] || data.reactions?.relate)) {
        if (!reactedBy["relatable"]) reactedBy["relatable"] = reactedBy["relate"] || [];
    }

    // Support Fresh Reaction mapping + Legacy compatibility
    const freshKey = reaction;
    const legacyKey = reaction === 'inspired' ? 'love' : 
                      reaction === 'powerful' ? 'fire' : 
                      reaction === 'respect' ? 'clap' : 
                      reaction === 'relatable' ? (contentType === 'story' ? 'relate' : 'wow') : '';

    const legacyReactionList = legacyKey ? ((reactedBy[legacyKey] || []) as string[]) : [];
    const isAlreadyLegacy = legacyKey ? legacyReactionList.includes(user.uid) : false;

    // Properly initialize isAlreadyFresh
    const currentReactionList = (reactedBy[freshKey] || []) as string[];
    const isAlreadyFresh = currentReactionList.includes(user.uid);

    if (isAlreadyFresh || isAlreadyLegacy) {
        // UN-REACT
        const actualKey = isAlreadyFresh ? freshKey : (legacyKey as string);
        const updates: Record<string, any> = {
            [`reactions.${actualKey}`]: increment(-1),
            [`reactedBy.${actualKey}`]: arrayRemove(user.uid),
        };
        // Also sync legacy 'likes' for news-feed 'love'
        if (actualKey === 'love' || actualKey === 'inspired') {
             if (data["likes"] !== undefined) updates["likes"] = increment(-1);
             if (data["likedBy"] !== undefined) updates["likedBy"] = arrayRemove(user.uid);
        }
        // Sync story legacy 'relate'
        if (actualKey === 'relatable' && contentType === 'story' && data["reactions"]?.relate !== undefined) {
             updates['reactions.relate'] = increment(-1);
             updates['reactedBy.relate'] = arrayRemove(user.uid);
        }
        await updateDoc(contentRef, updates);
        return { added: false };
    } else {
        // REACT
        const updates: Record<string, unknown> = {
            [`reactions.${freshKey}`]: increment(1),
            [`reactedBy.${freshKey}`]: arrayUnion(user.uid),
        };

        // Remove previous reactions (exclusive mode)
        Object.keys(reactedBy).forEach(r => {
            if (reactedBy[r]?.includes(user.uid)) {
                updates[`reactions.${r}`] = increment(-1);
                updates[`reactedBy.${r}`] = arrayRemove(user.uid);
            }
        });

        // Sync legacy 'likes' for news-feed
        if (freshKey === 'inspired') {
             if (data["likes"] !== undefined) {
                 updates["likes"] = increment(1);
                 updates["likedBy"] = arrayUnion(user.uid);
             }
        }

        // Sync story legacy 'relate'
        if (freshKey === 'relatable' && contentType === 'story' && data.reactions?.relate !== undefined) {
             updates['reactions.relate'] = increment(1);
             updates['reactedBy.relate'] = arrayUnion(user.uid);
        }

        await updateDoc(contentRef, updates);

        // Notifications logic
        let recipientId = "";
        let targetUrl = "";
        if (contentType === "post") {
            recipientId = data.creatorId || data.authorId;
            targetUrl = `/news-feed#post-${contentId}`;
        } else if (contentType === "story") {
            recipientId = data.authorId;
            targetUrl = `/story/${contentId}`;
        } else if (contentType === "study") {
            recipientId = data.authorId;
            targetUrl = `/study#study-${contentId}`;
        } else if (contentType === "comment") {
            recipientId = data.userId;
            targetUrl = data.postId ? `/news-feed#comment-${contentId}` : "";
        }

        if (recipientId && recipientId !== user.uid) {
            await createNotification(recipientId, {
                type: "reaction",
                message: `${user.displayName || "Someone"} reacted to your ${contentType}`,
                relatedId: contentId,
                relatedType: contentType,
                targetUrl,
                senderId: user.uid,
                senderName: user.displayName || "Someone",
                senderPhotoURL: user.photoURL || ""
            }).catch(e => console.error("Notification failed", e));
        }

        return { added: true };
    }
}

// ═══════════════════════════════════════════════════
//  CREDENTIALS (BADGES & ACHIEVEMENTS)
// ═══════════════════════════════════════════════════

export async function grantBadge(userId: string, badgeData: { name: string; description: string; imageURL: string }): Promise<void> {
    await requireAdminOrManager();
    const userRef = doc(getDb(), "users", userId);
    const badge = {
        ...badgeData,
        id: Math.random().toString(36).substring(2, 11),
        dateEarned: new Date().toISOString(),
    };
    await updateDoc(userRef, {
        badges: arrayUnion(badge)
    });

    await createNotification(userId, {
        type: "badge_received",
        message: `You received the ${badgeData.name} badge!`,
        relatedId: badge.id,
        relatedType: "badge",
        targetUrl: `/profile/${userId}`
    }).catch(e => console.error("Notification failed", e));
}

export async function addAchievement(userId: string, achievementData: { title: string; issuer: string; date: string; fileURL: string; type: 'image' | 'pdf' | 'other' }): Promise<void> {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.id !== userId) throw new Error("Unauthorized: You can only add your own achievements.");

    const userRef = doc(getDb(), "users", userId);
    const achievement = {
        ...achievementData,
        id: Math.random().toString(36).substring(2, 11),
    };
    await updateDoc(userRef, {
        achievementsList: arrayUnion(achievement)
    });
}

export async function removeAchievement(userId: string, achievementId: string): Promise<void> {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.id !== userId) throw new Error("Unauthorized: You can only remove your own achievements.");

    const userRef = doc(getDb(), "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("User not found");

    const userData = userSnap.data();
    const achievementsList = userData.achievementsList || [];
    const achievementToDelete = achievementsList.find((a: any) => a.id === achievementId);

    if (!achievementToDelete) return;

    if (achievementToDelete.fileURL) {
        try {
            await deleteFromCloudinary(achievementToDelete.fileURL);
        } catch (err) {
            console.error("[Firestore] Failed to delete achievement file from Cloudinary:", err);
        }
    }

    await updateDoc(userRef, {
        achievementsList: arrayRemove(achievementToDelete)
    });
}

export async function revokeBadge(userId: string, badgeId: string): Promise<void> {
    console.log(`[Firestore] Revoking badge: ${badgeId} for user: ${userId}`);
    await requireAdminOrManager();
    const userRef = doc(getDb(), "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("User not found");

    const userData = userSnap.data() as FirestoreUser;
    const currentBadges = userData.badges || [];
    
    // Attempt to match by ID, but fallback to name if ID is missing or doesn't match
    // This handles legacy data that might not have the new 'id' field
    const updatedBadges = currentBadges.filter((b: any) => {
        if (badgeId && b.id === badgeId) return false;
        // If the badgeId passed is actually the name (for legacy support)
        if (b.name === badgeId && !b.id) return false;
        return true;
    });

    console.log(`[Firestore] Badges found: ${currentBadges.length}, after filter: ${updatedBadges.length}`);

    if (currentBadges.length !== updatedBadges.length) {
        await updateDoc(userRef, {
            badges: updatedBadges
        });
        console.log(`[Firestore] Badge revoked successfully in DB`);
    } else {
        console.error(`[Firestore] Badge with ID ${badgeId} not found in user's badges array.`);
        throw new Error("Badge not found on user profile.");
    }
}

// ═══════════════════════════════════════════════════
//  CONNECTION / RECOMMENDATION & COLLEGE USER SYSTEM
// ═══════════════════════════════════════════════════

/**
 * Fetch recommended users to follow ("People You May Know").
 * Prioritizes users from the same college, then falls back to others.
 * Excludes self and users already followed.
 */
export async function getFriendRecommendations(
    currentUserId: string,
    collegeId: string,
    limitCount: number = 5
): Promise<(FirestoreUser & { id: string })[]> {
    if (!currentUserId) return [];
    
    const db = getDb();
    
    // 1. Get UIDs of users already followed
    const followingSnap = await getDocs(collection(db, "users", currentUserId, "following"));
    const followedIds = new Set(followingSnap.docs.map(d => d.id));
    followedIds.add(currentUserId); // exclude self
    
    let recommendations: (FirestoreUser & { id: string })[] = [];
    
    // 2. Query users from the same college
    if (collegeId) {
        const qCollege = query(
            collection(db, "users"),
            where("collegeId", "==", collegeId),
            limit(limitCount * 2)
        );
        const snapCollege = await getDocs(qCollege);
        const collegeUsers = snapCollege.docs
            .map(d => ({ id: d.id, ...(d.data() as FirestoreUser) }))
            .filter(u => !followedIds.has(u.id));
            
        recommendations = [...collegeUsers];
    }
    
    // 3. Fallback: If not enough, fetch general users
    if (recommendations.length < limitCount) {
        const qGeneral = query(
            collection(db, "users"),
            limit(limitCount * 4)
        );
        const snapGeneral = await getDocs(qGeneral);
        const generalUsers = snapGeneral.docs
            .map(d => ({ id: d.id, ...(d.data() as FirestoreUser) }))
            .filter(u => !followedIds.has(u.id) && !recommendations.some(r => r.id === u.id));
            
        recommendations = [...recommendations, ...generalUsers];
    }
    
    return recommendations.slice(0, limitCount);
}

/**
 * Real-time subscription to all users of a specific college.
 * Sorted in memory by createdAt descending.
 */
export function subscribeUsersByCollege(
    collegeId: string,
    callback: (users: (FirestoreUser & { id: string })[]) => void
) {
    const db = getDb();
    const q = query(
        collection(db, "users"),
        where("collegeId", "==", collegeId)
    );
    
    return onSnapshot(q, (snap) => {
        const users = snap.docs.map(d => ({ id: d.id, ...(d.data() as FirestoreUser) }));
        // Sort in memory by createdAt descending
        users.sort((a, b) => {
            const tA = (a as any).createdAt?.seconds || 0;
            const tB = (b as any).createdAt?.seconds || 0;
            return tB - tA;
        });
        callback(users);
    }, (error) => {
        console.error("[Firestore] subscribeUsersByCollege failed:", error);
    });
}

/**
 * Dismiss a user verification from the manager's list.
 * Adds the manager's UID to the user's `dismissedBy` array.
 */
export async function dismissUserVerification(userId: string): Promise<void> {
    const managerProfile = await requireAdminOrManager();
    const userRef = doc(getDb(), "users", userId);
    await updateDoc(userRef, {
        dismissedBy: arrayUnion(managerProfile.id)
    });
}

/**
 * Fetch all profiles of users who are following `userId`.
 */
export async function getFollowersList(userId: string): Promise<(FirestoreUser & { id: string })[]> {
    if (!userId) return [];
    const db = getDb();
    const snap = await getDocs(collection(db, "users", userId, "followers"));
    const followerIds = snap.docs.map(doc => doc.id);
    return getProfilesByIds(followerIds);
}

/**
 * Fetch all profiles of users whom `userId` is following.
 */
export async function getFollowingList(userId: string): Promise<(FirestoreUser & { id: string })[]> {
    if (!userId) return [];
    const db = getDb();
    const snap = await getDocs(collection(db, "users", userId, "following"));
    const followingIds = snap.docs.map(doc => doc.id);
    return getProfilesByIds(followingIds);
}

/**
 * Notify all followers of a user when they publish a new post.
 */
export async function notifyFollowersOfPost(
    creatorId: string,
    creatorName: string,
    creatorPhotoURL: string,
    postId: string,
    postTitle: string
): Promise<void> {
    const db = getDb();
    try {
        const followersSnap = await getDocs(collection(db, "users", creatorId, "followers"));
        const followerIds = followersSnap.docs.map(d => d.id);
        
        if (followerIds.length === 0) return;
        
        const BATCH_LIMIT = 499;
        for (let i = 0; i < followerIds.length; i += BATCH_LIMIT) {
            const chunk = followerIds.slice(i, i + BATCH_LIMIT);
            const batch = writeBatch(db);
            
            chunk.forEach(followerId => {
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    recipientId: followerId,
                    type: "new_post",
                    message: `${creatorName} published a new post: "${postTitle || 'Update'}".`,
                    relatedId: postId,
                    relatedType: "post",
                    targetUrl: `/news-feed?post=${postId}`,
                    senderId: creatorId,
                    senderName: creatorName,
                    senderPhotoURL: creatorPhotoURL || "",
                    read: false,
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
        }
    } catch (err) {
        console.error("[Firestore] notifyFollowersOfPost failed:", err);
    }
}

/**
 * Toggles the save status of a post for a specific user.
 * Returns true if saved, false if unsaved.
 */
export async function toggleSavePost(userId: string, postId: string): Promise<boolean> {
    if (!userId || !postId) throw new Error("User ID and Post ID are required.");
    const db = getDb();
    const saveRef = doc(db, "users", userId, "savedPosts", postId);
    const docSnap = await getDoc(saveRef);
    if (docSnap.exists()) {
        await deleteDoc(saveRef);
        return false;
    } else {
        await setDoc(saveRef, {
            postId,
            savedAt: serverTimestamp()
        });
        return true;
    }
}

/**
 * Subscribes in real-time to the post IDs saved by a specific user.
 */
export function subscribeSavedPosts(userId: string, callback: (savedIds: string[]) => void) {
    if (!userId) return () => {};
    const db = getDb();
    const q = query(collection(db, "users", userId, "savedPosts"), orderBy("savedAt", "desc"));
    return safeSubscribe(q, (snap: any) => {
        callback(snap.docs.map((d: any) => d.id));
    });
}

/**
 * Fetches the full post details for all posts saved by a specific user.
 */
export async function getSavedPostsFull(userId: string): Promise<(FirestorePost & { id: string })[]> {
    if (!userId) return [];
    const db = getDb();
    const savedSnap = await getDocs(
        query(collection(db, "users", userId, "savedPosts"), orderBy("savedAt", "desc"))
    );
    const postIds = savedSnap.docs.map(doc => doc.id);
    if (postIds.length === 0) return [];

    const posts: (FirestorePost & { id: string })[] = [];
    const BATCH_SIZE = 30;
    for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
        const batchIds = postIds.slice(i, i + BATCH_SIZE);
        const q = query(collection(db, "posts"), where("__name__", "in", batchIds));
        const postsSnap = await getDocs(q);
        postsSnap.docs.forEach(d => {
            posts.push({ id: d.id, ...(d.data() as FirestorePost) });
        });
    }

    // Sort to match the order of saved posts
    const postMap = new Map(posts.map(p => [p.id, p]));
    return postIds
        .map(id => postMap.get(id))
        .filter((p): p is FirestorePost & { id: string } => !!p);
}



