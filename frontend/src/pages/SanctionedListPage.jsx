import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const initialForm = {
  entryType: 'organization',
  name: '',
  identifier: '',
  reason: '',
  additionalDetails: '',
};

const SanctionedListPage = ({ adminMode = false }) => {
  const { profile } = useOutletContext() || {};
  const isAdmin = String(profile?.role || '').toLowerCase() === 'admin';
  const canManage = adminMode && isAdmin;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sanctioned-list', { params: { type, status, search } });
      setRows(res.data.items || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load sanctioned list.');
    } finally {
      setLoading(false);
    }
  }, [search, status, type]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      entryType: row.entryType,
      name: row.name,
      identifier: row.identifier || '',
      reason: row.reason,
      additionalDetails: row.additionalDetails || '',
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api.put(`/sanctioned-list/${editing._id}`, form);
      else await api.post('/sanctioned-list', form);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Save failed.');
    }
  };

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this sanctioned entry?')) return;
    try {
      await api.delete(`/sanctioned-list/${id}`);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Action failed.');
    }
  };

  const csvRows = useMemo(() => rows.map((row) => [
    row.entryType,
    row.name || row.identifier,
    row.reason,
    new Date(row.sanctionedDate).toLocaleString(),
    row.sanctionedBy?.fullName || 'System',
    row.status,
  ]), [rows]);

  const exportCsv = () => {
    const lines = [
      ['Type', 'Name/Identifier', 'Reason', 'Sanctioned Date', 'Sanctioned By', 'Status'],
      ...csvRows,
    ];
    const csv = lines.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanctioned-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Sanctioned List Report', 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [['Type', 'Name/Identifier', 'Reason', 'Sanctioned Date', 'Sanctioned By', 'Status']],
      body: csvRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`sanctioned-list-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{canManage ? 'Sanctioned List Management' : 'Sanctioned List'}</h2>
          <p className="mt-1 text-sm text-rose-200">Prohibited organizations, commodities and vessels.</p>
        </div>
        <div className="flex gap-2">
          {!canManage && (
            <>
              <button onClick={exportPdf} className="rounded-xl bg-cyan-500/15 px-4 py-2 text-sm text-cyan-300">Export PDF</button>
              <button onClick={exportCsv} className="rounded-xl bg-cyan-500/15 px-4 py-2 text-sm text-cyan-300">Export CSV</button>
            </>
          )}
          {canManage && <button onClick={openCreate} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Add Sanctioned Entry</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
          <option value="all">All Types</option>
          <option value="organization">Organization</option>
          <option value="commodity">Commodity</option>
          <option value="vessel">Vessel</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
      </div>
      <div className="rounded-2xl border border-rose-500/30 bg-slate-900/70 p-4">
        {loading ? <p className="text-slate-400">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Name/Identifier</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Sanctioned Date</th>
                  <th className="px-3 py-2">Sanctioned By</th>
                  <th className="px-3 py-2">Status</th>
                  {canManage && <th className="px-3 py-2">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td className="px-3 py-2 text-slate-200">{row.entryType}</td>
                    <td className="px-3 py-2 text-slate-200">{row.name}{row.identifier ? ` (${row.identifier})` : ''}</td>
                    <td className="px-3 py-2 text-slate-300">{row.reason}</td>
                    <td className="px-3 py-2 text-slate-300">{new Date(row.sanctionedDate).toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-300">{row.sanctionedBy?.fullName || 'Admin'}</td>
                    <td className={`px-3 py-2 ${row.status === 'active' ? 'text-rose-300' : 'text-slate-400'}`}>{row.status}</td>
                    {canManage && (
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(row)} className="rounded bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300">Edit</button>
                          <button onClick={() => deactivate(row._id)} className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-300">Deactivate</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={submit} className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-5 max-h-[90vh] overflow-y-auto space-y-3">
            <h3 className="text-lg font-semibold text-white">{editing ? 'Edit Entry' : 'Add Sanctioned Entry'}</h3>
            <select value={form.entryType} onChange={(e) => setForm((p) => ({ ...p, entryType: e.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100">
              <option value="organization">Organization</option>
              <option value="commodity">Commodity</option>
              <option value="vessel">Vessel</option>
            </select>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Entry name" required className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
            <input value={form.identifier} onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))} placeholder="Identifier (optional)" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
            <textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason" required className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
            <textarea value={form.additionalDetails} onChange={(e) => setForm((p) => ({ ...p, additionalDetails: e.target.value }))} placeholder="Additional details" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-xl bg-slate-700 px-4 py-2 text-sm text-slate-200">Cancel</button>
              <button type="submit" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Save</button>
            </div>
          </form>
        </div>
      )}
      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{error}</div>}
    </div>
  );
};

export default SanctionedListPage;
