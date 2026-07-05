import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../utils/useDebounce';
import { MdAdd, MdEdit, MdDelete, MdClose, MdSearch, MdDownload, MdFilterAlt, MdUpload } from 'react-icons/md';

const CATEGORIES = ['Food & Dining','Transportation','Shopping','Entertainment','Healthcare','Housing','Education','Utilities','Travel','Salary','Freelance','Investment','Other'];
const CATEGORY_ICONS = { 'Food & Dining':'🍔','Transportation':'🚗','Shopping':'🛍️','Entertainment':'🎬','Healthcare':'🏥','Housing':'🏠','Education':'📚','Utilities':'💡','Travel':'✈️','Salary':'💼','Freelance':'💻','Investment':'📈','Other':'📦' };

const EMPTY_FORM = { title: '', amount: '', type: 'expense', category: 'Food & Dining', date: format(new Date(), 'yyyy-MM-dd'), notes: '' };

// CSV Import Modal
function ImportModal({ onClose, onImported }) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const parsePreview = (text) => {
    const lines = text.trim().split('\n').slice(1, 6); // first 5 data rows
    return lines.map(l => {
      const cols = l.match(/(".*?"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
      return { date: cols[0], title: cols[1], type: cols[2], category: cols[3], amount: cols[4], notes: cols[5] };
    });
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = e => { const text = e.target.result; setCsvText(text); setPreview(parsePreview(text)); };
    reader.readAsText(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); };

  const handleImport = async () => {
    if (!csvText) return toast.error('Upload a CSV file first');
    setLoading(true);
    try {
      const { data } = await api.post('/expenses/import', { csvText });
      setResult(data);
      toast.success(`Imported ${data.imported} transactions! 🎉`);
      onImported();
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed'); }
    finally { setLoading(false); }
  };

  const sampleCSV = 'Date,Title,Type,Category,Amount,Notes\n2024-01-15,Grocery Shopping,expense,Food & Dining,1200,Weekly groceries\n2024-01-16,Salary,income,Salary,50000,Monthly salary';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h2>📤 Import Transactions</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}><MdClose size={20} /></button>
        </div>

        {result ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ marginBottom: '0.5rem' }}>{result.imported} transactions imported!</h3>
            {result.skipped > 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{result.skipped} rows skipped</p>}
            {result.errors?.length > 0 && <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--red)', textAlign: 'left', background: 'var(--red-dim)', padding: '0.75rem', borderRadius: 8 }}>{result.errors.map((e, i) => <div key={i}>{e}</div>)}</div>}
            <button onClick={onClose} className="btn btn-primary" style={{ marginTop: '1.5rem', padding: '0.7rem 2rem' }}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              CSV format: <code style={{ background: 'var(--bg-elevated)', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.78rem' }}>Date, Title, Type, Category, Amount, Notes</code>
            </p>

            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{ border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', padding: '2rem', textAlign: 'center', marginBottom: '1rem', background: dragging ? 'var(--accent-glow)' : 'var(--bg-elevated)', transition: 'all 0.2s', cursor: 'pointer' }}
              onClick={() => document.getElementById('csv-file-input').click()}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{csvText ? '✅' : '📁'}</div>
              <div style={{ fontSize: '0.9rem', color: csvText ? 'var(--green)' : 'var(--text-secondary)' }}>
                {csvText ? `File loaded — ${preview.length}+ rows detected` : 'Drop CSV file here or click to browse'}
              </div>
              <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            </div>

            {/* Preview Table */}
            {preview.length > 0 && (
              <div style={{ marginBottom: '1rem', overflowX: 'auto' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Preview (first {preview.length} rows):</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Date','Title','Type','Category','Amount'].map(h => <th key={h} style={{ padding: '0.4rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}</tr></thead>
                  <tbody>{preview.map((r, i) => <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>{[r.date,r.title,r.type,r.category,r.amount].map((v, j) => <td key={j} style={{ padding: '0.4rem 0.5rem', color: 'var(--text-secondary)' }}>{v}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => { const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(sampleCSV); a.download = 'sample_import.csv'; a.click(); }}>
                ⬇ Download Sample CSV
              </button>
              <button onClick={handleImport} disabled={loading || !csvText} className="btn btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
                {loading ? <><div className="spinner" /> Importing...</> : `Import ${preview.length > 0 ? preview.length + '+ ' : ''}Transactions`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


function TransactionModal({ onClose, onSave, editData, currency }) {
  const [form, setForm] = useState(editData ? { ...editData, date: format(new Date(editData.date), 'yyyy-MM-dd'), amount: String(editData.amount) } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const expenseCategories = ['Food & Dining','Transportation','Shopping','Entertainment','Healthcare','Housing','Education','Utilities','Travel','Other'];
  const incomeCategories  = ['Salary','Freelance','Investment','Other'];
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
              <label className="label">Amount</label>
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
  const [exporting, setExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ page: 1, type: '', category: '', startDate: '', endDate: '' });

  const currency = user?.currency || 'INR';
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  // Debounce search — only fires API after 400 ms of no typing
  const debouncedSearch = useDebounce(searchInput, 400);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 10, page: filters.page });
      if (filters.type) params.set('type', filters.type);
      if (filters.category) params.set('category', filters.category);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const { data } = await api.get(`/expenses?${params}`);
      setExpenses(data.expenses);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [filters, debouncedSearch]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // Reset to page 1 when search changes
  useEffect(() => { setFilters(p => ({ ...p, page: 1 })); }, [debouncedSearch]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Deleted');
      fetchExpenses();
    } catch { toast.error('Failed to delete'); }
  };

  // CSV Export — passes active filters to backend
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.category) params.set('category', filters.category);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await api.get(`/expenses/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exported successfully!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const openEdit  = (exp) => { setEditData(exp); setShowModal(true); };
  const openAdd   = ()    => { setEditData(null); setShowModal(true); };
  const closeModal = ()   => { setShowModal(false); setEditData(null); };
  const onSave     = ()   => { closeModal(); fetchExpenses(); };

  const activeFilterCount = [filters.type, filters.category, filters.startDate, filters.endDate, debouncedSearch].filter(Boolean).length;

  return (
    <div className="animate-fade-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Transactions</h1>
          <p>Manage all your income and expenses{pagination.total ? ` · ${pagination.total} total` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={() => setShowImport(true)} className="btn btn-ghost" title="Bulk import from CSV">
            <MdUpload size={18} /> Import CSV
          </button>
          <button onClick={handleExport} disabled={exporting} className="btn btn-ghost" title="Export filtered results as CSV">
            {exporting ? <><div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--accent)' }} /> Exporting...</> : <><MdDownload size={18} /> Export CSV</>}
          </button>
          <button onClick={openAdd} className="btn btn-primary"><MdAdd size={18} /> Add New</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input className="input" style={{ paddingLeft: '2.2rem' }} placeholder="Search transactions…"
              value={searchInput} onChange={e => setSearchInput(e.target.value)} />
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
        {/* Date range row */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 1 auto' }}>
            <MdFilterAlt size={16} style={{ color: activeFilterCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date range:</span>
          </div>
          <input type="date" className="input" style={{ flex: '0 1 155px' }} value={filters.startDate}
            onChange={e => setFilters(p => ({ ...p, startDate: e.target.value, page: 1 }))} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>to</span>
          <input type="date" className="input" style={{ flex: '0 1 155px' }} value={filters.endDate}
            onChange={e => setFilters(p => ({ ...p, endDate: e.target.value, page: 1 }))} />
          {activeFilterCount > 0 && (
            <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => { setFilters({ page: 1, type: '', category: '', startDate: '', endDate: '' }); setSearchInput(''); }}>
              Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💸</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              {activeFilterCount > 0 ? 'No transactions match your filters' : 'No transactions yet'}
            </div>
            {activeFilterCount === 0 && <button onClick={openAdd} className="btn btn-primary" style={{ marginTop: '1rem' }}><MdAdd size={16} /> Add your first one</button>}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{CATEGORY_ICONS[exp.category] || '📦'}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{exp.title}</div>
                        {exp.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{exp.notes}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.2rem' }}>
                    <span className={`badge badge-${exp.type}`}>{exp.category}</span>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.2rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {((filters.page - 1) * 10) + 1}–{Math.min(filters.page * 10, pagination.total)} of {pagination.total}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button disabled={filters.page === 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))} className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>← Prev</button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
                {filters.page} / {pagination.pages}
              </span>
              <button disabled={filters.page >= pagination.pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))} className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {showModal && <TransactionModal onClose={closeModal} onSave={onSave} editData={editData} currency={currency} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); fetchExpenses(); }} />}
    </div>
  );
}
