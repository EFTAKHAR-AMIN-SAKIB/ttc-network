# TTC NETWORK — Comprehensive Authorization Matrix
**Document ID:** `SEC-MTX-003`  
**Date:** October 25, 2026  
**Status:** DEFINITIVE SPECIFICATION  
**Target:** `ttc-network`  

---

## 1. Application Roles & Identities

| Role Identifier | Role Name | Scope & Authority |
| :--- | :--- | :--- |
| `guest` | Unauthenticated Visitor | Read public posts, public notices, study resources, college info, Q&A |
| `student` | Registered Student | Create posts, comments, stories, join public groups, request campus manager |
| `student_verified` | Verified TTC Student | Full student access + priority badge, verified badge |
| `teacher` | Faculty / Educator | Student permissions + edit own college profile info, verify students |
| `manager` | College Campus Manager | Manage own college profile, clubs, notices, reviews for own college |
| `super_manager` | Regional Manager | Cross-college moderation, college management, campus manager approvals |
| `admin` | Super Administrator | Full platform authority, user deletion, role assignments, system settings |
| `group_member` | Group Member | Read & post in joined group, comment on group discussions |
| `group_mod` | Group Moderator | Moderate group posts, approve membership requests, delete offending content |
| `group_admin` | Group Administrator | Full group control, update group settings, appoint moderators, disband group |
| `banned` | Restricted User | Read-only public access; write operations blocked across all collections |

---

## 2. Cloud Firestore Resource Permission Matrix

| Resource / Collection | Operation | Guest | Student / Teacher | College Manager | Super Admin | Enforced By |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`users/{userId}`** | Read Public | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | `firestore.rules` |
| **`users/{userId}/private`** | Read Private | ❌ No | ✅ Own Only | ❌ No | ✅ Yes | `firestore.rules` |
| **`users/{userId}`** | Create | ❌ No | ✅ Safe Fields | ❌ No | ✅ Yes | `firestore.rules` |
| **`users/{userId}`** | Update Non-Privileged | ❌ No | ✅ Own Only | ❌ No | ✅ Yes | `firestore.rules` |
| **`users/{userId}`** | Update Role/Verification | ❌ No | ❌ Denied | ❌ Denied | ✅ Admin Only | Server Admin SDK |
| **`users/{userId}`** | Delete Account | ❌ No | ✅ Own (via API) | ❌ Denied | ✅ Yes (via API) | `api/auth/delete-account` |
| **`colleges/{collegeId}`** | Read | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | `firestore.rules` |
| **`colleges/{collegeId}`** | Update Info | ❌ No | ❌ No (Teacher: own) | ✅ Own College | ✅ All Colleges | `firestore.rules` / Admin SDK |
| **`posts/{postId}`** | Read | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | `firestore.rules` |
| **`posts/{postId}`** | Create | ❌ No | ✅ Verified/Active | ✅ Yes | ✅ Yes | `firestore.rules` |
| **`posts/{postId}`** | Update Own | ❌ No | ✅ Creator Only | ✅ Creator Only | ✅ Creator Only | `firestore.rules` |
| **`posts/{postId}`** | Moderate/Delete | ❌ No | ❌ No | ✅ Own College | ✅ All Posts | `firestore.rules` |
| **`stories/{storyId}`** | Create / Update Own | ❌ No | ✅ Own Only | ✅ Own Only | ✅ Own Only | `firestore.rules` |
| **`stories/{storyId}`** | Delete | ❌ No | ✅ Own Only | ✅ Yes | ✅ Yes | `firestore.rules` |
| **`groups/{groupId}`** | Read Public | ❌ No | ✅ Auth Only | ✅ Yes | ✅ Yes | `firestore.rules` |
| **`groups/{groupId}`** | Read Secret | ❌ No | ❌ (Member Only) | ❌ (Member Only) | ✅ Admin Only | `firestore.rules` |
| **`groups/.../members`** | Join Public Group | ❌ No | ✅ As "member" | ✅ As "member" | ✅ Yes | `firestore.rules` |
| **`groups/.../members`** | Join Private Group | ❌ No | ❌ Via Request | ❌ Via Request | ✅ Yes | `firestore.rules` |
| **`groups/.../members`** | Promote to Mod/Admin | ❌ No | ❌ Denied | ❌ Denied | ✅ Group Admin | `firestore.rules` |
| **`groupPosts/{postId}`** | Read / Post | ❌ No | ❌ (Member Only) | ❌ (Member Only) | ✅ Yes | `firestore.rules` |
| **`notices/{noticeId}`** | Read | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | `firestore.rules` |
| **`notices/{noticeId}`** | Create / Delete | ❌ No | ❌ Denied | ✅ Own College | ✅ All Colleges | `firestore.rules` |
| **`studyPosts/{postId}`** | Create / Update | ❌ No | ✅ Verified/Active | ✅ Yes | ✅ Yes | `firestore.rules` |
| **`campusManagerApplications`** | Create | ❌ No | ✅ Own Application | ❌ N/A | ❌ N/A | `firestore.rules` |
| **`campusManagerApplications`** | Review / Approve | ❌ No | ❌ Denied | ❌ Denied | ✅ Admin Only | `firestore.rules` |
| **`settings/{docId}`** | Write | ❌ No | ❌ Denied | ❌ Denied | ✅ Admin Only | `firestore.rules` |

