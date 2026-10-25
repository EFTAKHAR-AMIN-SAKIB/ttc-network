# TTC NETWORK — Security Remediation & Hardening Plan
**Document ID:** `SEC-PLAN-002`  
**Date:** October 25, 2026  
**Status:** PROPOSED & READY FOR CONTROLLED EXECUTION (Stage B)  
**Target:** `ttc-network`  

---

## 1. Overview & Remediation Strategy

This plan outlines the specific, incremental steps to remediate all confirmed security vulnerabilities across TTC NETWORK. Every task is prioritized by impact, preserves existing user functionality, and enforces security on trusted server boundaries and database rules rather than frontend restrictions.

### Principles of Execution:
1. **Zero Downtime & Zero Regression:** Do not break existing college workflows, PWA caching, social features, or user access.
2. **Backend Enforcement:** Never trust client-supplied roles, metadata cookies, or unverified claims.
3. **Small, Atomic Commits:** Implement one vulnerability fix at a time, followed by local verification before proceeding.
4. **Automated Verification:** Write unit tests and emulator test scripts for rules and endpoints to prove vulnerabilities are eliminated.

---

## 2. Prioritized Task Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Critical Privilege Boundaries
        T1["P0-A: Firestore User Creation & Role Hardening"]
        T2["P0-B: Admin Session & Cryptographic Middleware"]
        T3["P0-C: Group Permissions & Membership Rules"]
        T4["P0-D: Server Actions Authentication (actions.ts)"]
    end

    subgraph Phase 2: High Severity API & Storage Hardening
        T5["P1-E: Push Notification API Authentication (send-push / register-push)"]
        T6["P1-C: Notice Auto-Cleanup Cron Authorization (CRON_SECRET)"]
        T7["P1-B: Firebase Storage Least Privilege Rules"]
        T8["P1-D: Media Deletion & Upload IDOR Protection"]
        T9["P1-A: Student Profile PII Segregation"]
        T10["P1-F: Link Preview SSRF & Memory Limits"]
    end

    subgraph Phase 3: Infrastructure, Build & Dependencies
        T11["P2-A: Auth Rate Limiting & Account Enumeration Prevention"]
        T12["P2-B: Resolve Notice Type Error & Re-enable Build Gates"]
        T13["P2-C: Content Security Policy (CSP) Configuration"]
        T14["P2-D: Safe Dependency Updates (npm audit fix)"]
    end

    T1 --> T2 --> T3 --> T4
    T4 --> T5 --> T6 --> T7 --> T8 --> T9 --> T10
    T10 --> T11 --> T12 --> T13 --> T14
