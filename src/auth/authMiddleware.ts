import { randomBytes, timingSafeEqual } from "crypto";

// In-memory session store (in production, use Redis or a database)
const sessions = new Map<string, { createdAt: number; expiresAt: number }>();

// Session configuration
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_COOKIE_NAME = "aaa_session";

// Credentials from environment variables
function getUsername(): string {
    const username = process.env.DASHBOARD_USERNAME;
    if (!username) {
        console.warn(
            "[AUTH] WARNING: DASHBOARD_USERNAME environment variable is not set. Using default username 'admin'. Please set a secure username!"
        );
        return "admin";
    }
    return username;
}

function getPassword(): string {
    const password = process.env.DASHBOARD_PASSWORD;
    if (!password) {
        console.warn(
            "[AUTH] WARNING: DASHBOARD_PASSWORD environment variable is not set. Using default password 'admin'. Please set a secure password!"
        );
        return "admin";
    }
    return password;
}

/**
 * Generates a cryptographically secure session token
 */
export function generateSessionToken(): string {
    return randomBytes(32).toString("hex");
}

/**
 * Creates a new session and returns the token
 */
export function createSession(): string {
    const token = generateSessionToken();
    const now = Date.now();
    sessions.set(token, {
        createdAt: now,
        expiresAt: now + SESSION_DURATION_MS,
    });

    // Clean up expired sessions periodically
    cleanupExpiredSessions();

    return token;
}

/**
 * Validates a session token
 */
export function validateSession(token: string | null): boolean {
    if (!token) return false;

    const session = sessions.get(token);
    if (!session) return false;

    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return false;
    }

    return true;
}

/**
 * Invalidates a session (logout)
 */
export function invalidateSession(token: string): void {
    sessions.delete(token);
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(token);
        }
    }
}

/**
 * Securely compare a string using timing-safe comparison
 */
function timingSafeCompare(input: string, correct: string): boolean {
    // Use timing-safe comparison to prevent timing attacks
    // Pad both strings to same length to ensure constant-time comparison
    const maxLength = Math.max(input.length, correct.length);
    const paddedInput = input.padEnd(maxLength, "\0");
    const paddedCorrect = correct.padEnd(maxLength, "\0");

    try {
        return timingSafeEqual(
            Buffer.from(paddedInput, "utf8"),
            Buffer.from(paddedCorrect, "utf8")
        );
    } catch {
        return false;
    }
}

/**
 * Verify username and password using timing-safe comparison
 */
export function verifyCredentials(
    inputUsername: string,
    inputPassword: string
): boolean {
    const correctUsername = getUsername();
    const correctPassword = getPassword();

    // Compare both username and password using timing-safe comparison
    // Always compare both to prevent timing attacks that could reveal valid usernames
    const usernameMatch = timingSafeCompare(inputUsername, correctUsername);
    const passwordMatch = timingSafeCompare(inputPassword, correctPassword);

    return usernameMatch && passwordMatch;
}

/**
 * Extract session token from request cookies
 */
export function getSessionFromRequest(req: Request): string | null {
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === SESSION_COOKIE_NAME && value) {
            return value;
        }
    }
    return null;
}

/**
 * Create a session cookie header value
 */
export function createSessionCookie(token: string): string {
    const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
    return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}

/**
 * Create an expired cookie header value (for logout)
 */
export function createExpiredSessionCookie(): string {
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

/**
 * Check if a path should skip authentication
 * These paths must remain accessible without auth for the app to function
 */
export function shouldSkipAuth(pathname: string): boolean {
    const publicPaths = [
        "/login", // Login page
        "/login.html", // Login page alternate
        "/api/auth/login", // Login API endpoint
        "/api/auth/logout", // Logout API endpoint
        "/webhooks/twitter", // X webhook callback (CRC validation must work)
        "/public/css/login.css", // Login page styles
    ];

    // Check exact matches
    if (publicPaths.includes(pathname)) {
        return true;
    }

    // Allow public static assets needed for login page
    if (
        pathname.startsWith("/public/css/") ||
        pathname.startsWith("/public/img/")
    ) {
        return true;
    }

    return false;
}

/**
 * Check if request is authenticated
 */
export function isAuthenticated(req: Request): boolean {
    const token = getSessionFromRequest(req);
    return validateSession(token);
}

/**
 * Create a redirect response to login page
 */
export function redirectToLogin(): Response {
    return new Response(null, {
        status: 302,
        headers: {
            Location: "/login",
        },
    });
}
