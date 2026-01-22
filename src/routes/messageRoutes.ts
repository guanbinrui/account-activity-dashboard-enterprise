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

    // Parse size parameter (default: 25, max: 25)
    const sizeParam = url.searchParams.get("size");
    const size = sizeParam ? parseInt(sizeParam, 10) : 25;

    if (sizeParam && (isNaN(size) || size < 1 || size > 25)) {
        return jsonResponse(
            400,
            {
                error: "Invalid 'size' query parameter. Must be a number between 1 and 25.",
            },
            req.method,
            url.pathname
        );
    }

    // Parse cursor parameter (default: 0)
    const cursorParam = url.searchParams.get("cursor");
    const cursor = cursorParam ? parseInt(cursorParam, 10) : 0;

    if (cursorParam && (isNaN(cursor) || cursor < 0)) {
        return jsonResponse(
            400,
            {
                error: "Invalid 'cursor' query parameter. Must be a non-negative integer.",
            },
            req.method,
            url.pathname
        );
    }

    try {
        const messages = getMessagesForUser(userId, size, cursor);
        return jsonResponse(
            200,
            {
                user_id: userId,
                size: size,
                cursor: cursor,
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
