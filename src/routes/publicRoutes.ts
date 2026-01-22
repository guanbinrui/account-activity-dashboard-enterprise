import path from "node:path";

// Configuration for paths - these will be set by the caller
let publicFolder: string;
let currentDir: string;
let projectRoot: string;

/**
 * Initialize the public routes with the necessary paths
 */
export function initPublicRoutes(config: {
    publicFolder: string;
    currentDir: string;
    projectRoot: string;
}): void {
    publicFolder = config.publicFolder;
    currentDir = config.currentDir;
    projectRoot = config.projectRoot;
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
        ".css": "text/css",
        ".js": "application/javascript",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".html": "text/html",
        ".json": "application/json",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
        ".eot": "application/vnd.ms-fontobject",
    };
    return contentTypes[ext] || "application/octet-stream";
}

/**
 * Handle public routes for static files and index.html
 * Returns Response if route matches, null otherwise
 */
export async function handlePublicRoutes(
    req: Request,
    url: URL
): Promise<Response | null> {
    // Static file serving from /public
    if (url.pathname.startsWith("/public/")) {
        const filePath = path.join(
            publicFolder,
            url.pathname.substring("/public".length)
        );
        const file = Bun.file(filePath);
        try {
            const exists = await file.exists();
            if (exists) {
                const contentType = getContentType(filePath);
                console.log(
                    `[RESPONSE] ${req.method} ${url.pathname} - Status: 200, Content-Type: ${contentType}, File: ${filePath}`
                );
                return new Response(file, {
                    headers: { "Content-Type": contentType },
                });
            }
        } catch (e) {
            // If Bun.file or file.exists() throws (e.g. path issues), log and fall through to 404
            console.error(`Error serving static file ${filePath}:`, e);
        }
        // If file doesn't exist or error, return 404 for /public/ paths
        console.log(
            `[RESPONSE] ${req.method} ${url.pathname} - Status: 404, Body: "Not Found"`
        );
        return new Response("Not Found", { status: 404 });
    }

    // Serve index.html for the root path
    if (url.pathname === "/") {
        // Try dist/index.html first (for built version), then fall back to root index.html
        let indexHtmlPath = path.join(currentDir, "index.html");
        let indexFile = Bun.file(indexHtmlPath);
        if (!(await indexFile.exists())) {
            indexHtmlPath = path.join(projectRoot, "index.html");
            indexFile = Bun.file(indexHtmlPath);
        }
        console.log(
            `[RESPONSE] ${req.method} ${url.pathname} - Status: 200, Content-Type: text/html, File: ${indexHtmlPath}`
        );
        return new Response(indexFile, {
            headers: { "Content-Type": "text/html" },
        });
    }

    // Route not handled
    return null;
}
