# API Reference

Base URL: `http://localhost:3000`

## Chat

```
POST /agents/:id/chat
```

```json
{
  "message": "What are your hours?",
  "sessionId": "uuid",
  "language": "en",
  "channel": "web",
  "unhelpfulRating": false
}
```

Response:

```json
{
  "id": "uuid",
  "content": "We are open Monday to Friday...",
  "language": "en",
  "escalated": false,
  "confidence": 0.82,
  "conversationId": "uuid"
}
```

## Documents

```
GET    /agents/:id/documents       — List documents (requires x-api-key)
POST   /agents/:id/documents       — Add document { "source": "..." }
DELETE /agents/:id/documents/:docId
```

## Config

```
GET   /agents/:id/config
PATCH /agents/:id/config
```

## Analytics

```
GET /agents/:id/analytics
```

## Webhooks

```
GET  /webhooks/whatsapp   — Meta verification
POST /webhooks/whatsapp   — Inbound messages
POST /webhooks/voice      — Africa's Talking callbacks
```

## Mock Endpoints

```
POST /mock/whatsapp/inbound  — { "from": "+233...", "message": "Hello" }
GET  /mock/whatsapp/log
POST /mock/voice/ivr
```

## Health

```
GET /health
```
