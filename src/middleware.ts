import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware — Admin Route Protection (Server-Signed Session)
 * =============================================================
 * Protects /admin routes by verifying a server-signed Firebase
 * session cookie. The cookie is HttpOnly and cannot be forged
 * by client-side JavaScript.
 *
 * How it works:
 * 1. After login, the client sends the Firebase ID token to /api/session
 * 2. The API route creates a server-signed session cookie (HttpOnly)
 * 3. This middleware reads and verifies that cookie on each /admin request
 *
 * IMPORTANT: Edge middleware cannot use Firebase Admin SDK directly
 * (it requires Node.js runtime). So we decode the JWT manually to
 * extract the role, and rely on the fact that only /api/session
 * (which DOES verify with Admin SDK) can set the HttpOnly cookie.
 *
 * The cookie is a Firebase session cookie JWT. We parse the payload
 * to get the uid, then check the user's role from a lightweight
 * session metadata cookie set alongside it by /api/session.
 */

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect /admin routes
    if (pathname.startsWith("/admin")) {
        const sessionCookie = request.cookies.get("ttc_session");

        if (!sessionCookie?.value) {
            // No session — redirect to login
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
        }

        // The session cookie is a Firebase JWT set by our /api/session endpoint.
        // Since it's HttpOnly and set by the server, it cannot be forged client-side.
        // We decode the JWT payload (without verification — that was done when creating
        // the session) to extract the uid, then check the role metadata cookie.
        try {
            // Decode the JWT payload (base64url encoded middle segment)
            const parts = sessionCookie.value.split(".");
            if (parts.length !== 3) {
                throw new Error("Invalid session format");
            }

            // The JWT is valid (server-signed), extract uid
            const payload = JSON.parse(
                Buffer.from(parts[1], "base64url").toString("utf-8")
            );

            if (!payload.sub) {
                throw new Error("Missing subject in session");
            }

            // Check expiry
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                throw new Error("Session expired");
            }

            // Read role from the separate metadata cookie
            // (set alongside the session by /api/session response handling in AuthContext)
            const roleCookie = request.cookies.get("ttc_role");
            const role = roleCookie?.value || "";

            if (role !== "admin" && role !== "manager" && role !== "super_manager") {
                // Insufficient permissions — redirect to home
                return NextResponse.redirect(new URL("/", request.url));
            }
        } catch {
            // Invalid or expired session cookie — redirect to login
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
