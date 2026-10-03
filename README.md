# Dish Dashboard

Dish Dashboard is a full-stack web application designed for managing and editing dish details with local draft state management and optimistic concurrency control. It allows users to safely modify dish names and publication statuses while preventing lost updates and detecting conflicts through versioned atomic database operations.

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Design Decision: Optimistic Concurrency Control](#design-decision-optimistic-concurrency-control)
- [Acceptance Check Verification](#acceptance-check-verification)
- [Verification Results](#verification-results)
- [Optional Bonus: External Updates](#optional-bonus-external-updates)
- [Known Limitations](#known-limitations)
- [Time Spent](#time-spent)
- [AI and Reused-Code Disclosure](#ai-and-reused-code-disclosure)

---

## Overview

Dish Dashboard provides an interface to view and modify dish publication statuses and names. Edits are tracked locally in drafts, leaving server state unchanged until an explicit Save is performed.

Key features include:
- **Local Drafts**: Edits remain isolated on the client until explicitly saved.
- **Explicit Save and Discard**: Separate actions to commit or discard local changes at any time.
- **Backend Validation**: Strict payload, data type, and business rule enforcement on all API requests.
- **Version-Based Conflict Protection**: Optimistic concurrency control detecting and handling conflicting writes.
- **Persistent Storage**: MongoDB container storage backed by a Docker volume.
- **Live Updates via Polling**: Background synchronization providing external update detection without overwriting active user drafts.

---

## Tech Stack

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend UI | React 19, TypeScript | Component-driven UI architecture with strong type safety and explicit state management |
| Frontend Tooling | Vite | Fast local development server, optimized builds, and built-in proxy configuration |
| Styling | Vanilla CSS | Lightweight styling with CSS custom properties, responsive design, and CSS transitions |
| Backend Server | Express 4, TypeScript | Minimal, robust HTTP server and middleware framework with complete TypeScript typing |
| Development Runtime | tsx | Fast TypeScript execution and file watching without manual compilation steps |
| Database ODM | Mongoose 8 | Schema modeling, validation, and atomic query execution against MongoDB |
| Database Engine | MongoDB 7 | Document database supporting atomic document-level query filters and updates |
| Infrastructure | Docker Compose | Container orchestration for consistent, isolated database execution |

---

## Project Structure

```text
nosh-dish-dashboard/
├── .gitignore
├── docker-compose.yml
├── README.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/
│   │   └── dishes.json
│   └── src/
│       ├── app.ts
│       ├── dishService.ts
│       ├── errors.ts
│       ├── server.ts
│       ├── seed.ts
│       ├── seedTestData.ts
│       ├── validation.ts
│       └── models/
│           └── Dish.ts
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── main.tsx
        ├── index.css
        ├── types.ts
        ├── components/
        │   ├── DishCard.tsx
        │   └── DishImage.tsx
        └── hooks/
            └── useDishes.ts
```

---

## Prerequisites

- Node.js 18 or higher
- npm (Node Package Manager)
- Docker Desktop (or an accessible MongoDB instance configured in `backend/.env`)

---

## Quick Start

Follow these steps from a fresh clone of the repository:

1. Clone the repository and enter the directory:
```bash
git clone https://github.com/Princ3mish/DishDash.git
cd DishDash
```

2. Start the MongoDB container:
```bash
docker compose up -d
```

3. Configure and seed the backend:
```bash
cd backend
npm install
```

Copy the example environment configuration:
- Linux / macOS:
```bash
cp .env.example .env
```
- Windows (PowerShell / Command Prompt):
```cmd
copy .env.example .env
```

Seed the initial dish records:
```bash
npm run seed
```
Initial seed output:
```text
Inserted 5, skipped 0 (already existed)
```
Subsequent runs preserve existing records:
```text
Inserted 0, skipped 5 (already existed)
```

Start the backend server:
```bash
npm run dev
```
The backend API is now running at `http://localhost:8000`.

4. In a separate terminal, install and start the frontend:
```bash
cd frontend
npm install
npm run dev
```

5. Open `http://localhost:5173` in your browser.

### Seed Behavior
The seed script (`npm run seed`) is idempotent. It uses MongoDB `$setOnInsert` operations to populate initial dish data without overwriting modified dish names, versions, or publication statuses on subsequent runs.

### Persistence
MongoDB data is persisted using the named Docker volume `nosh-mongodata`. All dish records, version numbers, and edits persist across backend service restarts and container reboots.

---

## Environment Variables

The backend uses configuration values defined in `backend/.env.example`:

| Variable | Default Value | Description |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27017/nosh` | MongoDB connection URI |
| `PORT` | `8000` | HTTP port on which the Express server listens |

*Note: No secrets or credentials are required or committed in the repository.*

---

## API Reference

### Endpoints

#### GET /health
Health check endpoint returning service status.

Request:
```bash
curl -X GET http://localhost:8000/health
```

Response (200 OK):
```json
{
  "status": "ok"
}
```

#### GET /dishes
Retrieves all dish records sorted by dish ID.

Request:
```bash
curl -X GET http://localhost:8000/dishes
```

Response (200 OK):
```json
[
  {
    "dishId": "1",
    "dishName": "Jeera Rice",
    "imageUrl": "https://nosh-assignment.s3.ap-south-1.amazonaws.com/jeera-rice.jpg",
    "isPublished": true,
    "version": 1
  },
  {
    "dishId": "2",
    "dishName": "Paneer Tikka",
    "imageUrl": "https://nosh-assignment.s3.ap-south-1.amazonaws.com/paneer-tikka.jpg",
    "isPublished": true,
    "version": 1
  }
]
```

#### PATCH /dishes/:dishId
Updates the name and publication status of a dish using optimistic concurrency control.

Bash (curl):
```bash
curl -X PATCH http://localhost:8000/dishes/2 \
  -H "Content-Type: application/json" \
  -d '{"dishName":"Paneer Butter Masala","isPublished":true,"expectedVersion":1}'
```

PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/dishes/2" -Method Patch -ContentType "application/json" -Body '{"dishName":"Paneer Butter Masala","isPublished":true,"expectedVersion":1}'
```

Response (200 OK):
```json
{
  "dishId": "2",
  "dishName": "Paneer Butter Masala",
  "imageUrl": "https://nosh-assignment.s3.ap-south-1.amazonaws.com/paneer-tikka.jpg",
  "isPublished": true,
  "version": 2
}
```

### Error Responses

All API errors return a standard JSON error payload:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error description"
  }
}
```

| HTTP Status | Error Code | Description / Causes |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Non-string `dishName`, non-boolean `isPublished`, non-integer `expectedVersion` (< 1), missing `dishId`, whitespace-only name when published, or invalid image URL when published |
| 400 | `INVALID_JSON` | Malformed JSON syntax in request body |
| 404 | `NOT_FOUND` | Target dish ID does not exist in database |
| 409 | `VERSION_CONFLICT` | Stale `expectedVersion` provided. Body includes `"current"` with current server dish data |
| 500 | `INTERNAL_ERROR` | Unexpected server execution error |

Sample 409 Conflict Response:
```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Dish was updated by someone else"
  },
  "current": {
    "dishId": "2",
    "dishName": "Paneer Tikka Special",
    "imageUrl": "https://nosh-assignment.s3.ap-south-1.amazonaws.com/paneer-tikka.jpg",
    "isPublished": true,
    "version": 2
  }
}
```

---

## Architecture

The project architecture enforces separation of concerns across backend and frontend:

### Backend Layers
- `server.ts`: Entry point connecting to MongoDB and starting the Express HTTP listener.
- `app.ts`: Middleware configuration (CORS, JSON parsing with malformed syntax handling, routes, error handling).
- `validation.ts`: Pure validation functions checking parameter formats and business rules.
- `dishService.ts`: Data access layer executing atomic queries and optimistic locking logic.
- `models/Dish.ts`: Mongoose schema and model configuration.

### Frontend Layers
- `api.ts`: HTTP client mapping network requests and server response codes to `ApiClientError` domain models.
- `hooks/useDishes.ts`: Custom state management hook managing draft state, background polling, and optimistic UI transitions.
- `components/DishCard.tsx` & `DishImage.tsx`: Accessible presentation components managing card interactions and image fallbacks.
- `App.tsx`: Top-level component rendering grid layout, header indicators, and network status messages.

### Request Flow
```text
Browser Client -> Vite Dev Proxy (:5173) -> Express Server (:8000) -> validation -> dishService -> MongoDB
```

### Frontend State Model
- Each dish item maintains `saved` (confirmed server record) and `draft` (local uncommitted values).
- An item is marked dirty when `draft.dishName !== saved.dishName` or `draft.isPublished !== saved.isPublished`.
- Submitting Save sends draft values alongside `saved.version` as `expectedVersion`.
- On save success, `saved` updates to the returned object, `draft` synchronizes, and dirty status resets.
- Clicking Discard reverts `draft` to `saved` without network calls.
- Errors and 409 version conflicts never overwrite active user drafts.

---

## Design Decision: Optimistic Concurrency Control

Each dish document stores an integer `version` field. When updating a dish, the client supplies `expectedVersion`.

The backend performs a single atomic MongoDB operation:
```typescript
findOneAndUpdate(
  { dishId, version: input.expectedVersion },
  {
    $set: { dishName: input.dishName, isPublished: input.isPublished },
    $inc: { version: 1 }
  },
  { new: true }
)
```

Because the version match check and increment occur in a single atomic database operation, concurrent writes targeting the same version cannot both succeed. Exactly one update matches and writes; the other matches 0 documents.

When 0 documents match, the backend executes a secondary lookup by `dishId` to distinguish between `404 NOT_FOUND` and `409 VERSION_CONFLICT`. If the dish exists, the backend returns HTTP 409 with the current database state in the `current` field.

The frontend keeps the user's active draft intact, displays an inline conflict notification, and provides explicit options to reload latest server data or keep editing.

### Alternatives Considered
- **Last-Write-Wins**: Rejected because concurrent writes silently overwrite modifications made by other users without notice.
- **Pessimistic Locking**: Rejected because maintaining database locks across interactive user sessions creates significant overhead, deadlock risks, and stale lock management complexities.

---

## Acceptance Check Verification

### a) Setup and Reseed
1. Start MongoDB with `docker compose up -d` and run `npm run seed` in `/backend`.
2. Run `npm run seed` again. Output verifies: `Inserted 0, skipped 5 (already existed)`.
3. Modify a dish in the UI, save it, and re-run `npm run seed`. The edited dish retains its modified name and incremented version.

### b) Drafts Before Save
1. In the UI, modify a dish name and toggle the Published checkbox.
2. Confirm the card displays the "Unsaved changes" badge and "Saved value" line.
3. Run `curl -X GET http://localhost:8000/dishes` and confirm the server returns original data.
4. Click Discard on the card. Inputs revert to original values and badge displays "Saved".
5. Edit the dish again and click Save. Version increments by 1 and badge updates to "Saved".
6. Reload the page in the browser to verify changes persist.
7. Restart backend process and refresh frontend to confirm persistence.

### c) Backend Rejects Invalid Publish
1. Whitespace Name:
```bash
curl -X PATCH http://localhost:8000/dishes/1 \
  -H "Content-Type: application/json" \
  -d '{"dishName":"   ","isPublished":true,"expectedVersion":1}'
```
Expected: HTTP 400 `VALIDATION_ERROR` with message `A published dish must have a non-empty name`.

2. Invalid Image URL:
```bash
npm run seed:test
curl -X PATCH http://localhost:8000/dishes/test-bad-image \
  -H "Content-Type: application/json" \
  -d '{"dishName":"Bad Image Test Dish","isPublished":true,"expectedVersion":1}'
npm run seed:test:remove
```
Expected: HTTP 400 `VALIDATION_ERROR` with message `A published dish must have a valid http or https image URL`.

### d) Two-Tab Conflict
1. Open the dashboard in two separate browser tabs (Tab A and Tab B).
2. In Tab A, edit dish 2 and click Save (version increments).
3. In Tab B (without reloading), edit dish 2 and click Save.
4. Tab B displays the conflict banner stating the dish was updated elsewhere, while preserving local draft text.
5. In Tab B, click "Reload latest", confirm the inline confirmation ("Yes, discard my draft / Keep editing"), and verify the card updates with Tab A's saved content.

### e) Failed Save and Error Responses
1. Stop the backend process (`Ctrl+C`).
2. Edit a dish in the UI and click Save.
3. Confirm an error message appears stating the server cannot be reached, while the draft remains editable.
4. Restart the backend process (`npm run dev`) and click Save again to verify successful completion.
5. Test invalid request bodies:
```bash
curl -X PATCH http://localhost:8000/dishes/99999 -H "Content-Type: application/json" -d '{"dishName":"Valid Name","isPublished":true,"expectedVersion":1}'
curl -X PATCH http://localhost:8000/dishes/1 -H "Content-Type: application/json" -d '{"invalid: json'
```
Expected: HTTP 404 `NOT_FOUND` and HTTP 400 `INVALID_JSON`.

### f) External Updates
1. Open the dashboard in the browser.
2. Update an unedited dish via curl. The UI updates automatically within 4 seconds without reloading.
3. Edit a dish in the UI to create a dirty draft.
4. Send an update via curl for that same dish. The dirty draft is not overwritten; a "Newer saved data is available" banner appears with a "Load latest" button.

---

## Optional Bonus: External Updates

External update synchronization is implemented using client-side background polling at 4-second intervals (`POLL_INTERVAL_MS = 4000` in `useDishes.ts`):

- **Update Delay**: Changes from other clients or database updates appear within 4 seconds.
- **Clean Cards**: Cards with no unsaved changes update silently in place.
- **Draft Protection**: Cards with dirty drafts are never overwritten automatically. A "Newer saved data is available" banner is displayed.
- **Stale Response Protection**: Server responses with versions lower than or equal to current saved versions are ignored.
- **Active Save Protection**: Cards actively in flight during a Save request are skipped during merge cycles.
- **Resource Cleanup**: Interval timer, `AbortController`, and `visibilitychange` listeners are removed on hook unmount.
- **Tab Visibility**: Polling pauses when the document is hidden and triggers an immediate sync when returning to the tab.
- **Connection Loss Handling**: Network disconnections trigger `Connection lost - showing last known data, retrying...` status and recover automatically when connection is restored.
- **Direct Database Edits**: Direct updates to MongoDB documents are reflected on subsequent poll intervals.

---

## Known Limitations

- **Polling Mechanism**: Implemented using HTTP polling (4s interval) rather than Server-Sent Events (SSE) or WebSockets.
- **Authentication**: No user authentication or role-based authorization is configured.
- **Image URLs**: Image URLs are seeded initially and cannot be updated via the PATCH endpoint.
- **Pagination**: Dishes are returned in a single unpaginated array.
- **Automated Tests**: Unit testing test suites (e.g. Jest/Vitest) are not configured in the repository.
- **Inline Reload Confirmation**: Draft discard confirmation uses an inline UI state rather than modal overlays.
- **Production Deployment**: Cloud hosting and CI/CD pipelines are not configured.
- **Sorting**: Dishes are sorted numerically by dish ID.

---

## Time Spent

Approximate time spent: 4 hours

---

## AI and Reused-Code Disclosure

- **AI Tools**: Claude (Anthropic) was used for architecture design, requirements definition, and prompt formulation. The AI coding agent in the Antigravity IDE generated and refined code implementations.
- **Libraries**: Express, CORS, Mongoose, Dotenv, TypeScript, tsx, React, React DOM, Vite, and @vitejs/plugin-react (all installed via npm).
- **Reused Code**: No external code was copied or imported from third-party repositories.
- **Code Understanding**: All generated code was reviewed and understood, including optimistic draft state management, atomic database conditional updates, and concurrency conflict resolution.
