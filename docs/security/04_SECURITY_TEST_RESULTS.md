# TTC NETWORK — Security Test Results & Verification Log
**Document ID:** `SEC-TST-004`  
**Date:** October 25, 2026  
**Status:** DISCOVERY & BASELINE VERIFICATION COMPLETE (Stage A)  
**Target:** `ttc-network`  

---

## 1. Test Environment & Tooling

- **Host OS:** Windows (PowerShell Shell Environment)
- **Node.js Version:** `v22.19.0`
- **Next.js Version:** `14.2.35`
- **Firebase CLI Version:** `15.8.0` (`npx firebase`)
- **TypeScript Compiler:** `tsc` (TypeScript 5.x)
- **Linter:** ESLint 8.x (`next lint`)
- **Test Baseline:** Clean Git Working Tree (`origin/main`, commit `3692a41`)

---

## 2. Baseline Test Results & Diagnostic Findings

### 2.1 Static Type Checking (`npx tsc --noEmit`)
- **Command:** `npx tsc --noEmit`
- **Result:** FAILED (1 error found)
- **Log Extract:**
  ```text
  src/app/notice/page.tsx(156,49): error TS2339: Property 'toDate' does not exist on type 
  'string | number | Date | { toDate?: (() => Date) | undefined; }'.
  ```
- **Analysis:**
  A single type error in notice deadline parsing led previous developers to set `typescript.ignoreBuildErrors: true` in `next.config.mjs`. Resolving this type casting error allows re-enabling strict TypeScript compilation as a production gate.

### 2.2 Dependency Security Audit (`npm audit`)
- **Command:** `npm audit`
- **Result:** 38 vulnerabilities identified (2 Low, 9 Moderate, 25 High, 2 Critical)
- **Key Vulnerability Findings:**
  1. `websocket-driver` (<=0.7.4): **CRITICAL** (GHSA-mp7j-qc5w-4988, GHSA-xv26-6w52-cph6).
  2. `axios` (1.0.0 - 1.19.0): **HIGH** (Prototype pollution, SSRF bypass via RFC 1122 loopback subnets, CRLF injection).
  3. `@grpc/grpc-js` (<=1.13.5): **HIGH** (Malformed message denial of service).
  4. `@fastify/busboy` (<=3.2.1): **HIGH** (CRLF injection via multipart headers).
- **Remediation Strategy:** Run non-breaking security updates via `npm audit fix` while verifying that Next.js 14 and Firebase 11 remain functional.

### 2.3 Environmental Secrets Exposure Scan
- **Command:** Scanned `ttc-network/src` for references to `process.env.*` secrets.
- **Result:** PASSED.
- **Evidence:**
  - All occurrences of `FIREBASE_ADMIN_PRIVATE_KEY`, `CLOUDINARY_API_SECRET`, `R2_SECRET_ACCESS_KEY`, and `SMTP_PASSWORD` reside strictly inside server routes (`src/app/api/**`), server actions (`src/lib/actions.ts`), and server libraries (`src/lib/server-*.ts`).
  - No server-side secrets are prefixed with `NEXT_PUBLIC_` or bundled into client code.

---

## 3. Vulnerability Verification Matrix

| Vulnerability ID | Description | Severity | Verification Method | Status |
| :--- | :--- | :---: | :--- | :--- |
| **P0-A** | Privilege Escalation in `users/{userId}` create/update | **CRITICAL** | Source inspection & AST analysis (`firestore.rules` L84-94) | **CONFIRMED — UNFIXED** |
| **P0-B** | Admin Middleware Bypass via unverified `ttc_role` cookie | **CRITICAL** | Code trace in `middleware.ts` & `AuthContext.tsx` | **CONFIRMED — UNFIXED** |
| **P0-C** | Group Membership Infiltration & Role Escalation | **HIGH** | Source inspection (`firestore.rules` L226-272) | **CONFIRMED — UNFIXED** |
| **P0-D** | Missing Authentication in Server Actions (`actions.ts`) | **CRITICAL** | Code trace in `src/lib/actions.ts` | **CONFIRMED — UNFIXED** |
| **P1-A** | Student Phone/Email/Push Token Data Exposure | **HIGH** | Schema review & `firestore.rules` L85 evaluation | **CONFIRMED — UNFIXED** |
| **P1-B** | Excessive Write Access in Firebase Storage | **HIGH** | Source inspection (`storage.rules` L32-75) | **CONFIRMED — UNFIXED** |
| **P1-C** | Unauthenticated Notice Cleanup Endpoint | **HIGH** | HTTP method & auth trace in `api/notices/auto-cleanup` | **CONFIRMED — UNFIXED** |
| **P1-D** | IDOR in Media Deletion & Overwrite | **HIGH** | Code trace in `api/upload/delete` & `api/upload` | **CONFIRMED — UNFIXED** |
| **P1-E** | Unauthenticated Push Notification Dispatch | **CRITICAL** | Code trace in `api/send-push` & `api/register-push` | **CONFIRMED — UNFIXED** |
| **P1-F** | SSRF & Memory Exhaustion in Link Preview | **MEDIUM** | Code trace in `api/link-preview/route.ts` | **CONFIRMED — UNFIXED** |
| **P2-A** | Unauthenticated Email Change & Password Flooding | **MEDIUM** | Code trace in `api/auth/*` | **CONFIRMED — UNFIXED** |
| **P2-B** | Production Build Quality Gates Disabled | **MEDIUM** | Source inspection in `next.config.mjs` | **CONFIRMED — UNFIXED** |
| **P2-C** | Missing Content Security Policy Header | **MEDIUM** | Header inspection in `next.config.mjs` | **CONFIRMED — UNFIXED** |
| **P2-D** | 38 Vulnerable Dependencies in Supply Chain | **HIGH** | `npm audit` report analysis | **CONFIRMED — UNFIXED** |

---

## 4. Planned Automated Test Suite for Stage C & D

1. **Firebase Security Rules Automated Suite:**
   - Script: `scripts/test-rules.ts` executing rules tests against local Firestore and Storage emulators using `@firebase/rules-unit-testing`.
   - Positive and negative authorization tests for all collections and paths.
2. **Next.js API Route Integration Tests:**
   - Synthetic HTTP requests simulating unauthenticated, student, manager, and administrator identities.
   - Negative security tests verifying 401 Unauthorized / 403 Forbidden on privileged endpoints.
3. **End-to-End Functional Regression Tests:**
   - Post creation, story reactions, comment submissions, group navigation, and profile loading to guarantee zero functional regression.
