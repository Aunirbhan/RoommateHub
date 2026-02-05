// In Docker: nginx proxies /api to backend. Locally: use localhost:3001
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export interface Room {
  id: string;
  code: string;
  name: string;
}

export interface Member {
  id: string;
  room_id: string;
  name: string;
}

export interface Expense {
  id: string;
  room_id: string;
  category: string;
  description: string | null;
  amount: number;
  paid_by: string;
}

export interface Balance {
  totalExpenses: number;
  perPerson: number;
  settlement: string | null;
}

export interface RoomData {
  room: Room;
  members: Member[];
  expenses: Expense[];
  balance: Balance;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  createRoom: (name: string) =>
    request<Room>('/rooms', { method: 'POST', body: JSON.stringify({ name }) }),

  joinRoom: (code: string, memberName: string) =>
    request<{ room: Room; member: Member }>('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ code, memberName })
    }),

  getRoom: (roomId: string) =>
    request<RoomData>(`/rooms/${roomId}`),

  addExpense: (roomId: string, data: { category: string; description?: string; amount: number; paidBy: string }) =>
    request<{ expense: Expense }>(`/rooms/${roomId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  deleteExpense: (roomId: string, expenseId: string) =>
    request<{ success: boolean }>(`/rooms/${roomId}/expenses/${expenseId}`, { method: 'DELETE' }),
};