---

## 3. Storage Resource Permission Matrix

| Storage Path / Bucket | Allowed MIME Types | Max Size | Read | Write / Upload | Deletion |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **`Firebase /avatars/{userId}/*`** | JPEG, PNG, WebP | 5 MB | Public | `isOwner(userId)` | `isOwner(userId)` or Admin |
| **`Firebase /userCovers/{userId}/*`** | JPEG, PNG, WebP | 10 MB | Public | `isOwner(userId)` | `isOwner(userId)` or Admin |
| **`Firebase /logos/{fileName}`** | JPEG, PNG, WebP, SVG | 5 MB | Public | Admin / Manager Only | Admin Only |
| **`Firebase /covers/{fileName}`** | JPEG, PNG, WebP | 10 MB | Public | Admin / Manager Only | Admin Only |
| **`Firebase /gallery/{collegeId}/*`** | JPEG, PNG, WebP | 10 MB | Public | Affiliated College Member | College Manager / Admin |
| **`Firebase /attachments/*`** | PDF, JPEG, PNG, WebP | 10 MB | Public | Admin / Manager Only | Admin Only |
| **`Cloudflare R2 /materials/*`** | PDF, DOCX, PPTX, XLSX, TXT | 50 MB | Public | Authenticated User | Owner or Admin |
| **`Cloudflare R2 /uploads/*`** | Images, Videos, PDF | 50 MB | Public | Authenticated User | Owner or Admin |
| **`Cloudflare R2 /branding/*`** | Images, WebP, SVG | 10 MB | Public | Admin Only | Admin Only |

---

## 4. API Endpoints & Server Action Authorization Matrix

| Endpoint / Action | Method | Required Auth Level | Role Required | Key Validations |
| :--- | :---: | :--- | :--- | :--- |
| **`/api/session`** | `POST` | Valid Firebase ID Token | Any | Creates server-signed `ttc_session` |
| **`/api/session`** | `DELETE` | Session Cookie | Any | Clears session cookie and role data |
| **`/api/admin/cleanup`** | `POST` | Verified Session | `admin`, `super_manager` | State-changing cleanup restricted |
| **`/api/admin/delete-user`** | `POST` | Verified Session | `admin` strictly | Cannot delete self; full purge |
| **`/api/auth/reset-password`** | `POST` | Public (Rate Limited) | Any | Generic response; 3 req/15 min |
| **`/api/auth/change-email`** | `POST` | Verified Session | Account Owner | Prevents anonymous flooding |
| **`/api/auth/delete-account`** | `POST` | Verified Session / Token | Caller `uid` strictly | Caller can only delete own account |
| **`/api/notices/auto-cleanup`** | `POST` | Vercel Cron or Admin | `CRON_SECRET` or `admin` | Blocks public execution |
| **`/api/register-push`** | `POST` | Verified Session | `decoded.uid === uid` | Blocks token hijacking |
| **`/api/send-push`** | `POST` | Verified Session | Admin or Event Trigger | Validates internal target URL |
| **`/api/link-preview`** | `GET` | Verified Session | Any Authenticated | SSRF filter, 2MB max, rate limited |
| **`/api/study/upload`** | `POST` | Verified Session | Any Authenticated | Safe MIME, 50MB max, unique key |
| **`/api/study/download`** | `GET` | Public (Allowed Domain) | Any | Whitelisted storage domains only |
| **`/api/upload`** | `POST` | Verified Session | Any Authenticated | No arbitrary `publicId` overwrite |
| **`/api/upload/delete`** | `POST` | Verified Session | Owner or Admin | Strictly verifies file ownership |
| **`createClubAction`** | Server Action | Verified Session | Manager (own) or Admin | Checked via session cookie |
| **`deleteClubAction`** | Server Action | Verified Session | Manager (own) or Admin | Checked via session cookie |
| **`seedDatabaseAction`** | Server Action | Verified Session | Super Admin strictly | Checked via session cookie |
