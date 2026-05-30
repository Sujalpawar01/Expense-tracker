import { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, subMonths } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement);

const COLORS = ['#7c6af7','#22d3a0','#f75a6a','#f7c46a','#45B7D1','#96CEB4','#DDA0DD','#FF6B6B','#4ECDC4','#85C1E9'];

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const currency = user?.currency || 'INR';
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  useEffect(() => {
    setLoading(true);
    api.get(`/expenses/summary?month=${selectedMonth}&year=${selectedYear}`)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [selectedMonth, selectedYear]);

  const chartDefaults = {
    plugins: { legend: { labels: { color: '#8888aa', font: { family: 'DM Sans', size: 12 } } } },
    scales: { x: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
  };

  // Build trend data
  const buildTrend = () => {
    if (!data?.trend) return null;
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      months.push({ label: format(d, 'MMM'), year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    const income = months.map(m => data.trend.find(t => t._id.year === m.year && t._id.month === m.month && t._id.type === 'income')?.total || 0);
    const expense = months.map(m => data.trend.find(t => t._id.year === m.year && t._id.month === m.month && t._id.type === 'expense')?.total || 0);
    return {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'Income', data: income, borderColor: '#22d3a0', backgroundColor: 'rgba(34,211,160,0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#22d3a0' },
        { label: 'Expenses', data: expense, borderColor: '#f75a6a', backgroundColor: 'rgba(247,90,106,0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#f75a6a' }
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

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2024, i, 1), 'MMMM') }));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  const trendData = buildTrend();
  const doughnutData = buildDoughnut();
  const barData = buildBar();

  return (
    <div className="animate-fade-up">
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
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Income', value: fmt(data?.summary?.totalIncome || 0), color: 'var(--green)' },
          { label: 'Total Expenses', value: fmt(data?.summary?.totalExpense || 0), color: 'var(--red)' },
          { label: 'Net Savings', value: fmt(data?.summary?.balance || 0), color: (data?.summary?.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Savings Rate', value: data?.summary?.totalIncome ? `${Math.round((data.summary.balance / data.summary.totalIncome) * 100)}%` : '—', color: 'var(--accent-light)' }
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
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

      {barData && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.2rem' }}>Spending by Category</h3>
          <Bar data={barData} options={{ ...chartDefaults, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} height={200} />
        </div>
      )}

      {!doughnutData && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>No data for this period</div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Add some transactions to see analytics here</p>
        </div>
      )}
    </div>
  );
}
