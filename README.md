# Account Activity API Dashboard (AAA Dashboard)

A Bun.js web application to monitor and manage X (formerly Twitter) Account Activity API webhooks, subscriptions, and live events.

## Features

*   **Webhooks Management:**
    *   List registered webhooks.
    *   Add new webhooks.
    *   Delete existing webhooks.
    *   Validate webhooks (CRC check).
    *   Replay events for a webhook within a specified date/time range.
*   **Subscriptions Management:**
    *   List user subscriptions for a selected webhook.
    *   Add new subscriptions (for the user specified in `.env`).
    *   Delete user subscriptions.
*   **Live Events Viewer:**
    *   Real-time stream of events via WebSockets.
    *   Supports various event types: Tweet create/delete, Favorite, Follow/Unfollow, Mute/Unmute, Replay job status, Direct Messages (received, sent, typing indicator, read receipts).
    *   Instructions panel for setting up ngrok to receive events locally.

## Quick Start

Follow these steps to get the application running locally:

### 1. Prerequisites

*   **Bun.js:** Ensure you have Bun.js installed. You can find installation instructions at [bun.sh](https://bun.sh).
*   **X API Credentials:** You will need X API v2 credentials (Consumer Key, Consumer Secret, Access Token, Access Token Secret, Bearer Token) for an app with the Account Activity API enabled.

### 2. Clone the Repository

```bash
# Replace with your repository's clone command if applicable
git clone https://github.com/xdevplatform/account-activity-dashboard-enterprise.git
```

```bash
cd account-activity-dashboard-enterprise
```

### 3. Set Up Environment Variables

*   Copy the environment template file:
    ```bash
    cp env.template .env
    ```
*   Edit the `.env` file and fill in your X API credentials:
    ```
    X_CONSUMER_KEY="YOUR_CONSUMER_KEY"
    X_CONSUMER_SECRET="YOUR_CONSUMER_SECRET"
    X_ACCESS_TOKEN="YOUR_ACCESS_TOKEN"
    X_ACCESS_TOKEN_SECRET="YOUR_ACCESS_TOKEN_SECRET"
    X_BEARER_TOKEN="YOUR_BEARER_TOKEN"
    ```

### 4. Install Dependencies

Open your terminal in the project root directory and run:

```bash
bun install
```

This command will install all necessary dependencies defined in `package.json`.

### 5. Run the Application

To start the development server, run:

```bash
bun run index.ts
```

Alternatively, if you have a `dev` script in your `package.json` (e.g., `"dev": "bun --watch index.ts"`), you can run:

```bash
bun run dev
```

The server will typically start on `http://localhost:3000`.

### 6. Access the Application

Open your web browser and navigate to:

[http://localhost:3000](http://localhost:3000)

You should now see the Account Activity Dashboard interface.

### 7. Setting Up for Live Events (ngrok)

To receive live events from X in the dashboard when running locally, your server needs to be accessible from the public internet. `ngrok` is a recommended tool for this.

1.  **Install ngrok:** If you don't have it, download and install ngrok from [ngrok.com](https://ngrok.com).
2.  **Expose your local server:** Open a new terminal window and run ngrok to forward to your local Bun server's port (default 3000):
    ```bash
    ngrok http http://localhost:3000
    ```
    If your application is running on a different port, replace `3000` accordingly.
3.  **Copy the ngrok URL:** ngrok will display a public HTTPS forwarding URL (e.g., `https://your-unique-id.ngrok-free.app`). Copy this HTTPS URL.
4.  **Construct your Webhook URL:** Your full webhook URL for X will be the ngrok HTTPS URL followed by `/webhooks/twitter`.
    *Example:* `https://your-unique-id.ngrok-free.app/webhooks/twitter`
5.  **Add and Configure in Dashboard:**
    *   Go to the "Webhooks" tab in this dashboard.
    *   Add the full webhook URL you constructed above.
    *   Once the webhook is added and validated by X (the dashboard backend handles the CRC check), go to the "Subscriptions" tab to subscribe the desired user to this webhook.
    *   Navigate to the "Live Events" tab to view incoming events.

## Docker Deployment

For production deployment, you can use Docker with nginx as a reverse proxy.

### Prerequisites

*   **Docker:** Install Docker from [docker.com](https://www.docker.com/get-started)
*   **Docker Compose:** Usually included with Docker Desktop

### Deploy with Docker

1.  **Create your `.env` file** (if not already done):
    ```bash
    cp env.template .env
    # Edit .env with your credentials
    ```

2.  **Build and run**:
    ```bash
    docker compose up -d --build
    ```

3.  **Access the app** at `http://localhost:8080`

### Docker Commands

```bash
# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f app
docker compose logs -f nginx

# Rebuild after code changes
docker compose up -d --build

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# Restart services
docker compose restart

# Check running containers
docker compose ps
```

### What nginx provides

*   **Reverse proxy** to the Bun app
*   **WebSocket support** for `/ws/live-events`
*   **Static file caching** with 7-day expiry
*   **Gzip compression** for text/JS/CSS/JSON
*   **Security headers** (XSS, clickjacking protection)

## Development Notes

*   The backend is built with Bun.js and its native HTTP server.
*   Frontend assets (HTML, CSS, JavaScript) are served from the `public` directory.
*   API routes are organized under `src/routes/`.
*   Live events are pushed to the client via WebSockets.

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server with hot reload |
| `bun run build` | Build to `dist/` folder |
| `bun run start` | Run the built version |
| `bun run clean` | Remove `dist/` folder |
| `bun run lint` | Run ESLint |
| `bun run test` | Run tests |
| `bun run format` | Format code with Prettier |

## Troubleshooting

*   **Permissions:** Ensure your X app has the necessary permissions for the Account Activity API and the specific endpoints being used (e.g., Webhooks, Subscriptions, Direct Messages if applicable).
*   **`.env` file:** Double-check that your `.env` file is correctly named, located in the project root, and contains the correct credentials.
*   **ngrok for Live Events:** If you are testing live event ingestion locally, remember to set up ngrok (or a similar tunneling service) and register the ngrok URL with X as described in the "Live Events" tab instructions panel within the application.
