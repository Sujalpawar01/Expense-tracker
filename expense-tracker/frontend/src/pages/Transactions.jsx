import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { MdAdd, MdEdit, MdDelete, MdClose, MdSearch, MdFilterList } from 'react-icons/md';

const CATEGORIES = ['Food & Dining','Transportation','Shopping','Entertainment','Healthcare','Housing','Education','Utilities','Travel','Salary','Freelance','Investment','Other'];
const CATEGORY_ICONS = { 'Food & Dining':'🍔','Transportation':'🚗','Shopping':'🛍️','Entertainment':'🎬','Healthcare':'🏥','Housing':'🏠','Education':'📚','Utilities':'💡','Travel':'✈️','Salary':'💼','Freelance':'💻','Investment':'📈','Other':'📦' };

const EMPTY_FORM = { title: '', amount: '', type: 'expense', category: 'Food & Dining', date: format(new Date(), 'yyyy-MM-dd'), notes: '' };

function TransactionModal({ onClose, onSave, editData }) {
  const [form, setForm] = useState(editData ? { ...editData, date: format(new Date(editData.date), 'yyyy-MM-dd'), amount: String(editData.amount) } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const expenseCategories = ['Food & Dining','Transportation','Shopping','Entertainment','Healthcare','Housing','Education','Utilities','Travel','Other'];
  const incomeCategories = ['Salary','Freelance','Investment','Other'];
  const categories = form.type === 'income' ? incomeCategories : expenseCategories;

  const handleTypeChange = (type) => {
    const defaultCat = type === 'income' ? 'Salary' : 'Food & Dining';
    setForm(p => ({ ...p, type, category: defaultCat }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.category) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      if (editData) {
        await api.put(`/expenses/${editData._id}`, { ...form, amount: parseFloat(form.amount) });
        toast.success('Transaction updated');
      } else {
        await api.post('/expenses', { ...form, amount: parseFloat(form.amount) });
        toast.success('Transaction added');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{editData ? 'Edit Transaction' : 'New Transaction'}</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}><MdClose size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Toggle */}
          <div className="form-group">
            <label className="label">Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {['expense','income'].map(t => (
                <button key={t} type="button" onClick={() => handleTypeChange(t)}
                  style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${form.type === t ? (t === 'income' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`, background: form.type === t ? (t === 'income' ? 'var(--green-dim)' : 'var(--red-dim)') : 'transparent', color: form.type === t ? (t === 'income' ? 'var(--green)' : 'var(--red)') : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize', transition: 'all 0.15s' }}
                >
                  {t === 'income' ? '↑' : '↓'} {t}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Title</label>
            <input className="input" required placeholder="e.g. Lunch at cafe" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" required min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Date</label>
              <input className="input" type="date" required value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {categories.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Notes (optional)</label>
            <input className="input" placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.5rem' }}>
            {loading ? <><div className="spinner" /> Saving...</> : (editData ? 'Update Transaction' : 'Add Transaction')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Transactions() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [filters, setFilters] = useState({ page: 1, search: '', type: '', category: '' });

  const currency = user?.currency || 'INR';
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 10, ...filters });
      if (!filters.type) params.delete('type');
      if (!filters.category) params.delete('category');
      if (!filters.search) params.delete('search');
      const { data } = await api.get(`/expenses?${params}`);
      setExpenses(data.expenses);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Deleted');
      fetchExpenses();
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (exp) => { setEditData(exp); setShowModal(true); };
  const openAdd = () => { setEditData(null); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditData(null); };
  const onSave = () => { closeModal(); fetchExpenses(); };

  return (
    <div className="animate-fade-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Transactions</h1>
          <p>Manage all your income and expenses</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary"><MdAdd size={18} /> Add New</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input className="input" style={{ paddingLeft: '2.2rem' }} placeholder="Search transactions..." value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))} />
        </div>
        <select className="input" style={{ flex: '0 1 140px' }} value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value, page: 1 }))}>
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <select className="input" style={{ flex: '0 1 180px' }} value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value, page: 1 }))}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💸</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No transactions found</div>
            <button onClick={openAdd} className="btn btn-primary" style={{ marginTop: '1rem' }}><MdAdd size={16} /> Add your first one</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Transaction','Category','Date','Amount',''].map(h => (
                  <th key={h} style={{ padding: '1rem 1.2rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem 1.2rem' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{exp.title}</div>
                    {exp.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{exp.notes}</div>}
                  </td>
                  <td style={{ padding: '1rem 1.2rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {CATEGORY_ICONS[exp.category]} {exp.category}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {format(new Date(exp.date), 'MMM d, yyyy')}
                  </td>
                  <td style={{ padding: '1rem 1.2rem' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: exp.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                      {exp.type === 'income' ? '+' : '-'}{fmt(exp.amount)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.2rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => openEdit(exp)} className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem' }}><MdEdit size={15} /></button>
                      <button onClick={() => handleDelete(exp._id)} className="btn btn-danger" style={{ padding: '0.4rem 0.6rem' }}><MdDelete size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <button disabled={filters.page === 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))} className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>← Prev</button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Page {filters.page} of {pagination.pages}</span>
            <button disabled={filters.page >= pagination.pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))} className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>Next →</button>
          </div>
        )}
      </div>

      {showModal && <TransactionModal onClose={closeModal} onSave={onSave} editData={editData} />}
    </div>
  );
}
