import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { MdAdd, MdClose, MdFlag, MdDelete } from 'react-icons/md';

const GOAL_ICONS = ['🎯','🏠','✈️','🚗','💍','🎓','💻','🏋️','🛍️','💰','🏦','🌴','🎸','📱','🎮'];
const GOAL_COLORS = ['#7c6af7','#22d3a0','#f75a6a','#f7c46a','#45B7D1','#96CEB4','#FF6B6B','#4ECDC4'];

function GoalRing({ pct, color, size = 90 }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fill={color} fontSize={14} fontWeight={700} fontFamily="Syne,sans-serif">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function NewGoalModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', targetAmount: '', icon: '🎯', color: '#7c6af7', deadline: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.targetAmount) return toast.error('Fill in title and target amount');
    setLoading(true);
    try {
      await api.post('/goals', { ...form, targetAmount: parseFloat(form.targetAmount) });
      toast.success('Goal created! 🎯');
      onCreated();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>New Financial Goal</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}><MdClose size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {GOAL_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setForm(p => ({ ...p, icon: ic }))}
                  style={{ width: 38, height: 38, borderRadius: 8, border: `2px solid ${form.icon === ic ? form.color : 'var(--border)'}`, background: form.icon === ic ? form.color + '22' : 'var(--bg-elevated)', fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Color</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? 'white' : 'transparent'}`, cursor: 'pointer', transition: 'border 0.15s' }} />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Goal Name</label>
            <input className="input" required placeholder="e.g. Emergency Fund" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Target Amount</label>
              <input className="input" type="number" required min="1" placeholder="50000" value={form.targetAmount} onChange={e => setForm(p => ({ ...p, targetAmount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Deadline (optional)</label>
              <input className="input" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.5rem' }}>
            {loading ? <><div className="spinner" /> Creating...</> : 'Create Goal'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ContributeModal({ goal, onClose, onDone }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const remaining = goal.targetAmount - goal.savedAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount');
    setLoading(true);
    try {
      await api.post(`/goals/${goal._id}/contribute`, { amount: parseFloat(amount), note });
      toast.success('Contribution added! 💰');
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2>{goal.icon} Add to "{goal.title}"</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}><MdClose size={20} /></button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
          Remaining: <strong style={{ color: 'var(--text-primary)' }}>₹{remaining.toLocaleString()}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Amount to Add</label>
            <input className="input" type="number" required min="1" max={remaining} placeholder="e.g. 5000" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="label">Note (optional)</label>
            <input className="input" placeholder="Monthly savings..." value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
            {loading ? <><div className="spinner" /> Saving...</> : '+ Add Contribution'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [contributing, setContributing] = useState(null);

  const currency = user?.currency || 'INR';
  const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  const fetchGoals = async () => {
    setLoading(true);
    try { const { data } = await api.get('/goals'); setGoals(data.goals); }
    catch { toast.error('Failed to load goals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try { await api.delete(`/goals/${id}`); toast.success('Goal deleted'); fetchGoals(); }
    catch { toast.error('Failed to delete'); }
  };

  const active    = goals.filter(g => !g.isCompleted);
  const completed = goals.filter(g => g.isCompleted);

  return (
    <div className="animate-fade-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Financial Goals</h1>
          <p>Set targets, track progress, reach your milestones</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn btn-primary"><MdAdd size={18} /> New Goal</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
      ) : goals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎯</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>No goals yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Set a financial goal and track your progress towards it.</p>
          <button onClick={() => setShowNew(true)} className="btn btn-primary"><MdAdd size={18} /> Create your first goal</button>
        </div>
      ) : (
        <>
          {/* Active Goals */}
          {active.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>Active · {active.length}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {active.map(goal => {
                  const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
                  const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
                  const overdue  = daysLeft !== null && daysLeft < 0;
                  return (
                    <div key={goal._id} className="card" style={{ borderColor: goal.color + '44', position: 'relative', overflow: 'hidden' }}>
                      {/* color accent strip */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: goal.color }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.3rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{goal.icon}</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>{goal.title}</div>
                          {goal.deadline && (
                            <div style={{ fontSize: '0.75rem', color: overdue ? 'var(--red)' : 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <MdFlag size={12} /> {overdue ? `Overdue by ${Math.abs(daysLeft)}d` : `${daysLeft}d left · ${format(new Date(goal.deadline), 'MMM d, yyyy')}`}
                            </div>
                          )}
                        </div>
                        <GoalRing pct={pct} color={goal.color} size={80} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.6rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Saved</span>
                        <span style={{ fontWeight: 600 }}>{fmt(goal.savedAmount)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>of {fmt(goal.targetAmount)}</span></span>
                      </div>

                      <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', marginBottom: '1rem' }}>
                        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: goal.color, borderRadius: 3, transition: 'width 1s ease' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setContributing(goal)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.55rem' }}>
                          + Add Money
                        </button>
                        <button onClick={() => handleDelete(goal._id)} className="btn btn-danger" style={{ padding: '0.55rem 0.7rem' }}>
                          <MdDelete size={16} />
                        </button>
                      </div>

                      {/* Recent contributions */}
                      {goal.contributions?.length > 0 && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last contributions</div>
                          {goal.contributions.slice(-3).reverse().map((c, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.15rem 0' }}>
                              <span>{c.note || 'Contribution'}</span>
                              <span style={{ color: goal.color, fontWeight: 600 }}>+{fmt(c.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Completed Goals */}
          {completed.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>✅ Completed · {completed.length}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {completed.map(goal => (
                  <div key={goal._id} className="card" style={{ borderColor: 'var(--green)', opacity: 0.85 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.8rem' }}>{goal.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{goal.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--green)' }}>🏆 Goal reached! {fmt(goal.targetAmount)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showNew && <NewGoalModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); fetchGoals(); }} />}
      {contributing && <ContributeModal goal={contributing} onClose={() => setContributing(null)} onDone={() => { setContributing(null); fetchGoals(); }} />}
    </div>
  );
}
