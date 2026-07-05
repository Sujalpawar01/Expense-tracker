import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import { MdTrendingUp, MdTrendingDown, MdAccountBalance, MdSwapHoriz, MdAdd, MdArrowForward, MdWarning, MdFlag } from 'react-icons/md';

const CATEGORY_ICONS = { 'Food & Dining':'🍔','Transportation':'🚗','Shopping':'🛍️','Entertainment':'🎬','Healthcare':'🏥','Housing':'🏠','Education':'📚','Utilities':'💡','Travel':'✈️','Salary':'💼','Freelance':'💻','Development':'📈','Other':'📦' };

function StatCard({ label, value, icon: Icon, color, subtitle, trend }) {
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={32} style={{ color, opacity: 0.5 }} />
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, color }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
        {subtitle && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{subtitle}</span>}
        {trend !== undefined && trend !== null && (
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: trend >= 0 ? 'var(--green)' : 'var(--red)', background: trend >= 0 ? 'var(--green-dim)' : 'var(--red-dim)', padding: '0.1rem 0.4rem', borderRadius: 100 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
          </span>
        )}
      </div>
    </div>
  );
}

// Circular budget ring component
function BudgetRing({ spent, budget, currency, fmt }) {
  if (!budget || budget === 0) return null;
  const pct = Math.min(Math.round((spent / budget) * 100), 100);
  const over = spent > budget;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--yellow)' : 'var(--green)';

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: over ? 'rgba(247,90,106,0.04)' : undefined, borderColor: over ? 'rgba(247,90,106,0.3)' : undefined }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={120} height={120} viewBox="0 0 120 120">
          <circle cx={60} cy={60} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={10} />
          <circle cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s' }}
          />
          <text x={60} y={56} textAnchor="middle" fill={color} fontSize={18} fontWeight={700} fontFamily="Syne, sans-serif">{pct}%</text>
          <text x={60} y={72} textAnchor="middle" fill="#8888aa" fontSize={10} fontFamily="DM Sans, sans-serif">used</text>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Monthly Budget</h3>
          {over && <MdWarning size={16} color="var(--red)" />}
        </div>
        <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 700, color, marginBottom: '0.25rem' }}>
          {fmt(spent)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>of {fmt(budget)}</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', marginBottom: '0.4rem' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 1s ease' }} />
        </div>
        <div style={{ fontSize: '0.82rem', color: over ? 'var(--red)' : 'var(--text-muted)' }}>
          {over ? `⚠️ Over budget by ${fmt(spent - budget)}` : `${fmt(budget - spent)} remaining this month`}
        </div>
      </div>
    </div>
  );
}

// Spending Forecast Widget
function ForecastWidget({ forecast, monthlyBudget, fmt }) {
  if (!forecast || forecast.dailyBurn === 0) return null;
  const { dailyBurn, forecastTotal, daysLeft, daysInMonth } = forecast;
  const overBudget = monthlyBudget > 0 && forecastTotal > monthlyBudget;
  const pct = monthlyBudget > 0 ? Math.min(Math.round((forecastTotal / monthlyBudget) * 100), 999) : null;

  return (
    <div className="card" style={{ marginBottom: '1.5rem', borderColor: overBudget ? 'rgba(247,90,106,0.4)' : 'rgba(247,196,106,0.3)', background: overBudget ? 'rgba(247,90,106,0.04)' : 'rgba(247,196,106,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{overBudget ? '🚨' : '📊'}</span>
            <h3 style={{ fontSize: '1rem' }}>Spending Forecast</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            At your daily burn of <strong style={{ color: 'var(--text-secondary)' }}>{fmt(dailyBurn)}/day</strong>, you'll spend approximately:
          </p>
          <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: overBudget ? 'var(--red)' : 'var(--yellow)', marginBottom: '0.3rem' }}>
            {fmt(forecastTotal)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>by end of month ({daysLeft} days remaining)</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {pct !== null && (
            <>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>vs Budget</div>
              <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: overBudget ? 'var(--red)' : 'var(--green)' }}>
                {pct}%
              </div>
              <div style={{ fontSize: '0.75rem', color: overBudget ? 'var(--red)' : 'var(--text-muted)' }}>
                {overBudget ? `⚠️ ${pct - 100}% over limit` : 'within budget'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {

  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [compare, setCompare] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const currency = user?.currency || 'INR';
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  useEffect(() => {
    const now = new Date();
    Promise.all([
      api.get('/expenses/summary'),
      api.get('/expenses?limit=6'),
      api.get(`/expenses/compare?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
    ]).then(([sumRes, expRes, cmpRes]) => {
      setSummary(sumRes.data);
      setRecentExpenses(expRes.data.expenses);
      setCompare(cmpRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  const { summary: s } = summary || {};
  const now = new Date();

  // Compute month-over-month trends for stat cards
  const expenseTrend = compare?.previous?.expense > 0
    ? Math.round(((compare.current.expense - compare.previous.expense) / compare.previous.expense) * 100)
    : null;
  const incomeTrend = compare?.previous?.income > 0
    ? Math.round(((compare.current.income - compare.previous.income) / compare.previous.income) * 100)
    : null;

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

      {/* Stats with trend badges */}
      <div className="stats-grid">
        <StatCard label="Total Income" value={fmt(s?.totalIncome || 0)} icon={MdTrendingUp} color="var(--green)" subtitle={`${s?.transactionCount || 0} transactions`} trend={incomeTrend} />
        <StatCard label="Total Expenses" value={fmt(s?.totalExpense || 0)} icon={MdTrendingDown} color="var(--red)" subtitle="This month" trend={expenseTrend} />
        <StatCard label="Net Balance" value={fmt(s?.balance || 0)} icon={MdAccountBalance} color={(s?.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)'} subtitle="Income − Expenses" />
        <StatCard label="Transactions" value={s?.transactionCount || 0} icon={MdSwapHoriz} color="var(--accent-light)" subtitle="This month" />
      </div>

      {/* Budget Ring */}
      {user?.monthlyBudget > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <BudgetRing spent={s?.totalExpense || 0} budget={user.monthlyBudget} currency={currency} fmt={fmt} />
        </div>
      )}

      {/* Spending Forecast */}
      <ForecastWidget forecast={summary?.forecast} monthlyBudget={user?.monthlyBudget || 0} fmt={fmt} />

      <div className="charts-grid">
        {/* Category Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Spending by Category</h3>
            <Link to="/analytics" style={{ color: 'var(--accent-light)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              Analytics <MdArrowForward size={14} />
            </Link>
          </div>
          {summary?.categoryBreakdown?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {summary.categoryBreakdown.slice(0, 6).map(({ _id: cat, total, count }) => {
                const pct = Math.round((total / (s?.totalExpense || 1)) * 100);
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                      <span>{CATEGORY_ICONS[cat] || '📦'} {cat} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({count} txn)</span></span>
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
