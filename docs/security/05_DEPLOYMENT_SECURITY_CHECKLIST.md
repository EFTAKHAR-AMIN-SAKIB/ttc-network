# TTC NETWORK — Production Deployment Security Checklist
**Document ID:** `SEC-CHK-005`  
**Date:** October 25, 2026  
**Status:** READY FOR OPERATIONAL ROLLOUT  
**Target:** `ttc-network`  

---

## 1. Pre-Deployment Quality & Security Gates

Prior to merging or deploying any security patch to production, every check in this section must pass locally and in CI/CD.

- [ ] **TypeScript Strict Compilation:**
  - Command: `npx tsc --noEmit`
  - Acceptance Criteria: Exit code 0 with 0 errors.
  - Verification: `next.config.mjs` must have `typescript.ignoreBuildErrors: false`.
- [ ] **ESLint Verification:**
  - Command: `npm run lint`
  - Acceptance Criteria: Exit code 0 with no security-critical warnings.
  - Verification: `next.config.mjs` must have `eslint.ignoreDuringBuilds: false`.
- [ ] **Production Next.js Build:**
  - Command: `npm run build`
  - Acceptance Criteria: Successful build output; all static chunks, API routes, and Service Worker bundles generated without failure.
- [ ] **Dependency Vulnerability Threshold:**
  - Command: `npm audit`
  - Acceptance Criteria: 0 Critical and 0 High vulnerabilities remaining.
- [ ] **Git Working Tree Audit:**
  - Command: `git status`
  - Acceptance Criteria: No untracked `.env` files, temporary scripts, or credentials committed.

---

## 2. Environment Variables & Secret Configuration

Verify in the Vercel Project Settings (Settings $\rightarrow$ Environment Variables) that the following variables are securely configured for **Production** and **Preview** environments:

| Environment Variable | Secret Scope | Description | Verification Check |
| :--- | :--- | :--- | :---: |
| `CRON_SECRET` | Vercel Cron Secret | Cryptographic bearer token for scheduled jobs | Required for `/api/notices/auto-cleanup` |
| `SESSION_SECRET` | HMAC Signing Secret | High-entropy random secret (min 32 bytes) | Required for signing admin role cookies |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Server-Side Only | Google Service Account Private Key | Ensure no escaped newline corruption |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server-Side Only | Google Service Account Email | Valid service account identity |
| `R2_ACCESS_KEY_ID` | Server-Side Only | Cloudflare R2 S3 API Key ID | Verified bucket write access |
| `R2_SECRET_ACCESS_KEY` | Server-Side Only | Cloudflare R2 S3 Secret Access Key | Stored securely in Vercel |
| `CLOUDINARY_API_SECRET` | Server-Side Only | Cloudinary Media API Secret | Restrict access to authorized administrators |
| `SMTP_PASSWORD` | Server-Side Only | Gmail App Password for transactional emails | Space-stripped, valid application password |

> [!WARNING]
> Never set server-side credentials with the `NEXT_PUBLIC_` prefix. `NEXT_PUBLIC_` variables are inlined into client JavaScript bundles and visible to all users.

---

## 3. Database & Storage Rules Deployment

Firestore and Storage rules must be deployed via Firebase CLI (`npx firebase deploy --only firestore:rules,storage:rules`) after passing local test suites:

- [ ] **Dry-Run Rules Verification:**
  - Verify that `firestore.rules` passes syntax check:
    ```bash
    npx firebase deploy --only firestore:rules --dry-run
    ```
- [ ] **Firestore Rules Deployment:**
  - Command: `npx firebase deploy --only firestore:rules`
- [ ] **Storage Rules Deployment:**
  - Command: `npx firebase deploy --only storage:rules`
- [ ] **Production Live Sanity Test:**
  - Attempt an unauthorized write using an anonymous client to confirm rejection.
  - Verify that an authenticated student can read the news feed and create a standard post.

---

## 4. Production Smoke & Regression Testing

After deployment to production (`https://ttcnetwork.xyz`), execute the following manual smoke tests:

1. **User Authentication Flow:**
   - Log in with student credentials $\rightarrow$ home page and news feed load seamlessly.
   - Profile information renders correctly.
2. **Administrative Access Boundary:**
   - Navigate to `/admin` as student $\rightarrow$ immediate redirect to `/login` or `/`.
   - Log in with verified admin credentials $\rightarrow$ admin dashboard loads with appropriate permissions tab.
3. **PWA & Offline Integrity:**
   - Verify Service Worker registers (`sw.js` 200 OK).
   - Test offline banner on network disconnect.
4. **Media Upload & Viewing:**
   - Test image attachment on a test post $\rightarrow$ uploads to R2/Cloudinary and displays properly in news feed.
5. **Notice Auto-Cleanup Verification:**
   - Verify Vercel Cron executes at scheduled time (`0 2 * * *`) and returns `200 OK` with valid `CRON_SECRET`.

---

## 5. Rollback & Contingency Plan

If an unexpected regression occurs in production:

1. **Next.js Application Rollback:**
   - In Vercel Dashboard $\rightarrow$ Deployments $\rightarrow$ select previous stable deployment (`commit 3692a41`) $\rightarrow$ click **Promote to Production** (instant zero-downtime rollback).
2. **Firestore Rules Rollback:**
   - Keep a backup of `firestore.rules.bak`. If rules break legitimate queries:
     ```bash
     git checkout HEAD~1 -- firestore.rules storage.rules
     npx firebase deploy --only firestore:rules,storage:rules
     ```
3. **Incident Escalation:**
   - Follow `docs/security/06_INCIDENT_RESPONSE.md`.
