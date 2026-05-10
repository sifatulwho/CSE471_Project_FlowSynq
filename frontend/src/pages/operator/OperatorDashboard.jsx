// import { useState, useEffect, useCallback } from 'react';
// import { useOutletContext } from 'react-router-dom';
// import axios from 'axios';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

// const API = 'http://localhost:5001/api/shipments';

// const STATUS_CONFIG = {
//   'En Route': { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
//   Docked: { color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
//   Unloading: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
//   Unloaded: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
//   Delayed: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
// };

// const STATUSES = Object.keys(STATUS_CONFIG);

// const getLatestNote = (shipment) => {
//   if (!Array.isArray(shipment.notes) || shipment.notes.length === 0) return 'No notes';
//   return shipment.notes[shipment.notes.length - 1].text;
// };

// const StatusBadge = ({ status }) => {
//   const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['En Route'];
//   return (
//     <span
//       className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
//       style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
//     >
//       <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
//       {status}
//     </span>
//   );
// };

// const Toast = ({ message, type, onClose }) => {
//   useEffect(() => {
//     const t = setTimeout(onClose, 3500);
//     return () => clearTimeout(t);
//   }, [onClose]);

//   return (

//     <div
//       className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl transition-all duration-300 ${type === 'error'
//           ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
//           : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
//         }`}
//     >
//       {type === 'error' ? (
//         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//           <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//         </svg>
//       ) : (
//         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//           <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//         </svg>
//       )}
//       {message}
//       <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white">✕</button>
//     </div>
//   );
// };

// const OperatorDashboard = () => {
//   const { token } = useOutletContext();

//   const [shipments, setShipments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [filterStatus, setFilterStatus] = useState('');
//   const [dateFrom, setDateFrom] = useState('');
//   const [dateTo, setDateTo] = useState('');
//   const [sortField, setSortField] = useState('arrivalTime');
//   const [sortDir, setSortDir] = useState('desc');
//   const [toast, setToast] = useState(null);
//   const [lastRefresh, setLastRefresh] = useState(Date.now());

//   const fetchShipments = useCallback(async () => {
//     try {
//       const res = await axios.get(API, { headers: { Authorization: `Bearer ${token}` } });
//       setShipments(res.data);
//     } catch (err) {
//       console.error('Fetch shipments error:', err);
//       setToast({ message: 'Failed to load shipments.', type: 'error' });
//     } finally {
//       setLoading(false);
//     }
//   }, [token]);

//   // Initial fetch + auto-refresh every 30s
//   useEffect(() => {
//     fetchShipments();
//     const interval = setInterval(() => {
//       fetchShipments();
//       setLastRefresh(Date.now());
//     }, 30000);
//     return () => clearInterval(interval);
//   }, [fetchShipments]);

//   // Filtering
//   const filtered = shipments
//     .filter((s) => {
//       if (search && !s.shipName.toLowerCase().includes(search.toLowerCase())) return false;
//       if (filterStatus && s.status !== filterStatus) return false;
//       if (dateFrom && new Date(s.arrivalTime) < new Date(dateFrom)) return false;
//       if (dateTo && new Date(s.arrivalTime) > new Date(dateTo + 'T23:59:59')) return false;
//       return true;
//     })
//     .sort((a, b) => {
//       let av = a[sortField];
//       let bv = b[sortField];
//       if (sortField === 'arrivalTime') {
//         av = new Date(av).getTime();
//         bv = new Date(bv).getTime();
//       }
//       if (sortField === 'cargoQuantity') {
//         av = Number(av);
//         bv = Number(bv);
//       }
//       if (typeof av === 'string') {
//         av = av.toLowerCase();
//         bv = bv.toLowerCase();
//       }
//       if (av < bv) return sortDir === 'asc' ? -1 : 1;
//       if (av > bv) return sortDir === 'asc' ? 1 : -1;
//       return 0;
//     });

//   const handleSort = (field) => {
//     if (sortField === field) {
//       setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortField(field);
//       setSortDir('asc');
//     }
//   };