```

---

## 3. Detailed Remediation Specifications

### Phase 1: Critical Authorization & Session Boundaries

---

#### Task 1: Fix Firestore User Document Security (`P0-A`)
- **Vulnerability:** Unauthenticated or client-controlled role assignment and verification approval during user document creation/update.
- **Affected File:** `firestore.rules`
- **Root Cause:** `allow create: if isOwner(userId);` lacks field validations; `allow update` permits modifying `role` when `onboardingCompleted != true`.
- **Proposed Fix:**
  1. In `match /users/{userId}`:
     - On `create`: enforce that:
       - `request.resource.data.role in ['student', 'teacher']` (never `'admin'`, `'manager'`, `'super_manager'`)
       - `request.resource.data.roleVerified == false`
       - `request.resource.data.isBanned == false`
       - Sensitive administrative fields (`badges`, `supporterBadge`, `restrictions`) are omitted or default to safe initial states.
     - On `update`: strictly forbid modifying `role`, `roleVerified`, `isBanned`, `restrictions`, `badges`, `supporterBadge` by the user. Only allow these mutations via `isAdmin()` or `isAdminOrManager()` or trusted server-side Admin SDK operations.
- **Potential Compatibility Issues:** Normal onboarding must continue to set bio, college, year, and username. Verified that onboarding only sets non-privileged fields.
- **Verification Tests:**
  - Test 1: User creates document with `role: "admin"` $\rightarrow$ **DENIED**.
  - Test 2: User creates document with `roleVerified: true` $\rightarrow$ **DENIED**.
  - Test 3: User creates document with `role: "student"`, `roleVerified: false` $\rightarrow$ **ALLOWED**.
  - Test 4: Existing student updates `role` to `"admin"` during or after onboarding $\rightarrow$ **DENIED**.
  - Test 5: Existing student updates `bio` or `photoURL` $\rightarrow$ **ALLOWED**.

---

#### Task 2: Harden Administrative Route Middleware & Session Cookies (`P0-B`)
- **Vulnerability:** Middleware bypass via client-modifiable `ttc_role` cookie and unverified JWT token decoding.
- **Affected Files:** `src/middleware.ts`, `src/app/api/session/route.ts`, `src/contexts/AuthContext.tsx`
- **Root Cause:** Role is stored in an unverified client cookie (`document.cookie = "ttc_role=..."`) and checked in middleware without cryptographic verification.
- **Proposed Fix:**
  1. In `src/app/api/session/route.ts`:
     - When verifying the session and looking up the user role in Firestore, issue a second server-signed, `HttpOnly` cookie or cryptographically signed session token (e.g. `ttc_session_meta`) using a server-side HMAC secret (`SESSION_SECRET`) that seals `{ uid, role, collegeId, exp }`.
     - Set `httpOnly: true`, `secure: true`, `sameSite: "lax"`, `path: "/"`.
  2. In `src/middleware.ts`:
     - Verify the cryptographic signature of the metadata cookie using Web Crypto API (supported natively in Edge Runtime).
     - Check expiry timestamp and verify role is strictly `"admin"`, `"manager"`, or `"super_manager"`.
     - If invalid or signature fails, redirect immediately to `/login`.
  3. In `src/contexts/AuthContext.tsx`:
     - Remove setting `document.cookie = "ttc_role=..."`. The role for UI rendering is provided in JSON by the authenticated `/api/session` response or fetched via Firestore subscription.
- **Potential Compatibility Issues:** Admin navigation must be seamless. Tested with existing `/admin` routes.
- **Verification Tests:**
  - Test 1: Client sets `document.cookie = "ttc_role=admin"` and accesses `/admin` $\rightarrow$ **REDIRECTED TO /LOGIN**.
  - Test 2: Client provides expired or tampered session cookie $\rightarrow$ **REDIRECTED TO /LOGIN**.
  - Test 3: Legitimate admin with server-signed cookie accesses `/admin` $\rightarrow$ **ALLOWED (200 OK)**.

---

#### Task 3: Secure Group Membership & Role Controls (`P0-C`)
- **Vulnerability:** Arbitrary users can add themselves as members to any group (including private/secret groups), self-promote to group admin, or manipulate group settings.
- **Affected File:** `firestore.rules` (lines 226–272)
- **Root Cause:** `allow write` in `/groups/{groupId}/members/{userId}` evaluates `isOwner(userId)`, allowing self-assigning any role.
- **Proposed Fix:**
  1. In `match /groups/{groupId}/members/{userId}`:
     - Split `write` into separate `create`, `update`, and `delete` rules:
       - `create`:
         - If self-joining (`isOwner(userId)`): only permitted if group `privacyType == "public"`, and `request.resource.data.role == "member"`.
         - If adding another user: must be group admin/moderator, or global admin.
       - `update`:
         - Only permitted if caller is group admin or global admin. Members CANNOT modify their own group role.
       - `delete`:
         - Permitted if caller is group admin, or `isOwner(userId)` (leaving the group). Group members cannot remove group admins.
  2. In `match /groups/{groupId}`:
     - Replace `hasAny(['memberCount', 'postCount'])` with `hasOnly(['memberCount', 'postCount'])` and enforce integer increment rules ($\pm 1$).
- **Potential Compatibility Issues:** Public groups allow immediate joining; private groups require request approval. Both flows preserved.
- **Verification Tests:**
  - Test 1: User adds self to secret group $\rightarrow$ **DENIED**.
  - Test 2: User adds self to public group with `role: "admin"` $\rightarrow$ **DENIED**.
  - Test 3: User adds self to public group with `role: "member"` $\rightarrow$ **ALLOWED**.
  - Test 4: Member updates their own role to `"moderator"` $\rightarrow$ **DENIED**.
  - Test 5: Group admin promotes member to `"moderator"` $\rightarrow$ **ALLOWED**.

---

#### Task 4: Authenticate Server Actions in `src/lib/actions.ts` (`P0-D`)
- **Vulnerability:** Server Actions accept `uid` as an unverified function argument from the client and perform Admin SDK operations on behalf of that `uid`.
- **Affected File:** `src/lib/actions.ts`
- **Root Cause:** Missing cryptographic session verification inside Server Action handlers.
- **Proposed Fix:**
  1. Implement a helper `getAuthenticatedSession()` inside `src/lib/actions.ts`:
     ```typescript
     import { cookies } from "next/headers";
     import { adminAuth, adminDb } from "./firebase-admin";

     async function getAuthenticatedSession() {
         const sessionCookie = cookies().get("ttc_session")?.value;
         if (!sessionCookie || !adminAuth) throw new Error("Unauthorized");
         const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
         const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
         if (!userDoc.exists) throw new Error("User not found");
         return { uid: decoded.uid, ...userDoc.data() };
     }
     ```
  2. Refactor `seedDatabaseAction`, `createClubAction`, `deleteClubAction`, `updateClubAction`, `addGalleryPhotoAction`, and `deleteGalleryPhotoAction` to retrieve the authenticated caller via `getAuthenticatedSession()` rather than trusting client-supplied `uid`.
- **Potential Compatibility Issues:** Callers in the UI that pass `user.uid` will continue to function, but the server now enforces that the caller's session matches and possesses valid permissions.
- **Verification Tests:**
  - Test 1: Anonymous HTTP request invoking `seedDatabaseAction("<admin_uid>")` $\rightarrow$ **DENIED (Unauthorized)**.
  - Test 2: Student invoking `deleteClubAction("<admin_uid>", "<clubId>")` $\rightarrow$ **DENIED (Forbidden)**.
  - Test 3: Legitimate verified admin invoking `createClubAction` $\rightarrow$ **ALLOWED (Success)**.

---

### Phase 2: High Severity API & Storage Hardening

---

#### Task 5: Authenticate Push Notification Endpoints (`P1-E`)
- **Vulnerability:** Unauthenticated endpoints allow spamming push notifications to any user (`/api/send-push`) and token hijacking (`/api/register-push`).
- **Affected Files:** `src/app/api/send-push/route.ts`, `src/app/api/register-push/route.ts`
- **Proposed Fix:**
  1. In `src/app/api/register-push/route.ts`:
     - Verify `ttc_session` session cookie.
     - Ensure `decodedToken.uid === uid`. Reject requests attempting to register tokens for other users.
  2. In `src/app/api/send-push/route.ts`:
     - Require a valid session cookie.
     - Validate that the sender has legitimate reason to notify the recipient (e.g. sender is an admin, or the notification corresponds to a verified social interaction like a post comment/mention).
     - Sanitize `targetUrl` to ensure it only permits relative internal paths (e.g., `/news-feed`, `/story`, `/notice`), rejecting external URLs (`http://`, `https://`, `javascript:`) to eliminate phishing vectors.
