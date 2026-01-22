# API Documentation

This document provides comprehensive documentation for all RESTful APIs in the Account Activity Dashboard Enterprise project.

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Message Management](#message-management)
- [Webhook Management](#webhook-management)
- [Subscription Management](#subscription-management)
- [X (Twitter) Event Webhooks](#x-twitter-event-webhooks)
- [WebSocket](#websocket)
- [Static Files](#static-files)

---

## Authentication

### POST `/api/auth/login`

Authenticate a user and create a session.

**Request Body:**

```json
{
    "username": "string",
    "password": "string"
}
```

**Response:**

- **200 OK**: Login successful

    ```json
    {
        "success": true
    }
    ```

    - Sets a session cookie: `aaa_session`

- **400 Bad Request**: Missing username or password

    ```json
    {
        "error": "Username is required"
    }
    ```

    or

    ```json
    {
        "error": "Password is required"
    }
    ```

- **401 Unauthorized**: Invalid credentials
    ```json
    {
        "error": "Invalid username or password"
    }
    ```

**Notes:**

- Uses environment variables `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD` for credentials
- Session duration: 24 hours
- Includes a 1-second delay on failed login to prevent brute force attacks

---

### POST `/api/auth/logout`

Logout and invalidate the current session.

**Response:**

- **200 OK**: Logout successful

    ```json
    {
        "success": true
    }
    ```

    - Expires the session cookie

**Authentication:** Required (session cookie)

---

### GET `/api/auth/status`

Check if the current session is authenticated.

**Response:**

- **200 OK**: Authenticated

    ```json
    {
        "authenticated": true
    }
    ```

- **401 Unauthorized**: Not authenticated
    ```json
    {
        "error": "Unauthorized"
    }
    ```

**Authentication:** Required (session cookie)

---

## User Management

### GET `/api/users/:userId`

Retrieve user details from X (Twitter) API.

**Path Parameters:**

- `userId` (string, required): The X user ID

**Response:**

- **200 OK**: User details retrieved

    ```json
    {
        "data": {
            "id": "string",
            "name": "string",
            "username": "string",
            "profile_image_url": "string"
        }
    }
    ```

- **400 Bad Request**: Invalid user ID
- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Server configuration error or Twitter API error
    ```json
    {
        "error": "Server configuration error: Missing API token."
    }
    ```
    or
    ```json
    {
        "error": "Failed to fetch user details from Twitter API.",
        "details": {}
    }
    ```

**Authentication:** Required (session cookie)

**Notes:**

- Requires `X_BEARER_TOKEN` environment variable
- Fetches data from `https://api.twitter.com/2/users/:userId?user.fields=profile_image_url`

---

## Message Management

### GET `/api/messages`

Retrieve stored message records from the database for a specific user with pagination support.

**Query Parameters:**

- `user_id` (string, required): The user ID to fetch messages for
- `size` (number, optional): Number of records to return per page (default: 25, max: 25)
- `cursor` (number, optional): Starting position/offset for pagination (default: 0, must be non-negative integer)

**Example:**

```
GET /api/messages?user_id=12345
GET /api/messages?user_id=12345&size=25
GET /api/messages?user_id=12345&size=25&cursor=0
GET /api/messages?user_id=12345&size=25&cursor=25
```

**Response:**

- **200 OK**: Messages retrieved successfully

    ```json
    {
        "user_id": "12345",
        "size": 25,
        "cursor": 0,
        "count": 10,
        "messages": [
            {
                "for_user_id": "12345",
                "tweet_create_events": []
                // ... other event data from X API
            }
        ]
    }
    ```

- **400 Bad Request**: Missing or invalid query parameters

    ```json
    {
        "error": "Missing or invalid 'user_id' query parameter. Usage: /api/messages?user_id=<userId>"
    }
    ```

    or

    ```json
    {
        "error": "Invalid 'size' query parameter. Must be a number between 1 and 25."
    }
    ```

    or

    ```json
    {
        "error": "Invalid 'cursor' query parameter. Must be a non-negative integer."
    }
    ```

- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Database error

    ```json
    {
        "error": "Internal server error while retrieving messages."
    }
    ```

**Authentication:** Required (session cookie)

**Notes:**

- Messages are stored in a SQLite database (`messages.db`)
- Messages are automatically persisted when received via the `/webhooks/twitter` POST endpoint
- Messages are stored indefinitely without expiration
- Results are ordered by `created_at` descending (most recent first)
- Use `cursor` for pagination: start with `cursor=0`, then use `cursor=25` for the next page, `cursor=50` for the page after that, etc.
- The `size` parameter controls how many records are returned per request (default: 25, maximum: 25)

---

## Webhook Management

### GET `/api/webhooks`

List all webhooks registered with X (Twitter) API.

**Response:**

- **200 OK**: List of webhooks

    ```json
    {
      "data": [
        {
          "id": "string",
          "url": "string",
          "valid": boolean,
          "created_timestamp": "string"
        }
      ]
    }
    ```

- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Server configuration error or Twitter API error
    ```json
    {
        "error": "Server configuration error: Missing API token."
    }
    ```
    or
    ```json
    {
        "error": "Failed to fetch data from Twitter API.",
        "details": {}
    }
    ```

**Authentication:** Required (session cookie)

**Notes:**

- Requires `X_BEARER_TOKEN` environment variable
- Fetches data from `https://api.twitter.com/2/webhooks`

---

### POST `/api/webhooks`

Create a new webhook.

**Request Body:**

```json
{
    "url": "string"
}
```

**Response:**

- **201 Created**: Webhook created successfully

    ```json
    {
      "data": {
        "id": "string",
        "url": "string",
        "valid": boolean,
        "created_timestamp": "string"
      }
    }
    ```

- **400 Bad Request**: Invalid request body

    ```json
    {
        "error": "Invalid request body: 'url' is required and must be a string."
    }
    ```

- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Server configuration error or Twitter API error

**Authentication:** Required (session cookie)

**Notes:**

- Requires `X_BEARER_TOKEN` environment variable
- Creates webhook via `https://api.twitter.com/2/webhooks`

---

### PUT `/api/webhooks/:id`

Validate a webhook (trigger CRC check with X API).

**Path Parameters:**

- `id` (string, required): The webhook ID

**Response:**

- **204 No Content**: Validation request sent successfully

- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Server configuration error or Twitter API error
    ```json
    {
        "error": "Twitter API Error during validation request.",
        "details": {}
    }
    ```

**Authentication:** Required (session cookie)

**Notes:**

- Requires `X_BEARER_TOKEN` environment variable
- Sends PUT request to `https://api.twitter.com/2/webhooks/:id`

---

### DELETE `/api/webhooks/:id`

Delete a webhook.

**Path Parameters:**

- `id` (string, required): The webhook ID

**Response:**

- **204 No Content**: Webhook deleted successfully

- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Server configuration error or Twitter API error
    ```json
    {
        "error": "Failed to delete webhook from Twitter API.",
        "details": {}
    }
    ```

**Authentication:** Required (session cookie)

**Notes:**

- Requires `X_BEARER_TOKEN` environment variable
- Deletes webhook via `https://api.twitter.com/2/webhooks/:id`

---

### POST `/api/webhooks/:id/replay`

Request replay of webhook events for a specific time range.

**Path Parameters:**

- `id` (string, required): The webhook ID

**Query Parameters:**

- `from_date` (string, required): Start date in `YYYYMMDDHHmm` format (local time)
- `to_date` (string, required): End date in `YYYYMMDDHHmm` format (local time)

**Example:**

```
POST /api/webhooks/123456/replay?from_date=202401011200&to_date=202401011300
```

**Response:**

- **200 OK**: Replay request accepted

    ```json
    {
        "data": {
            "job_id": "string",
            "created_at": "string"
        }
    }
    ```

- **400 Bad Request**: Invalid query parameters

    ```json
    {
        "error": "Invalid query parameters: 'from_date' and 'to_date' are required strings in YYYYMMDDHHmm format representing local time."
    }
    ```

    or

    ```json
    {
        "error": "Invalid date format in query parameters: 'from_date' and 'to_date' must be in YYYYMMDDHHmm format representing local time."
    }
    ```

- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Server configuration error or Twitter API error
    ```json
    {
        "error": "X API Error during replay request.",
        "details": {}
    }
    ```

**Authentication:** Required (session cookie)

**Notes:**

- Requires `X_BEARER_TOKEN` environment variable
- Dates are converted from local time to UTC automatically
- Sends request to `https://api.twitter.com/2/account_activity/replay/webhooks/:id/subscriptions/all`

---

## Subscription Management

### GET `/api/webhooks/:id/subscriptions`

List all subscriptions for a webhook.

**Path Parameters:**

- `id` (string, required): The webhook ID

**Response:**

- **200 OK**: List of subscriptions

    ```json
    {
      "data": [
        {
          "id": "string"
        }
      ],
      "meta": {
        "result_count": number
      }
    }
    ```

- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Server configuration error or Twitter API error
    ```json
    {
        "error": "Server configuration error: Missing API token."
    }
    ```
    or
    ```json
    {
        "error": "Failed to fetch subscriptions from Twitter API.",
        "details": {}
    }
    ```

**Authentication:** Required (session cookie)

**Notes:**

- Requires `X_BEARER_TOKEN` environment variable
- Fetches from `https://api.twitter.com/2/account_activity/webhooks/:id/subscriptions/all/list`

---

### POST `/api/webhooks/:id/subscriptions`

Add a subscription to a webhook (subscribes to all event types for the authenticated user).

**Path Parameters:**

- `id` (string, required): The webhook ID

**Request Body (optional):**

```json
{
    "accessToken": "string",
    "accessTokenSecret": "string"
}
```

**Request Body Fields:**

- `accessToken` (string, optional): OAuth 1.0a access token. If not provided, uses `X_ACCESS_TOKEN` environment variable.
- `accessTokenSecret` (string, optional): OAuth 1.0a access token secret. If not provided, uses `X_ACCESS_TOKEN_SECRET` environment variable.

**Response:**

- **200 OK**: Subscription created successfully

    ```json
    {
        "message": "Subscription request processed successfully.",
        "details": {}
    }
    ```

- **204 No Content**: Subscription successful (or already exists)

- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Server configuration error or Twitter API error
    ```json
    {
        "error": "Server configuration error: Missing OAuth credentials for subscription."
    }
    ```
    or
    ```json
    {
        "error": "Failed to add subscription via Twitter API (OAuth 1.0a).",
        "details": {}
    }
    ```

**Authentication:** Required (session cookie)

**Notes:**

- Requires OAuth 1.0a credentials:
    - `X_CONSUMER_KEY` (environment variable, required)
    - `X_CONSUMER_SECRET` (environment variable, required)
    - `X_ACCESS_TOKEN` (environment variable or request body, required)
    - `X_ACCESS_TOKEN_SECRET` (environment variable or request body, required)
- If `accessToken` and `accessTokenSecret` are provided in the request body, they will be used instead of the environment variables.
- If not provided in the request body, the endpoint will fall back to `X_ACCESS_TOKEN` and `X_ACCESS_TOKEN_SECRET` environment variables.
- Subscribes to all event types via `https://api.twitter.com/2/account_activity/webhooks/:id/subscriptions/all`

---

### DELETE `/api/webhooks/:id/subscriptions/:userId`

Remove a subscription from a webhook.

**Path Parameters:**

- `id` (string, required): The webhook ID
- `userId` (string, required): The user ID to unsubscribe

**Response:**

- **204 No Content**: Subscription deleted successfully

- **401 Unauthorized**: Not authenticated
- **500 Internal Server Error**: Server configuration error or Twitter API error
    ```json
    {
        "error": "Server configuration error: Missing API token."
    }
    ```
    or
    ```json
    {
        "error": "Failed to delete subscription via Twitter API.",
        "details": {}
    }
    ```

**Authentication:** Required (session cookie)

**Notes:**

- Requires `X_BEARER_TOKEN` environment variable
- Deletes via `https://api.twitter.com/2/account_activity/webhooks/:id/subscriptions/:userId/all`

---

## X (Twitter) Event Webhooks

### GET `/webhooks/twitter`

Handle CRC (Challenge-Response Check) validation from X API.

**Query Parameters:**

- `crc_token` (string, required): The challenge token from X API

**Response:**

- **200 OK**: CRC validation successful

    ```json
    {
        "response_token": "sha256=<HMAC_SHA256_hash>"
    }
    ```

- **400 Bad Request**: Missing CRC token

    ```json
    {
        "error": "crc_token query parameter missing"
    }
    ```

- **500 Internal Server Error**: Server configuration error
    ```json
    {
        "error": "Server configuration error: Missing consumer secret."
    }
    ```

**Authentication:** Not required (public endpoint)

**Notes:**

- Requires `X_CONSUMER_SECRET` environment variable
- Uses HMAC SHA256 to generate response token
- This endpoint is called by X API during webhook registration/validation

---

### POST `/webhooks/twitter`

Receive webhook events from X API.

**Request Body:**

```json
{
  "for_user_id": "string",
  "user_has_blocked": boolean,
  "tweet_create_events": [],
  "tweet_delete_events": [],
  "direct_message_events": [],
  // ... other event types
}
```

**Response:**

- **200 OK**: Event received and processed (empty body)

- **405 Method Not Allowed**: Invalid HTTP method

**Authentication:** Not required (public endpoint)

**Notes:**

- Events are automatically broadcast to all connected WebSocket clients at `/ws/live-events`
- This endpoint is called by X API when events occur
- Always returns 200 OK to prevent retries from X API

---

## WebSocket

### WebSocket `/ws/live-events`

Real-time event stream for live webhook events.

**Connection:**

```
ws://localhost:3000/ws/live-events
```

**Messages:**

**From Server:**

- **Connection Acknowledgment** (on connect):

    ```json
    {
        "type": "connection_ack",
        "message": "Connected to live event stream!"
    }
    ```

- **Event Broadcast** (when webhook events are received):
    ```json
    {
        "for_user_id": "string",
        "tweet_create_events": []
        // ... event data from X API
    }
    ```

**Authentication:** Required (session cookie must be present in initial HTTP upgrade request)

**Notes:**

- WebSocket compression is enabled (perMessageDeflate)
- Events are automatically broadcast to all connected clients when received via `/webhooks/twitter` POST endpoint
- Clients are automatically removed from the connection pool on disconnect

---

## Static Files

### GET `/`

Serve the main dashboard HTML page.

**Response:**

- **200 OK**: HTML content (index.html)

**Authentication:** Required (session cookie)

---

### GET `/login` or `/login.html`

Serve the login page.

**Response:**

- **200 OK**: HTML content (login.html)
- **302 Found**: Redirects to `/` if already authenticated

**Authentication:** Not required (public endpoint)

---

### GET `/public/*`

Serve static files (CSS, JavaScript, images, etc.).

**Response:**

- **200 OK**: File content with appropriate Content-Type header
- **404 Not Found**: File does not exist

**Supported File Types:**

- CSS files (`.css`)
- JavaScript files (`.js`)
- Images (`.png`, `.jpg`, `.jpeg`, `.svg`, `.ico`)
- Fonts (`.woff`, `.woff2`, `.ttf`, `.eot`)
- JSON files (`.json`)

**Authentication:** Not required for login-related assets (CSS, images), required for others

---

## Error Responses

All API endpoints may return the following error responses:

### 400 Bad Request

```json
{
    "error": "Error message describing the issue"
}
```

### 401 Unauthorized

```json
{
    "error": "Unauthorized"
}
```

### 404 Not Found

```
Not Found
```

### 405 Method Not Allowed

```
Method Not Allowed
```

### 500 Internal Server Error

```json
{
    "error": "Error message",
    "details": {}
}
```

---

## Authentication

Most API endpoints require authentication via session cookies. The authentication flow:

1. **Login**: POST to `/api/auth/login` with credentials
2. **Session Cookie**: Server sets `aaa_session` cookie (HttpOnly, SameSite=Strict)
3. **Subsequent Requests**: Include the session cookie in all requests
4. **Logout**: POST to `/api/auth/logout` to invalidate session

**Session Duration:** 24 hours

**Public Endpoints** (no authentication required):

- `/api/auth/login`
- `/api/auth/logout`
- `/login` and `/login.html`
- `/webhooks/twitter` (GET and POST)
- `/public/css/*` and `/public/img/*` (static assets for login page)

---

## Environment Variables

The following environment variables are required for the API to function:

### Authentication

- `DASHBOARD_USERNAME`: Username for dashboard login (default: "admin")
- `DASHBOARD_PASSWORD`: Password for dashboard login (default: "admin")

### X (Twitter) API Credentials

- `X_BEARER_TOKEN`: Bearer token for X API v2 requests
- `X_CONSUMER_KEY`: OAuth 1.0a consumer key
- `X_CONSUMER_SECRET`: OAuth 1.0a consumer secret
- `X_ACCESS_TOKEN`: OAuth 1.0a access token
- `X_ACCESS_TOKEN_SECRET`: OAuth 1.0a access token secret

### Server Configuration

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode ("production" or other)

---

## Base URL

The API is served at:

- **Development**: `http://localhost:3000`
- **Production**: Configured via `PORT` environment variable

---

## Rate Limiting

- Login endpoint includes a 1-second delay on failed attempts to prevent brute force attacks
- No other rate limiting is implemented at the application level (subject to X API rate limits)

---

## WebSocket Events

The WebSocket connection at `/ws/live-events` broadcasts all events received from X API webhooks in real-time. Clients can connect to receive live updates without polling.

---

## Notes

- All timestamps from X API are in UTC
- Date parameters for replay endpoint are converted from local time to UTC automatically
- Webhook validation (CRC check) is handled automatically by the `/webhooks/twitter` GET endpoint
- Session management is in-memory (not persistent across server restarts)
- All API responses are in JSON format unless otherwise specified