//   const SortIndicator = ({ field }) => {
//     if (sortField !== field) return <span className="ml-1 text-slate-600">⇅</span>;
//     return <span className="ml-1 text-cyan-400">{sortDir === 'asc' ? '↑' : '↓'}</span>;
//   };

//   //KPI Stats
//   const stats = {
//     total: shipments.length,
//     enRoute: shipments.filter((s) => s.status === 'En Route').length,
//     docked: shipments.filter((s) => s.status === 'Docked').length,
//     unloading: shipments.filter((s) => s.status === 'Unloading').length,
//     delayed: shipments.filter((s) => s.status === 'Delayed').length,
//   };

//   const buildExportRows = () => (
//     filtered.map((s) => ([
//       s.shipName,
//       new Date(s.arrivalTime).toLocaleString('en-US'),
//       Number(s.cargoQuantity).toLocaleString(),
//       s.assignedDock,
//       s.status,
//       getLatestNote(s),
//     ]))
//   );

//   const handleExportCsv = () => {
//     if (filtered.length === 0) {
//       setToast({ message: 'No filtered shipment data to export.', type: 'error' });
//       return;
//     }

//     const headers = ['Ship Name', 'Arrival Time', 'Cargo Qty (MT)', 'Assigned Dock', 'Status', 'Notes'];
//     const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
//     const rows = buildExportRows();
//     const csvContent = [
//       headers.map(csvEscape).join(','),
//       ...rows.map((row) => row.map(csvEscape).join(',')),
//     ].join('\n');

//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `shipment-data-${new Date().toISOString().slice(0, 10)}.csv`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//     setToast({ message: 'CSV exported successfully.', type: 'success' });
//   };

//   const handleExportPdf = () => {
//     if (filtered.length === 0) {
//       setToast({ message: 'No filtered shipment data to export.', type: 'error' });
//       return;
//     }

//     const doc = new jsPDF({ orientation: 'landscape' });
//     doc.setFontSize(14);
//     doc.text('Shipment Tracking Dashboard - Filtered Data', 14, 14);
//     doc.setFontSize(10);
//     doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 20);

//     autoTable(doc, {
//       startY: 24,
//       head: [['Ship Name', 'Arrival Time', 'Cargo Qty (MT)', 'Assigned Dock', 'Status', 'Notes']],
//       body: buildExportRows(),
//       styles: { fontSize: 9, cellPadding: 2 },
//       headStyles: { fillColor: [30, 41, 59] },
//     });

//     doc.save(`shipment-data-${new Date().toISOString().slice(0, 10)}.pdf`);
//     setToast({ message: 'PDF exported successfully.', type: 'success' });
//   };

//   return (
//     <div className="space-y-6">
//       {/* Page header */}
//       <div>
//         <h2 className="text-2xl font-bold text-white">Shipment Tracking Dashboard</h2>
//         <p className="mt-1 text-sm text-slate-400">
//           Real-time shipment overview  •{' '}
//           <span className="text-cyan-400">
//             Last: {new Date(lastRefresh).toLocaleTimeString()}
//           </span>
//         </p>
//       </div>

//       {/* KPI Cards */}
//       <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
//         {[
//           { label: 'Total', value: stats.total, color: '#94a3b8', icon: '📦' },
//           { label: 'En Route', value: stats.enRoute, color: '#3B82F6', icon: '🚢' },
//           { label: 'Docked', value: stats.docked, color: '#10B981', icon: '⚓' },
//           { label: 'Unloading', value: stats.unloading, color: '#F59E0B', icon: '🏗️' },
//           { label: 'Delayed', value: stats.delayed, color: '#EF4444', icon: '⚠️' },
//         ].map((stat) => (
//           <div
//             key={stat.label}
//             className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 transition-transform hover:scale-[1.02]"
//           >
//             <div className="flex items-center justify-between">
//               <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{stat.label}</p>
//               <span className="text-lg">{stat.icon}</span>
//             </div>
//             <p className="mt-2 text-3xl font-bold" style={{ color: stat.color }}>
//               {stat.value}
//             </p>
//           </div>
//         ))}
//       </div>

