import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import { MdTrendingUp, MdTrendingDown, MdAccountBalance, MdSwapHoriz, MdAdd, MdArrowForward } from 'react-icons/md';

const CATEGORY_ICONS = { 'Food & Dining':'🍔','Transportation':'🚗','Shopping':'🛍️','Entertainment':'🎬','Healthcare':'🏥','Housing':'🏠','Education':'📚','Utilities':'💡','Travel':'✈️','Salary':'💼','Freelance':'💻','Development':'📈','Other':'📦' };

function StatCard({ label, value, icon: Icon, color, subtitle }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={32} style={{ color, opacity: 0.5 }} />
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, color }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{subtitle}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const currency = user?.currency || 'INR';
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  useEffect(() => {
    Promise.all([
      api.get('/expenses/summary'),
      api.get('/expenses?limit=5')
    ]).then(([sumRes, expRes]) => {
      setSummary(sumRes.data);
      setRecentExpenses(expRes.data.expenses);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  const { summary: s } = summary || {};
  const now = new Date();

  return (
    <div className="animate-fade-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's your financial overview for {format(now, 'MMMM yyyy')}</p>
        </div>
        <Link to="/transactions" className="btn btn-primary">
          <MdAdd size={18} /> Add Transaction
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total Income" value={fmt(s?.totalIncome || 0)} icon={MdTrendingUp} color="var(--green)" subtitle={`${s?.transactionCount || 0} transactions`} />
        <StatCard label="Total Expenses" value={fmt(s?.totalExpense || 0)} icon={MdTrendingDown} color="var(--red)" subtitle="This month" />
        <StatCard label="Net Balance" value={fmt(s?.balance || 0)} icon={MdAccountBalance} color={(s?.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)'} subtitle="Income - Expenses" />
        <StatCard label="Transactions" value={s?.transactionCount || 0} icon={MdSwapHoriz} color="var(--accent-light)" subtitle="This month" />
      </div>

      <div className="charts-grid">
        {/* Category Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Spending by Category</h3>
          </div>
          {summary?.categoryBreakdown?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {summary.categoryBreakdown.slice(0, 6).map(({ _id: cat, total }) => {
                const pct = Math.round((total / (s?.totalExpense || 1)) * 100);
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                      <span>{CATEGORY_ICONS[cat] || '📦'} {cat}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{fmt(total)} <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-light))', borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
              No expense data yet
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Recent</h3>
            <Link to="/transactions" style={{ color: 'var(--accent-light)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              View all <MdArrowForward size={14} />
            </Link>
          </div>
          {recentExpenses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {recentExpenses.map(exp => (
                <div key={exp._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
                  <div style={{ fontSize: '1.2rem', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: 8, flexShrink: 0 }}>
                    {CATEGORY_ICONS[exp.category] || '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exp.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(exp.date), 'MMM d')}</div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: exp.type === 'income' ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                    {exp.type === 'income' ? '+' : '-'}{fmt(exp.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💸</div>
              No transactions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
