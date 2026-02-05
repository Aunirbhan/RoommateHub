# Roommate Budget Tracker - PRD

## What This Is

A shared budget tracker for NYC roommates. Two people join the same room via code, input their monthly expenses, and see a clear breakdown of who owes what.

**Build time:** 4-6 hours  
**Stack:** TypeScript, Express, React, SQLite, Docker

---

## Core Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Landing Page   │────▶│   Room View     │────▶│  Budget Split   │
│                 │     │                 │     │                 │
│ [Create Room]   │     │ Members: 2      │     │ Rent: $3000     │
│ [Join Room]     │     │ Budget items    │     │ You owe: $1650  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## User Stories

1. **Create Room:** I click "Create Room" → get a 6-char code → share with roommate
2. **Join Room:** I enter code + my name → see shared budget
3. **Add Expense:** I add "Rent - $3000" → select who paid → auto-splits
4. **View Balance:** I see "You owe Alex $150" or "Alex owes you $150"

---

## Data Model

```sql
-- rooms: A shared space between roommates
CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- members: People in a room (max 2 for MVP)
CREATE TABLE members (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- expenses: Shared costs
CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    paid_by TEXT NOT NULL REFERENCES members(id),
    split_type TEXT DEFAULT 'equal',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Expense Categories (NYC Defaults)

| Category | Typical Range | Notes |
|----------|---------------|-------|
| Rent | $2500-4000 | Usually split 50/50 or by room size |
| Utilities | $100-200 | Electric, gas, internet |
| Groceries | $400-800 | Shared household items |

**Groceries sub-items (expandable):**
- Household supplies (paper towels, soap, etc.)
- Shared food (milk, eggs, bread, etc.)
- Cleaning supplies

---

## API Endpoints

### Rooms

```
POST /api/rooms
  Body: { name: string }
  Response: { id, code, name }

POST /api/rooms/join
  Body: { code: string, memberName: string }
  Response: { room, member }
  Error: { error: "Invalid code" } | { error: "Room full" }

GET /api/rooms/:roomId
  Response: { room, members[], expenses[], balance }
```

### Expenses

```
POST /api/rooms/:roomId/expenses
  Body: { category, description?, amount, paidBy }
  Response: { expense, newBalance }

DELETE /api/rooms/:roomId/expenses/:expenseId
  Response: { success: true }
```

### Balance Calculation

```
GET /api/rooms/:roomId/balance
  Response: {
    totalExpenses: 3200,
    perPerson: 1600,
    breakdown: {
      "member-1": { paid: 1800, owes: 1600, balance: +200 },
      "member-2": { paid: 1400, owes: 1600, balance: -200 }
    },
    settlement: "Alex owes Jordan $200"
  }
```

---

## Project Structure

```
roommate-budget/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── db.ts
│       ├── routes/
│       │   ├── rooms.ts
│       │   └── expenses.ts
│       └── types.ts
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api.ts
│       ├── pages/
│       │   ├── Home.tsx
│       │   └── Room.tsx
│       └── components/
│           ├── ExpenseForm.tsx
│           ├── ExpenseList.tsx
│           └── BalanceCard.tsx
└── data/
    └── .gitkeep
```

---

## Docker Setup

**docker-compose.yml:**
```yaml
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_PATH=/app/data/budget.db

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3001/api
    depends_on:
      - backend
```

**Why Docker makes sense here:**
- SQLite database persists in mounted volume
- Both services start with one command
- Easy to share: clone → `docker-compose up` → works
- No "works on my machine" issues

---

## Implementation Checklist

### Backend (2 hours)

- [ ] `npm init` + install: express, cors, better-sqlite3, uuid, typescript, ts-node, @types/*
- [ ] Create tsconfig.json
- [ ] Create src/db.ts - SQLite connection + schema init
- [ ] Create src/types.ts - Room, Member, Expense interfaces
- [ ] Create src/routes/rooms.ts - POST /rooms, POST /rooms/join, GET /rooms/:id
- [ ] Create src/routes/expenses.ts - POST + DELETE expenses
- [ ] Create src/index.ts - Express app with routes
- [ ] Create Dockerfile
- [ ] Test with curl

### Frontend (2 hours)

- [ ] `npm create vite@latest` with React + TypeScript
- [ ] Install: axios, tailwindcss, postcss, autoprefixer
- [ ] Configure Tailwind
- [ ] Create src/api.ts - Axios client
- [ ] Create pages/Home.tsx - Create/Join room forms
- [ ] Create pages/Room.tsx - Main room view
- [ ] Create components/ExpenseForm.tsx - Add expense modal
- [ ] Create components/ExpenseList.tsx - List with delete
- [ ] Create components/BalanceCard.tsx - Who owes whom
- [ ] Create Dockerfile

### Integration (1 hour)

- [ ] Write docker-compose.yml
- [ ] Test full flow end-to-end
- [ ] Fix any CORS/API issues

---

## Test Cases

### Room Creation & Joining

| # | Test | Input | Expected |
|---|------|-------|----------|
| 1 | Create room | name: "Apt 4B" | Returns 6-char code |
| 2 | Join with valid code | code: "ABC123", name: "Alex" | Joins room, sees empty budget |
| 3 | Join with invalid code | code: "XXXXXX" | Error: "Invalid code" |
| 4 | Join full room (3rd person) | code with 2 members | Error: "Room full" |
| 5 | Duplicate name in room | Same name as existing member | Error: "Name taken" |

### Expense Management

| # | Test | Input | Expected |
|---|------|-------|----------|
| 6 | Add rent expense | category: "Rent", amount: 3000, paidBy: member1 | Expense saved, balance updates |
| 7 | Add grocery item | category: "Groceries", desc: "Paper towels", amount: 15 | Added to list |
| 8 | Delete expense | expenseId | Removed, balance recalculates |
| 9 | Zero amount | amount: 0 | Error: "Amount must be positive" |
| 10 | Negative amount | amount: -50 | Error: "Amount must be positive" |

### Balance Calculation

| # | Test | Scenario | Expected |
|---|------|----------|----------|
| 11 | Equal spending | Both paid $500 | Balance: $0 each |
| 12 | One paid all | Member1 paid $1000, Member2 paid $0 | Member2 owes Member1 $500 |
| 13 | Unequal spending | Member1: $800, Member2: $400 | Member2 owes Member1 $200 |

### Manual Test Script

```bash
# 1. Create room
curl -X POST http://localhost:3001/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Apt"}'
# Save the code from response