//       {/* Filters */}
//       <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
//         <div className="flex-1 min-w-[200px]">
//           <label className="mb-1 block text-xs font-medium text-slate-400">Search Ship</label>
//           <input
//             type="text"
//             placeholder="Ship name…"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
//           />
//         </div>
//         <div className="min-w-[140px]">
//           <label className="mb-1 block text-xs font-medium text-slate-400">Status</label>
//           <select
//             value={filterStatus}
//             onChange={(e) => setFilterStatus(e.target.value)}
//             className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
//           >
//             <option value="">Choose Status</option>
//             {STATUSES.map((s) => (
//               <option key={s} value={s}>{s}</option>
//             ))}
//           </select>
//         </div>
//         <div className="min-w-[140px]">
//           <label className="mb-1 block text-xs font-medium text-slate-400">From Date</label>
//           <input
//             type="date"
//             value={dateFrom}
//             onChange={(e) => setDateFrom(e.target.value)}
//             className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
//           />
//         </div>
//         <div className="min-w-[140px]">
//           <label className="mb-1 block text-xs font-medium text-slate-400">To Date</label>
//           <input
//             type="date"
//             value={dateTo}
//             onChange={(e) => setDateTo(e.target.value)}
//             className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
//           />
//         </div>
//         <button
//           onClick={() => { setSearch(''); setFilterStatus(''); setDateFrom(''); setDateTo(''); }}
//           className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
//         >
//           Clear
//         </button>
//         <button
//           onClick={() => { fetchShipments(); setLastRefresh(Date.now()); }}
//           className="rounded-xl bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/25"
//         >
//           ↻ Refresh
//         </button>
//       </div>

//       <div className="flex flex-wrap items-center gap-3">
//         <button
//           onClick={handleExportCsv}
//           className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/25"
//         >
//           Export as CSV
//         </button>
//         <button
//           onClick={handleExportPdf}
//           className="rounded-xl bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/25"
//         >
//           Export as PDF
//         </button>
//       </div>

//       {/* Shipments Table */}
//       <div className="overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-900/60">
//         {loading ? (
//           <div className="flex items-center justify-center py-16">
//             <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
//           </div>
//         ) : filtered.length === 0 ? (
//           <div className="py-16 text-center text-slate-500">
//             <p className="text-lg">No shipments found</p>
//             <p className="text-sm">Try adjusting your filters</p>
//           </div>
//         ) : (
//           <table className="w-full text-left text-sm">
//             <thead>
//               <tr className="border-b border-slate-700/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
//                 <th className="cursor-pointer px-5 py-4 hover:text-cyan-300" onClick={() => handleSort('shipName')}>
//                   Ship Name <SortIndicator field="shipName" />
//                 </th>
//                 <th className="cursor-pointer px-5 py-4 hover:text-cyan-300" onClick={() => handleSort('arrivalTime')}>
//                   Arrival Time <SortIndicator field="arrivalTime" />
//                 </th>
//                 <th className="cursor-pointer px-5 py-4 hover:text-cyan-300" onClick={() => handleSort('cargoQuantity')}>
//                   Cargo Qty <SortIndicator field="cargoQuantity" />
//                 </th>
//                 <th className="cursor-pointer px-5 py-4 hover:text-cyan-300" onClick={() => handleSort('assignedDock')}>
//                   Assigned Dock <SortIndicator field="assignedDock" />
//                 </th>
//                 <th className="cursor-pointer px-5 py-4 hover:text-cyan-300" onClick={() => handleSort('status')}>
//                   Status <SortIndicator field="status" />
//                 </th>
//                 <th className="px-5 py-4">Notes</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-800/60">
//               {filtered.map((s) => (
//                 <tr key={s._id} className="transition-colors hover:bg-slate-800/40">
//                   <td className="px-5 py-3.5 font-medium text-white">{s.shipName}</td>
//                   <td className="px-5 py-3.5 text-slate-300">
//                     {new Date(s.arrivalTime).toLocaleString('en-US', {
//                       month: 'short', day: 'numeric', year: 'numeric',
//                       hour: '2-digit', minute: '2-digit',
//                     })}
//                   </td>
//                   <td className="px-5 py-3.5 text-slate-300">{Number(s.cargoQuantity).toLocaleString()} MT</td>
//                   <td className="px-5 py-3.5 text-slate-300">{s.assignedDock}</td>
//                   <td className="px-5 py-3.5">
//                     <StatusBadge status={s.status} />
//                   </td>
//                   <td className="px-5 py-3.5 text-slate-300">
//                     {getLatestNote(s)}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>

