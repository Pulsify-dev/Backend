<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/AWS_S3-FF9900?style=for-the-badge&logo=amazons3&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Stripe_(Mock)-635BFF?style=for-the-badge&logo=stripe&logoColor=white" />
</p>

<h1 align="center">🎵 Pulsify</h1>

<p align="center">
  <strong>A full-featured SoundCloud clone — Backend REST API</strong><br/>
  <sub>Built for CMPS203 Software Engineering · Spring 2026</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tests-372_passing-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/coverage-99.15%25-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/modules-12%2F12-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/endpoints-100%2B-blue?style=flat-square" />
</p>

---

## What is Pulsify?

Pulsify is a production-grade backend for an audio streaming platform — think SoundCloud, rebuilt from scratch. Users can upload tracks, build playlists and albums, follow artists, comment at specific timestamps in a song, receive real-time notifications, message each other, and subscribe to premium plans — all through a secure, documented REST API backed by real-time Socket.IO events.

This is **not a prototype**. It's a 19-service, 16-repository, 19-model system with JWT auth, role-based access control, S3 file storage, Meilisearch full-text search, Redis caching, BullMQ job queues, and a mock Stripe subscription lifecycle — fully tested with 99%+ code coverage.

---

## Feature Highlights

| | Feature | What it does |
|---|---------|-------------|
| 🔐 | **Auth & Identity** | Email/password + Google/Facebook/Apple OAuth, CAPTCHA, email verification, password reset, JWT + refresh token rotation |
| 🎵 | **Audio Engine** | Multi-format upload (MP3/WAV/FLAC), automatic metadata extraction, waveform generation, S3 storage, transcoding pipeline via BullMQ |
| 🎧 | **Streaming** | Pre-signed URL streaming, playback state tracking, download entitlements, play history with "recently played" |
| 💬 | **Social Layer** | Follow/unfollow, user blocking, mutual followers, suggested users, reposts to feed |
| 🗨️ | **Engagement** | Timestamped comments on audio waveforms, likes on tracks & albums, repost system |
| 📋 | **Playlists & Albums** | CRUD with drag-and-drop reordering, privacy settings, secret share tokens, embed codes, album quota enforcement |
| 🔍 | **Discovery** | Meilisearch-powered search across tracks/users/playlists, trending algorithm, charts, personal activity feed, URL resolver |
| 💌 | **Messaging** | 1-to-1 DMs with in-chat track/playlist previews, unread counts, Socket.IO real-time delivery |
| 🔔 | **Notifications** | Real-time alerts for follows/likes/reposts/comments/messages via Socket.IO + Firebase push notifications |
| 🛡️ | **Admin & Moderation** | Report system, content blocking/removal, user suspension, role management, platform analytics dashboard |
| 💳 | **Subscriptions** | Free vs Artist Pro tiers, upload quotas, mock Stripe checkout + webhook lifecycle, cron-based expiry, album-preserving downgrade |

---

## Architecture

```
Client ──▶ Routes ──▶ Middleware ──▶ Controllers ──▶ Services ──▶ Repositories ──▶ Models
                         │                                            │
                    Auth / Upload                                  MongoDB
                    Validation / Rate                              AWS S3
                    Limiting / Quota                               Redis
```

Every layer has a single responsibility. Controllers are thin — they parse requests and send responses. All business logic lives in the service layer. Database operations are abstracted behind repositories. This makes every component independently testable.

**Key infrastructure:**

- **Express 5** with async error handling, Helmet security headers, CORS, and global rate limiting
- **Socket.IO** with Redis adapter for scalable real-time events
- **BullMQ** workers for background audio processing
- **node-cron** for scheduled jobs (trending scores, subscription expiry)
- **c8 + Mocha + Sinon** for unit testing with 99.15% statement coverage

---

## Project Structure

```text
Backend/
├── server.js                    # Entry point — connects DB, starts Express
├── Dockerfile                   # Container configuration
├── package.json
│
├── src/
│   ├── app.js                   # Express app setup + middleware + route mounting
│   │
│   ├── config/                  # Database & environment configuration
│   │
│   ├── models/                  # Mongoose schemas
│   │
│   ├── repositories/            # Data access layer
│   │
│   ├── services/                # Business logic layer
│   │
│   ├── controllers/             # Request/response handlers
│   │
│   ├── routes/                  # Route definitions
│   │
│   ├── middleware/              # Express middleware
│   │
│   ├── utils/                   # Shared utilities
│   │
│   └── tests/                   # Unit tests
│
├── PostDoc/                     # API documentation (Postman collections)
│
├── ReqDocs/                     # Requirements & specifications
│
└── seed/                        # Database seeding scripts
```

---

## Quick Start

```bash
# Clone & install
git clone https://github.com/Pulsify-dev/Backend.git
cd Backend
npm install

# Configure environment
cp .env.example .env   # Fill in your MongoDB URI, JWT secrets, AWS keys

# Seed the database
node seed/plan-limits.seed.js   # Required: sets up Free & Artist Pro plan limits
node seed/test-users.seed.js    # Optional: creates sample users

# Start
npm run dev     # Development with auto-reload
npm start       # Production
```

### Docker

```bash
docker build -t pulsify-backend .
docker run -p 3000:3000 --env-file .env pulsify-backend
```

### Health Check

```
GET /v1          →  "Pulsify API is Live!"
GET /v1/health   →  { "status": "ok", "uptime": 123.45 }
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Database | MongoDB Atlas via Mongoose 9 |
| Real-time | Socket.IO 4 + Redis Adapter |
| File Storage | AWS S3 |
| Search | Meilisearch |
| Caching | Redis (ioredis) |
| Job Queue | BullMQ |
| Auth | JWT + bcrypt + Google/Apple/Facebook OAuth |
| Payments | Stripe (mock) |
| Push Notifications | Firebase Cloud Messaging |
| Audio Processing | fluent-ffmpeg + music-metadata |
| Image Processing | Sharp |
| Validation | Joi |
| Email | Nodemailer |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Mocha + Chai + Sinon + c8 |
| Containerization | Docker + Docker Compose |

---

## API Documentation

Every endpoint is documented with Postman collections including request examples, response samples, and pre-configured variables.

```
PostDoc/
├── Auth_Module.postman_collection.json
├── Users_Module.postman_collection.json
├── Social_Module.postman_collection.json
├── Tracks_Module.postman_collection.json
├── Streaming_Module.postman_collection.json
├── Engagement_Module.postman_collection.json
├── Playlist_Module.postman_collection.json
├── Album_Module.postman_collection.json
├── Discovery_Module.postman_collection.json
├── Messaging_Module.postman_collection.json
├── Messaging_SocketIO_Module.postman_collection.json
├── Notification_Module.postman_collection.json
├── Notification_SocketIO_Module.postman_collection.json
├── Moderation_Module.postman_collection.json
├── Subscription_Module.postman_collection.json
└── Pulsify_Local_Environment.postman_environment.json
```

Import into Postman → set the environment → start testing.

---

## Testing

```bash
npm test   # Runs all 372 unit tests with coverage report
```

```
  372 passing

  All files            | 99.15% Stmts | 92.51% Branch
  subscription.service | 99.51%
  streaming.service    | 100%
  track.service        | 99.3%
```

---

## Team

Built by the **Pulsify** team for CMPS203 Software Engineering, Spring 2026.

<p align="center">
  Made with ❤️ and a lot of ☕
</p>
