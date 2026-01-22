import { Database } from "bun:sqlite";
import path from "node:path";
import { mkdirSync } from "node:fs";

// Get the database path
// Priority: DB_PATH > DATA_DIR/data/messages.db > auto-resolve
let dbPath: string;
if (process.env.DB_PATH) {
    // Use explicit database file path if provided
    dbPath = process.env.DB_PATH;
} else {
    // Determine data directory
    let dataDir: string;
    if (process.env.DATA_DIR) {
        // Use explicit data directory if provided
        dataDir = process.env.DATA_DIR;
    } else {
        // Auto-resolve project root and use data subdirectory
        const currentDir = import.meta.dir;
        const projectRoot = currentDir.includes("/dist") || currentDir.includes("\\dist")
            ? path.resolve(currentDir, "../../..") // Docker: dist/src/db -> ../../../ -> /app
            : path.resolve(currentDir, ".."); // Development: src/db -> .. -> project root
        dataDir = path.resolve(projectRoot, "data");
    }
    dbPath = path.resolve(dataDir, "messages.db");
}

// Initialize database connection
let db: Database | null = null;

function getDatabase(): Database {
    if (!db) {
        // Ensure data directory exists (extract directory from dbPath)
        const dbDir = path.dirname(dbPath);
        try {
            mkdirSync(dbDir, { recursive: true });
        } catch (error) {
            console.error(`[DB] Error creating data directory: ${error}`);
        }
        db = new Database(dbPath);
        initializeSchema();
    }
    return db;
}

function initializeSchema() {
    if (!db) return;

    // Create messages table
    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            message_data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_user_id ON messages(user_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_created_at ON messages(created_at)
    `);

    console.log(`[DB] Database initialized at ${dbPath}`);
}

/**
 * Persist a message to the database
 * Messages are stored indefinitely without expiration or limit
 */
export async function persistMessage(message: any): Promise<void> {
    try {
        const userId = message?.for_user_id;

        if (!userId) {
            console.warn(
                "[DB] Message missing for_user_id, skipping persistence"
            );
            return;
        }

        const database = getDatabase();
        const messageData = JSON.stringify(message);

        // Insert the new message
        const insertQuery = database.prepare<unknown, [string, string]>(
            "INSERT INTO messages (user_id, message_data) VALUES (?, ?)"
        );
        insertQuery.run(userId, messageData);

        console.log(`[DB] Persisted message for user ${userId}`);
    } catch (error) {
        console.error("[DB] Error persisting message:", error);
        // Don't throw - we don't want to break the webhook processing
    }
}

/**
 * Get messages for a specific user with pagination
 * @param userId - The user ID to fetch messages for
 * @param size - Number of records to return (default: 25, max: 25)
 * @param cursor - Offset/starting position (default: 0)
 * @returns Array of message objects
 */
export function getMessagesForUser(
    userId: string,
    size: number = 25,
    cursor: number = 0
): any[] {
    try {
        const database = getDatabase();
        const query = database.prepare<
            { message_data: string },
            [string, number, number]
        >(
            "SELECT message_data FROM messages WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?"
        );

        const results = query.all(userId, size, cursor);
        return results.map((row) => JSON.parse(row.message_data));
    } catch (error) {
        console.error(
            `[DB] Error retrieving messages for user ${userId}:`,
            error
        );
        return [];
    }
}

/**
 * Get all messages (for debugging/admin purposes)
 */
export function getAllMessages(limit: number = 1000): any[] {
    try {
        const database = getDatabase();
        const query = database.prepare<{ message_data: string }, [number]>(
            "SELECT message_data FROM messages ORDER BY created_at DESC, id DESC LIMIT ?"
        );

        const results = query.all(limit);
        return results.map((row) => JSON.parse(row.message_data));
    } catch (error) {
        console.error("[DB] Error retrieving all messages:", error);
        return [];
    }
}

/**
 * Close the database connection (useful for cleanup)
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
        console.log("[DB] Database connection closed");
    }
}