//       <p className="text-xs text-slate-600">
//         Showing {filtered.length} of {shipments.length} shipments
//       </p>

//       {toast && <Toast {...toast} onClose={() => setToast(null)} />}
//     </div>
//   );
// };

// export default OperatorDashboard;



import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
// Ensure these paths match your folder structure
import ImageBackground from '../../components/ImageBackground';
import bgImage from '../../assets/bg-image.jpg';
import { useSocket } from '../../context/useSocket';
import { API_BASE } from '../../config';

const API = `${API_BASE}/shipments`;
const PAGE_SIZE = 25;

const SeeMoreShipmentsButton = ({ onClick, disabled }) => (
  <div className="flex justify-center pt-6">
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="border hover:scale-95 duration-300 relative group cursor-pointer text-sky-50 overflow-hidden h-16 w-64 rounded-md bg-sky-200 p-2 flex justify-center items-center font-extrabold disabled:opacity-50 disabled:pointer-events-none"
    >
      <div className="absolute right-32 -top-4 group-hover:top-1 group-hover:right-2 z-10 w-40 h-40 rounded-full group-hover:scale-150 duration-500 bg-sky-900" />
      <div className="absolute right-2 -top-4 group-hover:top-1 group-hover:right-2 z-10 w-32 h-32 rounded-full group-hover:scale-150 duration-500 bg-sky-800" />
      <div className="absolute -right-12 top-4 group-hover:top-1 group-hover:right-2 z-10 w-24 h-24 rounded-full group-hover:scale-150 duration-500 bg-sky-700" />
      <div className="absolute right-20 -top-4 group-hover:top-1 group-hover:right-2 z-10 w-16 h-16 rounded-full group-hover:scale-150 duration-500 bg-sky-600" />
      <p className="z-10">See more</p>
    </button>
  </div>
);

