import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { Room, Member, Expense, EXPENSE_CATEGORIES, MemberBalance } from '../types';

const router = Router();

function calculateBalance(members: Member[], expenses: Expense[]) {
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

// POST /api/rooms/:roomId/expenses - Add a new expense
router.post('/:roomId/expenses', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { category, description, amount, paidBy } = req.body;

  // Validate room exists
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as Room | undefined;
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  // Validate category
  if (!category || !EXPENSE_CATEGORIES.includes(category)) {
    res.status(400).json({ error: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}` });
    return;
  }

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'Amount must be positive' });
    return;
  }

  // Validate paidBy member exists and is in this room
  const member = db.prepare('SELECT * FROM members WHERE id = ? AND room_id = ?').get(paidBy, roomId) as Member | undefined;
  if (!member) {
    res.status(400).json({ error: 'Invalid member' });
    return;
  }

  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO expenses (id, room_id, category, description, amount, paid_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, roomId, category, description || null, amount, paidBy);

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Expense;

  // Calculate new balance
  const members = db.prepare('SELECT * FROM members WHERE room_id = ?').all(roomId) as Member[];
  const expenses = db.prepare('SELECT * FROM expenses WHERE room_id = ?').all(roomId) as Expense[];
  const newBalance = calculateBalance(members, expenses);

  res.status(201).json({ expense, newBalance });
});

// DELETE /api/rooms/:roomId/expenses/:expenseId - Delete an expense
router.delete('/:roomId/expenses/:expenseId', (req: Request, res: Response) => {
  const { roomId, expenseId } = req.params;

  // Validate room exists
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as Room | undefined;
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  // Validate expense exists and belongs to this room
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND room_id = ?').get(expenseId, roomId) as Expense | undefined;
  if (!expense) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }

  db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);

  res.json({ success: true });
});

export default router;