- **Verification Tests:**
  - Test 1: Anonymous request to `/api/send-push` $\rightarrow$ **401 Unauthorized**.
  - Test 2: Request with `targetUrl: "https://evil.com/login"` $\rightarrow$ **400 Bad Request**.
  - Test 3: Legitimate authenticated comment notification with relative URL $\rightarrow$ **200 OK**.

---

#### Task 6: Secure Notice Auto-Cleanup Cron Job (`P1-C`)
- **Vulnerability:** Public, unauthenticated endpoint triggering automated file and notice deletion.
- **Affected Files:** `src/app/api/notices/auto-cleanup/route.ts`, `vercel.json`
- **Proposed Fix:**
  1. In `src/app/api/notices/auto-cleanup/route.ts`:
     - Require `Authorization: Bearer ${process.env.CRON_SECRET}` for automated cron triggers.
     - Allow manual invocation ONLY if the caller presents a verified session cookie with `role === "admin"`.
     - Disable destructive state mutations via ordinary public GET requests; require POST for state changes or enforce CRON authorization on both.
- **Verification Tests:**
  - Test 1: Public browser GET without secret $\rightarrow$ **401 Unauthorized**.
  - Test 2: Request with valid `Bearer ${CRON_SECRET}` $\rightarrow$ **200 OK**.

---

