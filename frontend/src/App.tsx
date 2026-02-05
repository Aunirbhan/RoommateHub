import { useState, useEffect } from 'react';
import { api, Room, Member, Expense, RoomData } from './api';

type View = 'home' | 'room';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [roomId, setRoomId] = useState('');
  const [memberId, setMemberId] = useState('');

  const goToRoom = (rId: string, mId: string) => {
    setRoomId(rId);
    setMemberId(mId);
    setView('room');
  };

  const goHome = () => {
    setView('home');
    setRoomId('');
    setMemberId('');
  };

  return (
    <div className="container">
      {view === 'home' && <HomePage onJoinRoom={goToRoom} />}
      {view === 'room' && <RoomPage roomId={roomId} memberId={memberId} onBack={goHome} />}
    </div>
  );
}

function HomePage({ onJoinRoom }: { onJoinRoom: (roomId: string, memberId: string) => void }) {
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [memberName, setMemberName] = useState('');
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!roomName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const room = await api.createRoom(roomName);
      setCreatedRoom(room);
      setRoomName('');
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !memberName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { room, member } = await api.joinRoom(joinCode, memberName);
      onJoinRoom(room.id, member.id);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <>
      <h1>Roommate Budget</h1>
      <p className="subtitle">Split expenses with your roommate</p>

      {error && <div className="error">{error}</div>}

      {createdRoom ? (
        <div className="card">
          <h2>Room Created!</h2>
          <p style={{ marginBottom: 12, color: '#a1a1aa' }}>Share this code with your roommate:</p>
          <div className="room-code" style={{ fontSize: 24, textAlign: 'center', padding: 16 }}>
            {createdRoom.code}
          </div>
          <p style={{ marginTop: 16, marginBottom: 16, color: '#a1a1aa', fontSize: 13 }}>
            Now join the room yourself:
          </p>
          <input
            placeholder="Your name"
            value={memberName}
            onChange={e => setMemberName(e.target.value)}
          />
          <button onClick={() => {
            if (memberName.trim()) {
              setJoinCode(createdRoom.code);
              handleJoin();
            }
          }} disabled={loading || !memberName.trim()}>
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Create New Room</h2>
            <input
              placeholder="Room name (e.g., Apt 4B)"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button onClick={handleCreate} disabled={loading || !roomName.trim()}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>

          <div className="divider">or join an existing room</div>

          <div className="card">
            <h2>Join Room</h2>
            <input
              placeholder="Room code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ fontFamily: 'monospace', letterSpacing: 2 }}
            />
            <input
              placeholder="Your name"
              value={memberName}
              onChange={e => setMemberName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button onClick={handleJoin} disabled={loading || !joinCode.trim() || !memberName.trim()}>
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </>
      )}
    </>
  );
}

function RoomPage({ roomId, memberId, onBack }: { roomId: string; memberId: string; onBack: () => void }) {
  const [data, setData] = useState<RoomData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRoom = async () => {
    try {
      const roomData = await api.getRoom(roomId);
      setData(roomData);
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, [roomId]);

  const handleDelete = async (expenseId: string) => {
    try {
      await api.deleteExpense(roomId, expenseId);
      fetchRoom();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: 40 }}>Loading...</p>;
  if (!data) return <p style={{ textAlign: 'center', marginTop: 40 }}>Room not found</p>;

  const { room, members, expenses, balance } = data;
  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown';

  return (
    <>
      <button className="back-btn" onClick={onBack}>← Leave Room</button>

      <div className="room-header">
        <h1 style={{ fontSize: 22, marginBottom: 0 }}>{room.name}</h1>
        <span className="room-code">{room.code}</span>
      </div>

      <p className="members">
        {members.length === 0 ? 'No members yet' : members.map(m => m.name).join(' & ')}
      </p>

      {error && <div className="error">{error}</div>}

      <div className="card balance-card">
        <div className="balance-amount">{balance.settlement || 'All settled!'}</div>
        <div className="balance-label">
          Total: ${balance.totalExpenses.toFixed(2)} • ${balance.perPerson.toFixed(2)}/person
        </div>
      </div>

      <div className="card">
        <h2>Expenses</h2>
        {expenses.length === 0 ? (
          <p style={{ color: '#71717a', fontSize: 14 }}>No expenses yet</p>
        ) : (
          <ul className="expense-list">
            {expenses.map(exp => (
              <li key={exp.id} className="expense-item">
                <div className="expense-info">
                  <div className="expense-category">{exp.category}</div>
                  {exp.description && <div className="expense-desc">{exp.description}</div>}
                  <div className="expense-payer">Paid by {getMemberName(exp.paid_by)}</div>
                </div>
                <span className="expense-amount">${exp.amount.toFixed(2)}</span>
                <button className="delete-btn" onClick={() => handleDelete(exp.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
        {members.length >= 2 && (
          <button className="add-expense-btn" onClick={() => setShowModal(true)}>+ Add Expense</button>
        )}
        {members.length < 2 && (
          <p style={{ color: '#71717a', fontSize: 13, marginTop: 12 }}>
            Waiting for roommate to join...
          </p>
        )}
      </div>

      {showModal && (
        <ExpenseModal
          roomId={roomId}
          members={members}
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); fetchRoom(); }}
        />
      )}
    </>
  );
}

function ExpenseModal({ roomId, members, onClose, onAdded }: {
  roomId: string;
  members: Member[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [category, setCategory] = useState('Rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(members[0]?.id || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.addExpense(roomId, {
        category,
        description: description || undefined,
        amount: numAmount,
        paidBy,
      });
      onAdded();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Add Expense</h2>
        {error && <div className="error">{error}</div>}
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="Rent">Rent</option>
          <option value="Utilities">Utilities</option>
          <option value="Groceries">Groceries</option>
        </select>
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          step="0.01"
          min="0"
        />
        <select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name} paid</option>
          ))}
        </select>
        <div className="btn-row">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
