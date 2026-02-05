export interface Room {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface Member {
  id: string;
  room_id: string;
  name: string;
  created_at: string;
}

export interface Expense {
  id: string;
  room_id: string;
  category: string;
  description: string | null;
  amount: number;
  paid_by: string;
  split_type: string;
  created_at: string;
}

export interface MemberBalance {
  paid: number;
  owes: number;
  balance: number;
}

export interface BalanceResponse {
  totalExpenses: number;
  perPerson: number;
  breakdown: Record<string, MemberBalance>;
  settlement: string | null;
}

export interface RoomWithDetails {
  room: Room;
  members: Member[];
  expenses: Expense[];
  balance: BalanceResponse;
}

export type ExpenseCategory = 'Rent' | 'Utilities' | 'Groceries';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Rent', 'Utilities', 'Groceries'];