#### Task 7: Harden Firebase Storage Rules (`P1-B`)
- **Vulnerability:** Any authenticated user can overwrite college logos, college covers, and notice attachments.
- **Affected File:** `storage.rules`
- **Proposed Fix:**
  1. Restrict `/logos/{fileName}` and `/covers/{fileName}` write permissions to administrators and college managers:
     ```javascript
     function isStaff() {
       return isAuthenticated() && (
         request.auth.token.role in ['admin', 'manager', 'super_manager'] ||
         firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager', 'super_manager']
       );
     }
     ```
  2. In `/attachments/{fileName}`, restrict allowed MIME types to safe formats: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Prohibit HTML, SVG, scripts, and executable binaries.
  3. Require that `/gallery/{collegeId}/{fileName}` uploads verify college membership or admin rights.
- **Verification Tests:**
  - Test 1: Student uploads file to `/logos/feni.png` $\rightarrow$ **DENIED**.
  - Test 2: Student uploads `exploit.html` to `/attachments/` $\rightarrow$ **DENIED**.
  - Test 3: Admin uploads valid PDF to `/attachments/notice.pdf` $\rightarrow$ **ALLOWED**.

---

#### Task 8: Eliminate IDOR in File Upload & Deletion APIs (`P1-D`)
- **Vulnerability:** Any user can delete any other user's files via `/api/upload/delete` or overwrite files via `publicId` in `/api/upload`.
- **Affected Files:** `src/app/api/upload/delete/route.ts`, `src/app/api/upload/route.ts`
- **Proposed Fix:**
  1. In `/api/upload/delete`:
     - Check if the caller is an admin (`admin`, `manager`, `super_manager`).
     - If the caller is an ordinary user: verify that the key contains their own UID (e.g. `uploads/${callerUid}/...` or `avatars/${callerUid}/...`) or check ownership against Firestore before issuing `DeleteObjectCommand`.
  2. In `/api/upload`:
     - Disallow arbitrary `publicId` overrides from non-admin users. Generate collision-resistant unique filenames (`Date.now() + '-' + randomId()`) for all user uploads.
- **Verification Tests:**
  - Test 1: User A requests deletion of User B's avatar/post image $\rightarrow$ **403 Forbidden**.
  - Test 2: User A requests deletion of their own uploaded image $\rightarrow$ **200 OK**.
  - Test 3: User A attempts to overwrite `site_logo` via `publicId` $\rightarrow$ **403 Forbidden**.

---

#### Task 9: Student Profile Data Segregation (`P1-A`)
- **Vulnerability:** Unauthenticated public access to student phone numbers, email addresses, FCM push tokens, and moderation records.
- **Affected Files:** `firestore.rules`, `src/contexts/AuthContext.tsx`, `src/lib/firestore.ts`
- **Proposed Fix:**
  1. Segregate private student contact details and moderation metadata into `/users/{userId}/private/{docId}`:
     - `phone`, `whatsapp`, `fcmTokens`, `isBanned`, `banReason`, `restrictions`, `lockSettings`.
     - Rule for `/users/{userId}/private/{docId}`: `allow read, write: if isOwner(userId) || isAdmin();`.
  2. For the main `/users/{userId}` profile document:
     - Publicly readable fields: `displayName`, `photoURL`, `username`, `college`, `role`, `bio`, `yearSemester`, `socialLinks`.
     - For public visitors, sensitive contact details remain hidden unless explicitly made public by the user.
- **Verification Tests:**
  - Test 1: Unauthenticated visitor queries `/users/{userId}/private/data` $\rightarrow$ **DENIED**.
  - Test 2: Account owner reads their own private data $\rightarrow$ **ALLOWED**.
  - Test 3: Public reads user's public profile card $\rightarrow$ **ALLOWED**.

---

#### Task 10: Harden Link Preview API Against SSRF & OOM (`P1-F`)
- **Vulnerability:** SSRF risks with multi-homed DNS / IPv6-mapped addresses, and memory exhaustion from unbounded response downloads.
- **Affected File:** `src/app/api/link-preview/route.ts`
- **Proposed Fix:**
  1. Set Axios limits: `maxContentLength: 2 * 1024 * 1024` (2MB) and `maxBodyLength: 2 * 1024 * 1024`.
  2. Validate all resolved IP addresses across both IPv4 and IPv6 families in `safeLookup`.
  3. Validate `content-type` starts with `text/html` before parsing HTML.
  4. Add an in-memory or Redis-compatible rate limiter (10 requests/minute per authenticated user).
