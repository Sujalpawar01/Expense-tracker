import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { MdPerson, MdEmail, MdAttachMoney, MdSave } from 'react-icons/md';

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' }
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', currency: user?.currency || 'INR', monthlyBudget: user?.monthlyBudget || '' });
  const [loading, setLoading] = useState(false);
  const [achievements, setAchievements] = useState(null);

  useEffect(() => {
    api.get('/auth/achievements').then(({ data }) => setAchievements(data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="page-header">
        <h1>Profile Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div style={{ maxWidth: 540 }}>
        {/* Avatar */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', color: 'white', flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem' }}>{user?.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <MdEmail size={14} /> {user?.email}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>Update Details</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <MdPerson style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input className="input" style={{ paddingLeft: '2.5rem' }} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Email (cannot change)</label>
              <div style={{ position: 'relative' }}>
                <MdEmail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input className="input" style={{ paddingLeft: '2.5rem', opacity: 0.5 }} value={user?.email} disabled />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Monthly Budget</label>
              <div style={{ position: 'relative' }}>
                <MdAttachMoney style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                <input className="input" type="number" style={{ paddingLeft: '2.5rem' }} placeholder="Set your monthly budget..." value={form.monthlyBudget} onChange={e => setForm(p => ({ ...p, monthlyBudget: e.target.value }))} min="0" />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Used to track your monthly spending progress</div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.5rem' }}>
              {loading ? <><div className="spinner" /> Saving...</> : <><MdSave size={18} /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Achievements */}
        {achievements && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem' }}>🏆 Achievements</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-light)', fontWeight: 600 }}>
                {achievements.unlocked}/{achievements.total} unlocked
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', marginBottom: '1.2rem' }}>
              <div style={{ height: '100%', width: `${Math.round((achievements.unlocked / achievements.total) * 100)}%`, background: 'linear-gradient(90deg, var(--accent), var(--green))', borderRadius: 3, transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
              {achievements.achievements.map(a => (
                <div key={a.id} style={{ padding: '0.9rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${a.unlocked ? 'rgba(124,106,247,0.35)' : 'var(--border)'}`, background: a.unlocked ? 'rgba(124,106,247,0.07)' : 'var(--bg-elevated)', opacity: a.unlocked ? 1 : 0.5, transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
                  {a.unlocked && <div style={{ position: 'absolute', top: 4, right: 6, fontSize: '0.6rem', color: 'var(--green)', fontWeight: 700 }}>✓</div>}
                  <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{a.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.2rem', fontFamily: 'var(--font-display)' }}>{a.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="card" style={{ marginTop: '1.5rem', borderColor: 'rgba(124,106,247,0.3)', background: 'rgba(124,106,247,0.05)' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--accent-light)' }}>🔐 Account Security</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Your password is securely hashed using bcrypt. For security reasons, password changes are not available in this demo. In a production app, you'd add email verification and password reset flows.
          </p>
        </div>
      </div>
    </div>
  );
}