# 2. Join as first member
curl -X POST http://localhost:3001/api/rooms/join \
  -H "Content-Type: application/json" \
  -d '{"code":"CODE_HERE","memberName":"Alex"}'

# 3. Join as second member
curl -X POST http://localhost:3001/api/rooms/join \
  -H "Content-Type: application/json" \
  -d '{"code":"CODE_HERE","memberName":"Jordan"}'

# 4. Add expense
curl -X POST http://localhost:3001/api/rooms/ROOM_ID/expenses \
  -H "Content-Type: application/json" \
  -d '{"category":"Rent","amount":3000,"paidBy":"MEMBER_ID"}'

# 5. Check balance
curl http://localhost:3001/api/rooms/ROOM_ID
```

---

## UI Wireframes

### Home Page
```
┌────────────────────────────────────┐
│        🏠 Roommate Budget          │
│                                    │
│  ┌──────────────────────────────┐  │
│  │     Create New Room          │  │
│  │  Room Name: [___________]    │  │
│  │  [Create Room]               │  │
│  └──────────────────────────────┘  │
│                                    │
│              ─ or ─                │
│                                    │
│  ┌──────────────────────────────┐  │
│  │     Join Existing Room       │  │
│  │  Room Code: [______]         │  │
│  │  Your Name: [___________]    │  │
│  │  [Join Room]                 │  │
│  └──────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘
```

### Room View
```
┌────────────────────────────────────┐
│  Apt 4B                Code: XK7M2P│
│  Members: Alex, Jordan             │
├────────────────────────────────────┤
│  💰 Balance                        │
│  ┌──────────────────────────────┐  │
│  │  Jordan owes Alex $200       │  │
│  └──────────────────────────────┘  │
├────────────────────────────────────┤
│  📋 Expenses            [+ Add]    │
│  ┌──────────────────────────────┐  │
│  │  Rent         $3000   Alex  🗑│  │
│  │  Utilities    $150    Jordan🗑│  │
│  │  Groceries    $85     Alex  🗑│  │
│  │  > Paper towels  $15        │  │
│  │  > Cleaning supplies $20    │  │
│  │  > Shared food $50          │  │
│  └──────────────────────────────┘  │
├────────────────────────────────────┤
│  Total: $3235                      │
│  Per person: $1617.50              │
└────────────────────────────────────┘
```

---

## Clarifications Needed

**Before building, confirm:**

1. **Split logic:** Always 50/50, or allow custom splits (60/40 for different room sizes)?
   - *Default: 50/50 for MVP*

2. **Expense editing:** Can users edit expenses or only delete and re-add?
   - *Default: Delete only for MVP*

3. **Persistence:** Should data survive server restarts?
   - *Default: Yes, SQLite file in Docker volume*

4. **Member limit:** Strictly 2, or allow 3-4?
   - *Default: Max 2 for MVP*

5. **Categories:** Fixed list or user-defined?
   - *Default: Fixed (Rent, Utilities, Groceries) for MVP*

---

## Definition of Done

This project is **complete** when:

- [ ] `docker-compose up` starts both services
- [ ] Can create room and get shareable code
- [ ] Second person can join with code
- [ ] Both see same expense list in real-time (on refresh)
- [ ] Adding expense updates balance correctly
- [ ] Balance shows who owes whom
- [ ] Deleting expense recalculates balance
- [ ] Works on mobile browser (responsive)
- [ ] Pushed to GitHub with README

---

## Commands to Get Started

```bash
# In your empty project folder:
mkdir -p backend/src/routes frontend/src/{pages,components} data
touch data/.gitkeep

# Then tell Claude Code:
# "Read PRD.md and build the backend first. Start with db.ts and types.ts"
```