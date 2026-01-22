import { getMessagesForUser } from "../db/messageStore";

// Helper to create a JSON response
function jsonResponse(
    status: number,
    body: any,
    method: string,
    pathname: string
): Response {
    const bodyStr = JSON.stringify(body);
    console.log(
        `[MESSAGE_API_RESPONSE] ${method} ${pathname} - Status: ${status}, Body: ${bodyStr.substring(0, 200)}...`
    );
    return new Response(bodyStr, {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

async function getMessages(req: Request, url: URL): Promise<Response> {
    const userId = url.searchParams.get("user_id");

    if (!userId || typeof userId !== "string") {
        return jsonResponse(
            400,
            {
                error: "Missing or invalid 'user_id' query parameter. Usage: /api/messages?user_id=<userId>",
            },
            req.method,
            url.pathname
        );
    }

    // Optional limit parameter (defaults to 100 in getMessagesForUser)
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    if (limitParam && (isNaN(limit) || limit < 1 || limit > 1000)) {
        return jsonResponse(
            400,
            {
                error: "Invalid 'limit' query parameter. Must be a number between 1 and 1000.",
            },
            req.method,
            url.pathname
        );
    }

    try {
        const messages = getMessagesForUser(userId, limit);
        return jsonResponse(
            200,
            {
                user_id: userId,
                count: messages.length,
                messages: messages,
            },
            req.method,
            url.pathname
        );
    } catch (error) {
        console.error(
            `[MESSAGE_API] Error retrieving messages for user ${userId}:`,
            error
        );
        return jsonResponse(
            500,
            {
                error: "Internal server error while retrieving messages.",
            },
            req.method,
            url.pathname
        );
    }
}

export async function handleMessageRoutes(
    req: Request,
    url: URL
): Promise<Response | null> {
    if (url.pathname !== "/api/messages") {
        return null; // Not a message route
    }

    if (req.method === "GET") {
        return getMessages(req, url);
    }

    return null; // Method not supported
}