const STATUS_CONFIG = {
  'En Route': { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  Docked: { color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  Unloading: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  Unloaded: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  Delayed: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
};

const STATUSES = Object.keys(STATUS_CONFIG);

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['En Route'];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
      {status}
    </span>
  );
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl transition-all duration-300 ${type === 'error'
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
        }`}
    >
      {type === 'error' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {message}
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white">✕</button>
    </div>
  );
};
//new line for alert (456-458)  (459-461)
const toDatetimeLocalValue = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const OperatorDashboard = () => {
  const { token, profile } = useOutletContext() || {};
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalAll, setTotalAll] = useState(0);
  const [statusCounts, setStatusCounts] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toast, setToast] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState(() => ({
    title: '',
    location: '',                                            //new line for alert (473-480)
    incidentTime: toDatetimeLocalValue(new Date()),
    message: '',
    severity: 'critical',
  }));

  const applyShipmentResponse = useCallback((data, append) => {
    if (Array.isArray(data)) {
      setShipments(data);
      setHasMore(false);
      setTotalAll(data.length);
      setStatusCounts(null);
      return;
    }
    setShipments((prev) => (append ? [...prev, ...data.items] : data.items));
    setHasMore(Boolean(data.hasMore));
    setTotalAll(Number(data.total) || 0);
    if (data.statusCounts) setStatusCounts(data.statusCounts);
  }, []);

  const fetchPage = useCallback(
    async (pageNum, includeStatusCounts) => {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          limit: PAGE_SIZE,
          page: pageNum,
          ...(includeStatusCounts ? { includeStatusCounts: '1' } : {}),
        },
      });
      return res.data;
    },
    [token],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchPage(1, true);
        if (cancelled) return;
        applyShipmentResponse(data, false);
        setPage(1);
      } catch (err) {
        console.error('Fetch shipments error:', err);
        if (!cancelled) setToast({ message: 'Failed to load shipments.', type: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage, applyShipmentResponse]);

  useEffect(() => {
    const interval = setInterval(() => {
      (async () => {
        try {
          const data = await fetchPage(1, true);
          applyShipmentResponse(data, false);
          setPage(1);
          setLastRefresh(Date.now());
        } catch (err) {
          console.error('Fetch shipments error:', err);
        }
      })();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchPage, applyShipmentResponse]);

  const loadMoreShipments = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchPage(nextPage, false);
      if (Array.isArray(data)) return;
      applyShipmentResponse(data, true);
      setPage(nextPage);
    } catch (err) {
      console.error('Fetch shipments error:', err);
      setToast({ message: 'Failed to load more shipments.', type: 'error' });
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, fetchPage, applyShipmentResponse]);
  //new line for alert (499-507) 
  useEffect(() => {
    if (!socket) return;
    const onError = (payload) => {
      setToast({ message: payload?.message || 'Emergency alert failed.', type: 'error' });
    };
    socket.on('emergency_alert_error', onError);
    return () => socket.off('emergency_alert_error', onError);
  }, [socket]);

  const filtered = shipments
    .filter((s) => {
      if (search && !s.shipName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      if (dateFrom && new Date(s.arrivalTime) < new Date(dateFrom)) return false;
      if (dateTo && new Date(s.arrivalTime) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    })
    .sort((a, b) => new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime());

  const stats = {
    total: totalAll || shipments.length,
    enRoute: statusCounts?.['En Route'] ?? shipments.filter((s) => s.status === 'En Route').length,
    docked: statusCounts?.Docked ?? shipments.filter((s) => s.status === 'Docked').length,
    unloading: statusCounts?.Unloading ?? shipments.filter((s) => s.status === 'Unloading').length,
    delayed: statusCounts?.Delayed ?? shipments.filter((s) => s.status === 'Delayed').length,
  };
  //new line for alert (505-527)
  const openEmergencyModal = () => {
    setEmergencyForm((prev) => ({
      ...prev,
      incidentTime: toDatetimeLocalValue(new Date()),
    }));
    setEmergencyOpen(true);
  };
  //new line for alert (527-549))
  const handleEmergencyField = (e) => {
    const { name, value } = e.target;
    setEmergencyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitEmergency = (e) => {
    e.preventDefault();
    if (!socket?.connected) {
      setToast({ message: 'Not connected. Refresh the page and try again.', type: 'error' });
      return;
    }
    if (!localStorage.getItem('flowsynqToken')) {
      setToast({ message: 'Session missing. Please log in again.', type: 'error' });
      return;
    }

    const title = emergencyForm.title.trim() || 'Port Emergency Alert';
    const location = emergencyForm.location.trim();
    const message = emergencyForm.message.trim();

    if (!location) {
      setToast({ message: 'Please enter where the incident occurred (area / berth / dock).', type: 'error' });
      return;
    }
    if (!message) {
      setToast({ message: 'Please describe what happened.', type: 'error' });
      return;
    }

    const incidentIso = emergencyForm.incidentTime
      ? new Date(emergencyForm.incidentTime).toISOString()
      : new Date().toISOString();
    //new line for alert (550-579)
    socket.emit('trigger_emergency', {
      type: 'emergency',
      severity: emergencyForm.severity || 'critical',
      title,
      message,
      location,
      incidentTime: incidentIso,
    });

    setEmergencyOpen(false);
    setToast({ message: 'Emergency alert broadcast to all users on this port.', type: 'success' });
  };

  return (
    <div className="relative isolate min-h-screen">
      {/* Background Image Container */}
      <ImageBackground imageSrc={bgImage} />

      {/* Main Content Container with blur for readability */}
      <div className="relative z-10 space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Shipment Tracking Dashboard</h2>
          <p className="text-sm text-slate-400">Last updated: {new Date(lastRefresh).toLocaleTimeString()}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Port: <span className="font-medium text-slate-300">{profile?.port || '—'}</span>
            {' · '}
            Alerts go to every role on this port (admin, analyst, operator, organization).
          </p>
          <button
            type="button"
            onClick={openEmergencyModal}
            className="rounded-xl border border-rose-500 bg-red-700/30 px-7 py-2 text-sm font-bold text-red-200 shadow-lg shadow-red-900/50 transition hover:bg-rose-700/40"
          >
          Emergency Buzzer
          </button>
        </div>

        {emergencyOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              aria-hidden
              onClick={() => setEmergencyOpen(false)}
            />
            <form
              onSubmit={handleSubmitEmergency}
              className="relative z-[101] w-full max-w-lg space-y-4 rounded-2xl border border-slate-700/60 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">Report emergency</h3>
                <p className="mt-1 text-sm text-slate-400">
                  This broadcasts immediately to all subscribed users for this port. Be specific about location and time.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Short title</label>
                <input
                  name="title"
                  value={emergencyForm.title}
                  onChange={handleEmergencyField}
                  placeholder="e.g. Fire near Berth 3"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Where (location / area)</label>
                <input
                  name="location"
                  value={emergencyForm.location}
                  onChange={handleEmergencyField}
                  required
                  placeholder="e.g. Berth 3, Tank farm east, Gate A"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Incident time</label>
                  <input
                    type="datetime-local"
                    name="incidentTime"
                    value={emergencyForm.incidentTime}
                    onChange={handleEmergencyField}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Severity</label>
                  <select
                    name="severity"
                    value={emergencyForm.severity}
                    onChange={handleEmergencyField}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">What happened (details)</label>
                <textarea
                  name="message"
                  value={emergencyForm.message}
                  onChange={handleEmergencyField}
                  required
                  rows={4}
                  placeholder="Describe the incident, vessel involved, hazards, and any immediate actions taken."
                  className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmergencyOpen(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl border border-rose-500/50 bg-rose-600/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
                >
                  Broadcast alert
                </button>
              </div>
            </form>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Total', value: stats.total, color: '#94a3b8', icon: '📦' },
            { label: 'En Route', value: stats.enRoute, color: '#3B82F6', icon: '🚢' },
            { label: 'Docked', value: stats.docked, color: '#10B981', icon: '⚓' },
            { label: 'Unloading', value: stats.unloading, color: '#F59E0B', icon: '🏗️' },
            { label: 'Delayed', value: stats.delayed, color: '#EF4444', icon: '⚠️' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-700/60 bg-slate-950/70 backdrop-blur-sm p-4 hover:scale-[1.02] transition-transform">
              <p className="text-xs font-medium uppercase text-slate-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-slate-400">Search Ship</label>
            <input
              type="text"
              placeholder="Ship name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1 block text-xs font-medium text-slate-400">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            >
              <option value="">Choose Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setDateFrom(''); setDateTo(''); }}
            className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            Clear
          </button>
        </div>

        {/* Shipments Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-950/70 backdrop-blur-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-lg">No shipments found</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-4">Ship Name</th>
                  <th className="px-5 py-4">Arrival</th>
                  <th className="px-5 py-4">Cargo Qty</th>
                  <th className="px-5 py-4">Dock</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((s) => (
                  <tr key={s._id} className="transition-colors hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-medium text-white">{s.shipName}</td>
                    <td className="px-5 py-3.5 text-slate-300">{new Date(s.arrivalTime).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-slate-300">{Number(s.cargoQuantity).toLocaleString()} MT</td>
                    <td className="px-5 py-3.5 text-slate-300">{s.assignedDock}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && hasMore && filtered.length > 0 && (
          <SeeMoreShipmentsButton onClick={loadMoreShipments} disabled={loadingMore} />
        )}

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
};

export default OperatorDashboard;