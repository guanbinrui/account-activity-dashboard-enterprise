import { serve, type ServerWebSocket } from "bun";
import { handleWebhookRoutes } from "./src/routes/webhookRoutes"; // Import the new handler
import { handleUserRoutes } from "./src/routes/userRoutes"; // Import the new user route handler
import { handleMessageRoutes } from "./src/routes/messageRoutes"; // Import the message routes handler
import { handleXEventRoutes } from "./src/routes/xEventRoutes"; // Import the X event handler
import {
    handlePublicRoutes,
    initPublicRoutes,
} from "./src/routes/publicRoutes"; // Import the public routes handler
import { handleAuthRoutes } from "./src/routes/authRoutes"; // Import auth routes
import {
    handleLoginRoutes,
    initLoginRoutes,
    checkAuthentication,
} from "./src/routes/loginRoutes"; // Import login routes
import { persistMessage } from "./src/db/messageStore"; // Import message persistence
import path from "node:path"; // For path joining

// Detect if running from dist directory and adjust project root accordingly
const currentDir = import.meta.dir;
const projectRoot =
    currentDir.endsWith("/dist") || currentDir.endsWith("\\dist")
        ? path.resolve(currentDir, "..")
        : currentDir;
const publicFolder = path.resolve(projectRoot, "public");

// Initialize public routes with path configuration
initPublicRoutes({ publicFolder, currentDir, projectRoot });

// Initialize login routes with path configuration
initLoginRoutes({ currentDir, projectRoot });

// Set to store active WebSocket connections for live events
const liveEventClients = new Set<ServerWebSocket<unknown>>();

// Function to broadcast messages to all connected live event clients
function broadcastToLiveEventClients(message: string | object) {
    const messageString =
        typeof message === "string" ? message : JSON.stringify(message);
    console.log(
        `[WEBSOCKET_BROADCAST] Broadcasting to ${liveEventClients.size} clients: ${messageString.substring(0, 100)}...`
    );
    for (const client of liveEventClients) {
        try {
            client.send(messageString);
        } catch (e) {
            console.error("[WEBSOCKET_BROADCAST] Error sending to client:", e);
            // Client will be removed in the 'close' handler if the error causes a disconnect
        }
    }
}

serve({
    async fetch(req, server) {
        const url = new URL(req.url);
        console.log(`[REQUEST] ${req.method} ${url.pathname}`);

        // Handle auth routes first (login/logout) - these don't require authentication
        const authResponse = await handleAuthRoutes(req, url);
        if (authResponse) {
            return authResponse;
        }

        // Handle login page routes
        const loginResponse = await handleLoginRoutes(req, url);
        if (loginResponse) {
            return loginResponse;
        }

        // Check authentication for protected routes
        const authCheckResponse = checkAuthentication(req, url);
        if (authCheckResponse) {
            return authCheckResponse;
        }

        // WebSocket upgrade for live events (auth checked above)
        if (url.pathname === "/ws/live-events") {
            const success = server.upgrade(req);
            if (success) {
                // Bun automatically handles send/recv after successful upgrade.
                // The open, message, close, drain handlers are on the websocket object below.
                return; // Return nothing on successful upgrade
            }
            // Upgrade failed
            return new Response("WebSocket upgrade failed", { status: 400 });
        }

        // Handle /api/webhooks routes (which now also delegates to subscriptionRoutes)
        const webhookResponse = await handleWebhookRoutes(req, url);
        if (webhookResponse) {
            return webhookResponse;
        }

        // Handle /api/users routes
        const userResponse = await handleUserRoutes(req, url);
        if (userResponse) {
            return userResponse;
        }

        // Handle /api/messages routes
        const messageResponse = await handleMessageRoutes(req, url);
        if (messageResponse) {
            return messageResponse;
        }

        // Handle /webhooks/twitter for incoming X events (CRC & POST)
        const xEventResponse = await handleXEventRoutes(
            req,
            url,
            async (message) => {
                console.log(
                    `[X_EVENT_ROUTES] Broadcasting message to live event clients: ${JSON.stringify(message)}`
                );

                // Persist message to database
                await persistMessage(message);

                // Broadcast to WebSocket clients
                broadcastToLiveEventClients(message);
            }
        );
        if (xEventResponse) {
            return xEventResponse;
        }

        // Handle static files and index.html
        const publicResponse = await handlePublicRoutes(req, url);
        if (publicResponse) {
            return publicResponse;
        }

        // Fallback to 404 Not Found
        console.log(
            `[RESPONSE] ${req.method} ${url.pathname} - Status: 404, Body: "Not Found"`
        );
        return new Response("Not Found", { status: 404 });
    },
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    hostname: "0.0.0.0", // Bind to all interfaces to allow Docker networking
    development: process.env.NODE_ENV !== "production",
    websocket: {
        open(ws) {
            liveEventClients.add(ws);
            console.log(
                `[WEBSOCKET_SERVER] Client connected to /ws/live-events. Total clients: ${liveEventClients.size}`
            );
            ws.send(
                JSON.stringify({
                    type: "connection_ack",
                    message: "Connected to live event stream!",
                })
            );
        },
        message(ws, message) {
            console.log(
                `[WEBSOCKET_SERVER] Received message from client (unexpected): ${message}`
            );
            // Echo back if needed for testing, or handle specific client messages
            // ws.send(`Server received: ${message}`);
        },
        close(ws, code, reason) {
            liveEventClients.delete(ws);
            console.log(
                `[WEBSOCKET_SERVER] Client disconnected from /ws/live-events. Code: ${code}, Reason: ${reason}. Total clients: ${liveEventClients.size}`
            );
        },
        perMessageDeflate: true, // Enable compression if desired
    },
});

console.log(`Listening on http://localhost:${process.env.PORT || 3000} ...`);
console.log(
    `WebSocket for live events available at ws://localhost:${process.env.PORT || 3000}/ws/live-events`
);
