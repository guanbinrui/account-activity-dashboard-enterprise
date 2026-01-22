import {
    verifyCredentials,
    createSession,
    createSessionCookie,
    createExpiredSessionCookie,
    getSessionFromRequest,
    invalidateSession,
} from "../auth/authMiddleware";

/**
 * Handle authentication routes (/api/auth/*)
 * Returns Response if route matches, null otherwise
 */
export async function handleAuthRoutes(
    req: Request,
    url: URL
): Promise<Response | null> {
    // POST /api/auth/login - Handle login
    if (url.pathname === "/api/auth/login" && req.method === "POST") {
        try {
            const body = (await req.json()) as {
                username?: string;
                password?: string;
            };
            const { username, password } = body;

            if (!username || typeof username !== "string") {
                return new Response(
                    JSON.stringify({ error: "Username is required" }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            if (!password || typeof password !== "string") {
                return new Response(
                    JSON.stringify({ error: "Password is required" }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            if (verifyCredentials(username, password)) {
                const token = createSession();
                console.log("[AUTH] Login successful");

                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Set-Cookie": createSessionCookie(token),
                    },
                });
            } else {
                console.log("[AUTH] Login failed - invalid credentials");

                // Add a small delay to prevent brute force attacks
                await new Promise((resolve) => setTimeout(resolve, 1000));

                return new Response(
                    JSON.stringify({ error: "Invalid username or password" }),
                    {
                        status: 401,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }
        } catch (error) {
            console.error("[AUTH] Login error:", error);
            return new Response(JSON.stringify({ error: "Invalid request" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    // POST /api/auth/logout - Handle logout
    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
        const token = getSessionFromRequest(req);
        if (token) {
            invalidateSession(token);
        }
        console.log("[AUTH] Logout successful");

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie": createExpiredSessionCookie(),
            },
        });
    }

    // GET /api/auth/status - Check authentication status
    if (url.pathname === "/api/auth/status" && req.method === "GET") {
        // This route is called after auth check, so if we reach here, we're authenticated
        return new Response(JSON.stringify({ authenticated: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Route not handled
    return null;
}
