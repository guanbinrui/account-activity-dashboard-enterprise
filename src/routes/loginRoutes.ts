import path from "node:path";
import {
    isAuthenticated,
    isAuthenticatedOrHasValidApiKey,
    shouldSkipAuth,
    supportsApiKey,
    redirectToLogin,
} from "../auth/authMiddleware";

// Configuration for paths - these will be set by the caller
let currentDir: string;
let projectRoot: string;

/**
 * Initialize the login routes with the necessary paths
 */
export function initLoginRoutes(config: {
    currentDir: string;
    projectRoot: string;
}): void {
    currentDir = config.currentDir;
    projectRoot = config.projectRoot;
}

/**
 * Handle login page routes (/login, /login.html)
 * Returns Response if route matches, null otherwise
 */
export async function handleLoginRoutes(
    req: Request,
    url: URL
): Promise<Response | null> {
    // Serve login page
    if (url.pathname === "/login" || url.pathname === "/login.html") {
        // If already authenticated, redirect to dashboard
        if (isAuthenticated(req)) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/" },
            });
        }

        // Try dist/login.html first (for built version), then fall back to root login.html
        let loginHtmlPath = path.join(currentDir, "login.html");
        let loginFile = Bun.file(loginHtmlPath);
        if (!(await loginFile.exists())) {
            loginHtmlPath = path.join(projectRoot, "login.html");
            loginFile = Bun.file(loginHtmlPath);
        }
        console.log(
            `[RESPONSE] ${req.method} ${url.pathname} - Status: 200, Content-Type: text/html, File: ${loginHtmlPath}`
        );
        return new Response(loginFile, {
            headers: { "Content-Type": "text/html" },
        });
    }

    // Route not handled
    return null;
}

/**
 * Check authentication for protected routes
 * Returns Response if authentication fails, null if authenticated or should skip
 */
export function checkAuthentication(req: Request, url: URL): Response | null {
    // Check authentication for protected routes
    if (!shouldSkipAuth(url.pathname)) {
        // Check if this is a route that supports API key authentication
        if (supportsApiKey(url.pathname)) {
            // Allow either session cookie or API key authentication
            if (!isAuthenticatedOrHasValidApiKey(req)) {
                console.log(
                    `[AUTH] Unauthenticated request to ${url.pathname} - no valid session or API key`
                );
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }
        } else {
            // For all other protected routes, require session authentication
            if (!isAuthenticated(req)) {
                console.log(
                    `[AUTH] Unauthenticated request to ${url.pathname} - redirecting to login`
                );

                // For API requests, return 401 instead of redirect
                if (
                    url.pathname.startsWith("/api/") ||
                    url.pathname.startsWith("/ws/")
                ) {
                    return new Response(
                        JSON.stringify({ error: "Unauthorized" }),
                        {
                            status: 401,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                }

                return redirectToLogin();
            }
        }
    }

    // Authenticated or should skip auth
    return null;
}