- **Verification Tests:**
  - Test 1: Request pointing to `http://169.254.169.254` or `http://[::ffff:127.0.0.1]` $\rightarrow$ **Blocked (400 Bad Request)**.
  - Test 2: Request to a 100MB file streaming server $\rightarrow$ **Truncated safely without crash**.
  - Test 3: Request to legitimate public website $\rightarrow$ **Preview generated (200 OK)**.

---

### Phase 3: Infrastructure, Build Quality & Dependencies

---

#### Task 11: Rate Limiting & Account Enumeration Prevention (`P2-A`)
- **Affected Files:** `src/app/api/auth/reset-password/route.ts`, `src/app/api/auth/change-email/route.ts`
- **Proposed Fix:**
  1. Require an authenticated session for `change-email`.
  2. Implement an IP/email rate limiter (max 3 requests per 15 minutes) for password reset.
  3. Ensure password reset always returns `{ success: true }` regardless of whether the email is registered.

---

#### Task 12: Re-enable TypeScript & ESLint Build Gates (`P2-B`)
- **Affected Files:** `next.config.mjs`, `src/app/notice/page.tsx`
- **Proposed Fix:**
  1. Fix the type check error in `src/app/notice/page.tsx` line 156 by properly casting Firestore timestamps:
     ```typescript
     const toDate = (val: any) => typeof val?.toDate === "function" ? val.toDate() : new Date(val);
     ```
  2. In `next.config.mjs`, set:
     ```javascript
     eslint: { ignoreDuringBuilds: false },
     typescript: { ignoreBuildErrors: false },
     ```
  3. Verify clean compilation with `npx tsc --noEmit`.

---

#### Task 13: Implement Content Security Policy (CSP) (`P2-C`)
- **Affected File:** `next.config.mjs`
- **Proposed Fix:**
  Add a strict Content Security Policy header allowing only trusted resources:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com`
  - `connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.cloudflarestorage.com https://*.r2.dev https://res.cloudinary.com`
  - `img-src 'self' data: blob: https://*.googleusercontent.com https://res.cloudinary.com https://*.r2.dev https://*.facebook.com https://images.unsplash.com`
  - `font-src 'self' data: https://fonts.gstatic.com`
  - `frame-ancestors 'none'`

---

#### Task 14: Patch Vulnerable Dependencies (`P2-D`)
- **Affected Files:** `package.json`, `package-lock.json`
- **Proposed Fix:**
  Run targeted, non-breaking dependency updates (`npm audit fix`) to upgrade `axios`, `websocket-driver`, and `@grpc/grpc-js` without breaking React 18 or Next.js 14 compatibility.

---

## 4. Execution Plan Summary Table

| Phase | Task | Title | Target File(s) | Risk Level |
| :---: | :---: | :--- | :--- | :---: |
| **1** | T1 | Firestore User Creation & Role Hardening | `firestore.rules` | High (Rules) |
| **1** | T2 | Admin Session & Cryptographic Middleware | `src/middleware.ts`, `src/app/api/session/route.ts` | Medium |
| **1** | T3 | Group Permissions & Membership Rules | `firestore.rules` | Medium (Rules) |
| **1** | T4 | Server Actions Authentication | `src/lib/actions.ts` | Medium |
| **2** | T5 | Push Notification API Authentication | `src/app/api/send-push/route.ts`, `src/app/api/register-push/route.ts` | Low |
| **2** | T6 | Notice Auto-Cleanup Cron Authorization | `src/app/api/notices/auto-cleanup/route.ts` | Low |
| **2** | T7 | Firebase Storage Least Privilege Rules | `storage.rules` | Medium (Rules) |
| **2** | T8 | Media Deletion & Upload IDOR Protection | `src/app/api/upload/delete/route.ts`, `src/app/api/upload/route.ts` | Medium |
| **2** | T9 | Student Profile PII Segregation | `firestore.rules`, `src/contexts/AuthContext.tsx` | Medium |
| **2** | T10 | Link Preview SSRF & Memory Limits | `src/app/api/link-preview/route.ts` | Low |
| **3** | T11 | Auth Rate Limiting & Account Enumeration | `src/app/api/auth/reset-password/route.ts`, `change-email` | Low |
| **3** | T12 | Re-enable TypeScript & ESLint Build Gates | `src/app/notice/page.tsx`, `next.config.mjs` | Low |
| **3** | T13 | Content Security Policy (CSP) Headers | `next.config.mjs` | Medium |
| **3** | T14 | Safe Dependency Updates | `package.json`, `package-lock.json` | Medium |
