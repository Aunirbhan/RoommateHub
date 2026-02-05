import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { Room, Member, Expense, BalanceResponse, MemberBalance } from '../types';

const router = Router();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function calculateBalance(members: Member[], expenses: Expense[]): BalanceResponse {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const memberCount = members.length;
  const perPerson = memberCount > 0 ? totalExpenses / memberCount : 0;

  const breakdown: Record<string, MemberBalance> = {};

  for (const member of members) {
    const paid = expenses
      .filter(e => e.paid_by === member.id)
      .reduce((sum, e) => sum + e.amount, 0);

    breakdown[member.id] = {
      paid,
      owes: perPerson,
      balance: paid - perPerson
    };
  }

  let settlement: string | null = null;
  if (members.length === 2) {
    const [m1, m2] = members;
    const b1 = breakdown[m1.id].balance;
    const b2 = breakdown[m2.id].balance;

    if (b1 > 0.01) {
      settlement = `${m2.name} owes ${m1.name} $${Math.abs(b1).toFixed(2)}`;
    } else if (b2 > 0.01) {
      settlement = `${m1.name} owes ${m2.name} $${Math.abs(b2).toFixed(2)}`;
    } else {
      settlement = 'All settled up!';
    }
  }

  return {
    totalExpenses,
    perPerson,
    breakdown,
    settlement
  };
}

// POST /api/rooms - Create a new room
router.post('/', (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Room name is required' });
    return;
  }

  const id = uuidv4();
  let code = generateCode();

  // Ensure unique code
  const existingRoom = db.prepare('SELECT id FROM rooms WHERE code = ?').get(code);
  while (existingRoom) {
    code = generateCode();
  }

  const stmt = db.prepare('INSERT INTO rooms (id, code, name) VALUES (?, ?, ?)');
  stmt.run(id, code, name.trim());

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room;
  res.status(201).json(room);
});

// POST /api/rooms/join - Join an existing room
router.post('/join', (req: Request, res: Response) => {
  const { code, memberName } = req.body;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Room code is required' });
    return;
  }

  if (!memberName || typeof memberName !== 'string' || memberName.trim().length === 0) {
    res.status(400).json({ error: 'Member name is required' });
    return;
  }

  const room = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code.toUpperCase()) as Room | undefined;

  if (!room) {
    res.status(404).json({ error: 'Invalid code' });
    return;
  }

  const members = db.prepare('SELECT * FROM members WHERE room_id = ?').all(room.id) as Member[];

  if (members.length >= 2) {
    res.status(400).json({ error: 'Room full' });
    return;
  }

  const existingName = members.find(m => m.name.toLowerCase() === memberName.trim().toLowerCase());
  if (existingName) {
    res.status(400).json({ error: 'Name taken' });
    return;
  }

  const memberId = uuidv4();
  const stmt = db.prepare('INSERT INTO members (id, room_id, name) VALUES (?, ?, ?)');
  stmt.run(memberId, room.id, memberName.trim());

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) as Member;

  res.status(201).json({ room, member });
});

// GET /api/rooms/:roomId - Get room details with members, expenses, and balance
router.get('/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as Room | undefined;

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const members = db.prepare('SELECT * FROM members WHERE room_id = ? ORDER BY created_at').all(roomId) as Member[];
  const expenses = db.prepare('SELECT * FROM expenses WHERE room_id = ? ORDER BY created_at DESC').all(roomId) as Expense[];
  const balance = calculateBalance(members, expenses);

  res.json({
    room,
    members,
    expenses,
    balance
  });
});

// GET /api/rooms/:roomId/balance - Get balance calculation only
router.get('/:roomId/balance', (req: Request, res: Response) => {
  const { roomId } = req.params;

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as Room | undefined;

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const members = db.prepare('SELECT * FROM members WHERE room_id = ?').all(roomId) as Member[];
  const expenses = db.prepare('SELECT * FROM expenses WHERE room_id = ?').all(roomId) as Expense[];
  const balance = calculateBalance(members, expenses);

  res.json(balance);
});

export default router;
