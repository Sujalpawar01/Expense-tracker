import { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, ArcElement, BarElement
} from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, subMonths } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

const COLORS = ['#7c6af7','#22d3a0','#f75a6a','#f7c46a','#45B7D1','#96CEB4','#DDA0DD','#FF6B6B','#4ECDC4','#85C1E9'];
const CATEGORY_ICONS = { 'Food & Dining':'🍔','Transportation':'🚗','Shopping':'🛍️','Entertainment':'🎬','Healthcare':'🏥','Housing':'🏠','Education':'📚','Utilities':'💡','Travel':'✈️','Salary':'💼','Freelance':'💻','Investment':'📈','Other':'📦' };
const DOW_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const INSIGHT_STYLES = {
  positive: { bg: 'rgba(34,211,160,0.07)', border: 'rgba(34,211,160,0.3)', badge: '#22d3a0' },
  warning:  { bg: 'rgba(247,196,106,0.07)', border: 'rgba(247,196,106,0.3)', badge: '#f7c46a' },
  danger:   { bg: 'rgba(247,90,106,0.07)',  border: 'rgba(247,90,106,0.3)',  badge: '#f75a6a' },
  info:     { bg: 'rgba(124,106,247,0.07)', border: 'rgba(124,106,247,0.3)', badge: '#7c6af7' },
};

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [compare, setCompare] = useState(null);
  const [insights, setInsights] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'comparison' | 'insights'

  const currency = user?.currency || 'INR';
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/expenses/summary?month=${selectedMonth}&year=${selectedYear}`),
      api.get(`/expenses/compare?month=${selectedMonth}&year=${selectedYear}`),
      api.get('/expenses/insights')
    ]).then(([sumRes, cmpRes, insRes]) => {
      setData(sumRes.data);
      setCompare(cmpRes.data);
      setInsights(insRes.data.insights || []);
    }).finally(() => setLoading(false));
  }, [selectedMonth, selectedYear]);

  const chartDefaults = {
    plugins: { legend: { labels: { color: '#8888aa', font: { family: 'DM Sans', size: 12 } } } },
    scales: {
      x: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.04)' } }
    }
  };

  // 6-month trend line
  const buildTrend = () => {
    if (!data?.trend) return null;
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      months.push({ label: format(d, 'MMM yy'), year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    const income  = months.map(m => data.trend.find(t => t._id.year === m.year && t._id.month === m.month && t._id.type === 'income')?.total || 0);
    const expense = months.map(m => data.trend.find(t => t._id.year === m.year && t._id.month === m.month && t._id.type === 'expense')?.total || 0);
    return {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'Income',   data: income,  borderColor: '#22d3a0', backgroundColor: 'rgba(34,211,160,0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#22d3a0', pointRadius: 4 },
        { label: 'Expenses', data: expense, borderColor: '#f75a6a', backgroundColor: 'rgba(247,90,106,0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#f75a6a', pointRadius: 4 }
      ]
    };
  };

  const buildDoughnut = () => {
    if (!data?.categoryBreakdown?.length) return null;
    return {
      labels: data.categoryBreakdown.map(c => c._id),
      datasets: [{ data: data.categoryBreakdown.map(c => c.total), backgroundColor: COLORS, borderColor: 'var(--bg-card)', borderWidth: 2 }]
    };
  };

  const buildBar = () => {
    if (!data?.categoryBreakdown?.length) return null;
    return {
      labels: data.categoryBreakdown.map(c => c._id),
      datasets: [{ label: 'Amount', data: data.categoryBreakdown.map(c => c.total), backgroundColor: COLORS.map(c => c + '99'), borderColor: COLORS, borderWidth: 1, borderRadius: 6 }]
    };
  };

  // Day-of-week spending bar chart
  const buildDayOfWeek = () => {
    if (!data?.spendingByDayOfWeek?.length) return null;
    const totals = Array(7).fill(0);
    data.spendingByDayOfWeek.forEach(d => { totals[d._id - 1] = d.total; }); // _id: 1=Sun
    return {
      labels: DOW_LABELS,
      datasets: [{
        label: 'Spending',
        data: totals,
        backgroundColor: totals.map((v, i) => {
          const max = Math.max(...totals);
          return v === max ? '#f75a6a99' : '#7c6af799';
        }),
        borderColor: totals.map((v, i) => {
          const max = Math.max(...totals);
          return v === max ? '#f75a6a' : '#7c6af7';
        }),
        borderWidth: 1,
        borderRadius: 6
      }]
    };
  };

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2024, i, 1), 'MMMM') }));
  const years  = [2024, 2025, 2026];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  const trendData     = buildTrend();
  const doughnutData  = buildDoughnut();
  const barData       = buildBar();
  const dowData       = buildDayOfWeek();
  const totalExpense  = data?.summary?.totalExpense || 0;

  // Month comparison helpers
  const delta = (curr, prev) => {
    if (!prev || prev === 0) return null;
    const d = Math.round(((curr - prev) / prev) * 100);
    return d;
  };

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Analytics</h1>
          <p>Visual insights into your spending patterns</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select className="input" style={{ width: 'auto' }} value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="input" style={{ width: 'auto' }} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Income',    value: fmt(data?.summary?.totalIncome || 0),   color: 'var(--green)',       d: delta(compare?.current?.income, compare?.previous?.income) },
          { label: 'Total Expenses',  value: fmt(totalExpense),                       color: 'var(--red)',         d: delta(compare?.current?.expense, compare?.previous?.expense) },
          { label: 'Net Savings',     value: fmt(data?.summary?.balance || 0),        color: (data?.summary?.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)', d: null },
          { label: 'Savings Rate',    value: data?.summary?.totalIncome ? `${Math.round((data.summary.balance / data.summary.totalIncome) * 100)}%` : '—', color: 'var(--accent-light)', d: null }
        ].map(({ label, value, color, d }) => (
          <div key={label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color }}>{value}</div>
            {d !== null && d !== undefined && (
              <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', fontWeight: 600, color: d <= 0 ? 'var(--green)' : 'var(--red)' }}>
                {d >= 0 ? '▲' : '▼'} {Math.abs(d)}% vs prev month
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '0.3rem', border: '1px solid var(--border)', width: 'fit-content' }}>
        {[['overview','📊 Overview'], ['comparison','📅 Monthly Compare'], ['insights','💡 Insights']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{ padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
              background: activeTab === key ? 'var(--accent)' : 'transparent',
              color: activeTab === key ? 'white' : 'var(--text-secondary)'
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === 'overview' && (
        <>
          <div className="charts-grid">
            {trendData && (
              <div className="card">
                <h3 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>6-Month Income vs Expenses</h3>
                <Line data={trendData} options={{ ...chartDefaults, responsive: true, maintainAspectRatio: true }} />
              </div>
            )}
            {doughnutData && (
              <div className="card">
                <h3 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>Expense Breakdown</h3>
                <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#8888aa', font: { family: 'DM Sans', size: 11 }, padding: 12 } } }, cutout: '65%' }} />
              </div>
            )}
          </div>

          {/* Day of Week Heatmap */}
          {dowData && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>Spending by Day of Week</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>Which days you spend the most — peak day highlighted in red</p>
              <Bar data={dowData} options={{ ...chartDefaults, responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }} height={80} />
            </div>
          )}

          {/* Monthly Calendar Heatmap */}
          {data?.dailySpending && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>Monthly Spending Calendar</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>Daily expense intensity — darker = higher spend</p>
              {(() => {
                const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0=Sun
                const dailyMap = {};
                data.dailySpending.forEach(d => { dailyMap[d._id] = d.total; });
                const maxDay = Math.max(...Object.values(dailyMap), 1);
                const cells = [];
                // Empty slots before first day
                for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
                for (let d = 1; d <= daysInMonth; d++) {
                  const val = dailyMap[d] || 0;
                  const intensity = val / maxDay;
                  const bg = val === 0 ? 'var(--bg-elevated)' : `rgba(124,106,247,${0.15 + intensity * 0.85})`;
                  const isToday = new Date().getDate() === d && new Date().getMonth() + 1 === selectedMonth && new Date().getFullYear() === selectedYear;
                  cells.push(
                    <div key={d} title={val > 0 ? `Day ${d}: ${fmt(val)}` : `Day ${d}: no spend`}
                      style={{ aspectRatio: '1', borderRadius: 5, background: bg, border: isToday ? '2px solid var(--accent)' : '1px solid transparent', cursor: val > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: intensity > 0.5 ? 'white' : 'var(--text-muted)', fontWeight: 600, transition: 'transform 0.15s', position: 'relative' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {d}
                    </div>
                  );
                }
                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: '0.5rem' }}>
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, paddingBottom: 4 }}>{d}</div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>{cells}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Less</span>
                      {[0.1, 0.3, 0.5, 0.7, 0.9].map(i => (
                        <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(124,106,247,${0.15 + i * 0.85})` }} />
                      ))}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>More</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Category Bar */}
          {barData && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>Spending by Category</h3>
              <Bar data={barData} options={{ ...chartDefaults, responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }} height={100} />
            </div>
          )}

          {/* Category Rankings Table */}
          {data?.categoryBreakdown?.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>Category Rankings</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Rank','Category','Transactions','Avg per Txn','Total','Share'].map(h => (
                        <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.categoryBreakdown.map(({ _id: cat, total, count }, i) => {
                      const pct = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
                      const avg = count > 0 ? total / count : 0;
                      return (
                        <tr key={cat} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '0.8rem 1rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: i === 0 ? '#f7c46a22' : 'var(--bg-elevated)', color: i === 0 ? '#f7c46a' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem' }}>
                              {i === 0 ? '🥇' : i + 1}
                            </span>
                          </td>
                          <td style={{ padding: '0.8rem 1rem', fontWeight: 500 }}>{CATEGORY_ICONS[cat] || '📦'} {cat}</td>
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)' }}>{count}</td>
                          <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)' }}>{fmt(avg)}</td>
                          <td style={{ padding: '0.8rem 1rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--red)' }}>{fmt(total)}</td>
                          <td style={{ padding: '0.8rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 3, transition: 'width 0.8s ease' }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!doughnutData && (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>No data for this period</div>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Add some transactions to see analytics here</p>
            </div>
          )}
        </>
      )}

      {/* TAB: Monthly Comparison */}
      {activeTab === 'comparison' && compare && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>Month-over-Month Comparison</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {format(new Date(compare.year, compare.month - 1, 1), 'MMMM yyyy')} vs{' '}
              {format(new Date(compare.year, compare.month - 2, 1), 'MMMM yyyy')}
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Metric', format(new Date(compare.year, compare.month - 2, 1), 'MMM yyyy'), format(new Date(compare.year, compare.month - 1, 1), 'MMM yyyy'), 'Change'].map(h => (
                      <th key={h} style={{ padding: '0.8rem 1.2rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: '💚 Income',    curr: compare.current.income,  prev: compare.previous.income,  positive: true },
                    { label: '🔴 Expenses',  curr: compare.current.expense, prev: compare.previous.expense, positive: false },
                    { label: '💰 Savings',   curr: compare.current.balance, prev: compare.previous.balance, positive: true },
                    { label: '# Transactions', curr: compare.current.count, prev: compare.previous.count, positive: true, isCnt: true },
                  ].map(({ label, curr, prev, positive, isCnt }) => {
                    const d = delta(curr, prev);
                    const better = positive ? (d !== null && d > 0) : (d !== null && d < 0);
                    const worse  = positive ? (d !== null && d < 0) : (d !== null && d > 0);
                    return (
                      <tr key={label} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.9rem 1.2rem', fontWeight: 500 }}>{label}</td>
                        <td style={{ padding: '0.9rem 1.2rem', color: 'var(--text-secondary)', fontFamily: isCnt ? 'inherit' : 'var(--font-display)' }}>
                          {isCnt ? prev : fmt(prev)}
                        </td>
                        <td style={{ padding: '0.9rem 1.2rem', fontFamily: isCnt ? 'inherit' : 'var(--font-display)', fontWeight: 700, color: curr >= 0 ? 'inherit' : 'var(--red)' }}>
                          {isCnt ? curr : fmt(curr)}
                        </td>
                        <td style={{ padding: '0.9rem 1.2rem' }}>
                          {d !== null ? (
                            <span style={{ fontSize: '0.82rem', fontWeight: 600,
                              color: better ? 'var(--green)' : worse ? 'var(--red)' : 'var(--text-muted)',
                              background: better ? 'var(--green-dim)' : worse ? 'var(--red-dim)' : 'var(--bg-elevated)',
                              padding: '0.2rem 0.6rem', borderRadius: 100
                            }}>
                              {d >= 0 ? '▲' : '▼'} {Math.abs(d)}%
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top categories comparison */}
          {(compare.current.topCategories?.length > 0 || compare.previous.topCategories?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: format(new Date(compare.year, compare.month - 2, 1), 'MMMM yyyy'), cats: compare.previous.topCategories },
                { label: format(new Date(compare.year, compare.month - 1, 1), 'MMMM yyyy'), cats: compare.current.topCategories  }
              ].map(({ label, cats }) => (
                <div key={label} className="card">
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Top Categories — {label}</h4>
                  {cats?.length > 0 ? cats.map(({ _id: cat, total }, i) => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: i < cats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '0.85rem' }}>{CATEGORY_ICONS[cat] || '📦'} {cat}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--red)' }}>{fmt(total)}</span>
                    </div>
                  )) : <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Insights */}
      {activeTab === 'insights' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Auto-generated insights based on your current month's data and trends.
          </p>
          {insights.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {insights.map((ins, i) => {
                const style = INSIGHT_STYLES[ins.type] || INSIGHT_STYLES.info;
                return (
                  <div key={i} style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 'var(--radius)', padding: '1.2rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', animation: `fadeUp 0.4s ease ${i * 0.07}s both` }}>
                    <div style={{ fontSize: '1.8rem', flexShrink: 0, lineHeight: 1 }}>{ins.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.3rem', color: style.badge }}>
                        {ins.title}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ins.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>No insights yet</div>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Add transactions over a few months to unlock personalised insights</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
