# Roommate Budget Tracker

Split expenses with your roommate.

## Run with Docker (recommended)

```bash
docker-compose up --build
```

Open http://localhost:8080

## Run locally (development)

```bash
# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## How to Use

1. Create a room, get a 6-character code
2. Share code with roommate
3. Both join with the code
4. Add expenses (who paid what)
5. See who owes whom

## API

```
POST /api/rooms              - Create room
POST /api/rooms/join         - Join with code + name
GET  /api/rooms/:id          - Get room details
POST /api/rooms/:id/expenses - Add expense
DELETE /api/rooms/:id/expenses/:expenseId
```
