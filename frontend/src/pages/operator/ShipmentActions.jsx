import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { COMMODITY_OPTIONS, PORT_OPTIONS } from '../../constants/ports';
import RouteMap from '../../components/RouteMap';
import PortCoordinateInput from '../../components/PortCoordinateInput';

const API = 'http://localhost:5001/api/shipments';
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
  'Docked': { color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  'Unloading': { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  'Unloaded': { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  'Delayed': { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
};

const STATUSES = Object.keys(STATUS_CONFIG);

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Select Status'];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
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
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${type === 'error'
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
        }`}
    >
      {message}
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white">✕</button>
    </div>
  );
};

const ShipmentActions = () => {
  const navigate = useNavigate();
  const { token, profile } = useOutletContext() || {};

  // Build auth config fresh each time to avoid stale closure issues
  const authConfig = () => ({ headers: { Authorization: `Bearer ${token}` } });

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState(null);

  // Panels
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [editShipment, setEditShipment] = useState(null);
  const [historyShipment, setHistoryShipment] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [noteShipmentId, setNoteShipmentId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [shipmentNotes, setShipmentNotes] = useState([]);
  const [routePreview, setRoutePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [acceptingRecommendation, setAcceptingRecommendation] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    shipName: '',
    departureTime: '',
    cargoQuantity: '',
    containerCount: '',
    portName: '',
    assignedDock: '',
    status: '',
    notes: '',
    commodityType: 'Other',
    startingPortCode: '',
    destinationPortCode: '',
    estimatedArrivalTime: '',
    // Custom port inputs
    customStartingPortName: '',
    customStartingPortCoords: null,
    customDestinationPortName: '',
    customDestinationPortCoords: null,
    useCustomPorts: false,
  });

  const applyShipmentResponse = useCallback((data, append) => {
    if (Array.isArray(data)) {
      setShipments(data);
      setHasMore(false);
      return;
    }
    setShipments((prev) => (append ? [...prev, ...data.items] : data.items));
    setHasMore(Boolean(data.hasMore));
  }, []);

  const fetchPage = useCallback(
    async (pageNum) => {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: PAGE_SIZE, page: pageNum },
      });
      return res.data;
    },
    [token],
  );

  const refreshFirstPage = useCallback(async () => {
    const data = await fetchPage(1);
    applyShipmentResponse(data, false);
    setPage(1);
  }, [fetchPage, applyShipmentResponse]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refreshFirstPage();
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
  }, [refreshFirstPage]);

  const loadMoreShipments = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchPage(nextPage);
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

  // Quick status update
  const handleQuickStatus = async (id, status) => {
    try {
      const res = await axios.put(`${API}/${id}`, { status }, authConfig());
      // Update local state with server response
      setShipments((prev) => prev.map((s) => (s._id === id ? res.data : s)));
      setToast({ message: `Status updated to ${status}`, type: 'success' });
    } catch (err) {
      console.error('Quick status error:', err?.response?.data || err);
      setToast({ message: err?.response?.data?.message || 'Failed to update status.', type: 'error' });
    }
  };

  // Open edit modal
  const openEdit = (s) => {
    setEditShipment(s);
    setEditForm({
      shipName: s.shipName,
      departureTime: new Date(s.arrivalTime || new Date()).toISOString().slice(0, 16),
      cargoQuantity: s.cargoQuantity,
      containerCount: s.containerCount ?? '',
      portName: s.portName || profile?.portName || '',
      assignedDock: s.assignedDock,
      status: s.status,
      notes: '',
      commodityType: s.commodityType || 'Other',
      startingPortCode: s.startingPort?.code || '',
      destinationPortCode: s.destinationPort?.code || '',
      estimatedArrivalTime: s.estimatedArrivalTime ? new Date(s.estimatedArrivalTime).toISOString().slice(0, 16) : '',
      // Custom port inputs
      customStartingPortName: s.startingPort?.name || '',
      customStartingPortCoords: s.startingPort?.coordinates || null,
      customDestinationPortName: s.destinationPort?.name || '',
      customDestinationPortCoords: s.destinationPort?.coordinates || null,
      useCustomPorts: !s.startingPort?.code && s.startingPort?.name, // Use custom if no code but has name
    });
    setRecommendation(s.optimizationRecommendation || null);
  };

  const saveEdit = async () => {
    try {
      let startingPort = null;
      let destinationPort = null;

      if (editForm.useCustomPorts) {
        // Use custom geocoded ports
        if (editForm.customStartingPortName && editForm.customStartingPortCoords) {
          startingPort = {
            name: editForm.customStartingPortName,
            coordinates: editForm.customStartingPortCoords,
          };
        }
        if (editForm.customDestinationPortName && editForm.customDestinationPortCoords) {
          destinationPort = {
            name: editForm.customDestinationPortName,
            coordinates: editForm.customDestinationPortCoords,
          };
        }
      } else {
        // Use predefined ports
        startingPort = PORT_OPTIONS.find((p) => p.code === editForm.startingPortCode) || null;
        destinationPort = PORT_OPTIONS.find((p) => p.code === editForm.destinationPortCode) || null;
      }

      const payload = {
        shipName: editForm.shipName,
        arrivalTime: editForm.departureTime,
        cargoQuantity: Number(editForm.cargoQuantity),
        containerCount: Number(editForm.containerCount),
        portName: editForm.portName,
        assignedDock: editForm.assignedDock,
        status: editForm.status,
        commodityType: editForm.commodityType,
        gasType: editForm.commodityType,
        startingPort,
        destinationPort,
        estimatedArrivalTime: editForm.estimatedArrivalTime || editForm.arrivalTime,
      };
      if (editForm.status !== 'En Route' && !String(editForm.assignedDock || '').trim()) {
        setToast({ message: 'Please use Suggest Best Dock before saving.', type: 'error' });
        return;
      }
      await axios.put(`${API}/${editShipment._id}`, payload, authConfig());
      setToast({ message: 'Shipment updated!', type: 'success' });
      setEditShipment(null);
      refreshFirstPage();
    } catch (err) {
      console.error('Save edit error:', err?.response?.data || err);
      setToast({ message: err?.response?.data?.message || 'Failed to update shipment.', type: 'error' });
    }
  };

  const openCreate = () => {
    setEditForm({
      shipName: '',
      departureTime: '',
      cargoQuantity: '',
      containerCount: '',
      portName: profile?.portName || '',
      assignedDock: '',
      status: 'Select Status',
      notes: '',
      commodityType: 'Other',
      startingPortCode: '',
      destinationPortCode: '',
      estimatedArrivalTime: '',
      // Custom port inputs
      customStartingPortName: '',
      customStartingPortCoords: null,
      customDestinationPortName: '',
      customDestinationPortCoords: null,
      useCustomPorts: false,
    });
    setRecommendation(null);
    setIsCreateModal(true);
  };

  const saveCreate = async () => {
    try {
      let startingPort = null;
      let destinationPort = null;

      if (editForm.useCustomPorts) {
        // Use custom geocoded ports
        if (editForm.customStartingPortName && editForm.customStartingPortCoords) {
          startingPort = {
            name: editForm.customStartingPortName,
            coordinates: editForm.customStartingPortCoords,
          };
        }
        if (editForm.customDestinationPortName && editForm.customDestinationPortCoords) {
          destinationPort = {
            name: editForm.customDestinationPortName,
            coordinates: editForm.customDestinationPortCoords,
          };
        }
      } else {
        // Use predefined ports
        startingPort = PORT_OPTIONS.find((p) => p.code === editForm.startingPortCode) || null;
        destinationPort = PORT_OPTIONS.find((p) => p.code === editForm.destinationPortCode) || null;
      }

      const payload = {
        shipName: editForm.shipName,
        arrivalTime: editForm.departureTime,
        cargoQuantity: Number(editForm.cargoQuantity),
        containerCount: Number(editForm.containerCount),
        portName: editForm.portName,
        assignedDock: editForm.assignedDock,
        status: editForm.status,
        commodityType: editForm.commodityType,
        gasType: editForm.commodityType,
        startingPort,
        destinationPort,
        estimatedArrivalTime: editForm.estimatedArrivalTime || editForm.arrivalTime,
      };
      if (editForm.status !== 'En Route' && !String(editForm.assignedDock || '').trim()) {
        setToast({ message: 'Please use Suggest Best Dock before creating shipment.', type: 'error' });
        return;
      }
      await axios.post(API, payload, authConfig());
      setToast({ message: 'Shipment created!', type: 'success' });
      setIsCreateModal(false);
      refreshFirstPage();
    } catch (err) {
      console.error('Save create error:', err?.response?.data || err);
      setToast({ message: err?.response?.data?.message || 'Failed to create shipment.', type: 'error' });
    }
  };

  const suggestBestDock = async () => {
    try {
      setSuggestLoading(true);
      const payload = {
        shipName: editForm.shipName,
        arrivalTime: editForm.departureTime,
        cargoQuantity: Number(editForm.cargoQuantity || 0),
        commodityType: editForm.commodityType,
        gasType: editForm.commodityType,
        portName: editForm.portName,
      };
      const endpoint = editShipment?._id ? `${API}/${editShipment._id}/suggest-dock` : `${API}/suggest-dock`;
      const response = await axios.post(endpoint, payload, authConfig());
      setRecommendation(response.data);
      setToast({ message: 'Best dock recommendation generated.', type: 'success' });
    } catch (err) {
      console.error('Suggest dock error:', err?.response?.data || err);
      setToast({ message: err?.response?.data?.message || 'Failed to suggest dock.', type: 'error' });
    } finally {
      setSuggestLoading(false);
    }
  };

  const useRecommendedDock = async () => {
    if (!recommendation?.recommendedDock) return;
    setAcceptingRecommendation(true);
    setEditForm((prev) => ({ ...prev, assignedDock: recommendation.recommendedDock }));
    setToast({ message: `Using ${recommendation.recommendedDock}. Save changes to persist.`, type: 'success' });
    setAcceptingRecommendation(false);
  };

  const previewRouteRisk = async () => {
    try {
      setPreviewLoading(true);
      let startingPort = null;
      let destinationPort = null;

      if (editForm.useCustomPorts) {
        // Use custom geocoded ports
        if (editForm.customStartingPortName && editForm.customStartingPortCoords) {
          startingPort = {
            name: editForm.customStartingPortName,
            coordinates: editForm.customStartingPortCoords,
          };
        }
        if (editForm.customDestinationPortName && editForm.customDestinationPortCoords) {
          destinationPort = {
            name: editForm.customDestinationPortName,
            coordinates: editForm.customDestinationPortCoords,
          };
        }
      } else {
        // Use predefined ports
        startingPort = PORT_OPTIONS.find((p) => p.code === editForm.startingPortCode) || null;
        destinationPort = PORT_OPTIONS.find((p) => p.code === editForm.destinationPortCode) || null;
      }

      const payload = {
        startingPort,
        destinationPort,
        estimatedArrivalTime: editForm.estimatedArrivalTime || editForm.departureTime,
      };
      const response = await axios.post(`${API}/calculate-route`, payload, authConfig());
      
      const { routeData, weatherRiskAssessment } = response.data;
      
      // Calculate realistic dynamic estimated arrival time
      const distanceNM = Number(routeData?.totalDistanceNM || 0);
      const transitHours = distanceNM / 15; // Assume 15 knots average speed
      const weatherDelayHours = Number(weatherRiskAssessment?.predictedDelayHours || 0);
      const totalDurationHours = transitHours + weatherDelayHours;
      
      if (editForm.departureTime && totalDurationHours > 0) {
        const estTime = new Date(new Date(editForm.departureTime).getTime() + totalDurationHours * 3600000);
        setEditForm(prev => ({ ...prev, estimatedArrivalTime: estTime.toISOString().slice(0, 16) }));
      }
      
      setRoutePreview(response.data);
    } catch (err) {
      setToast({ message: err?.response?.data?.message || 'Failed to preview route.', type: 'error' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const deleteShipment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shipment?")) return;
    try {
      await axios.delete(`${API}/${id}`, authConfig());
      setToast({ message: 'Shipment deleted.', type: 'success' });
      refreshFirstPage();
    } catch (err) {
      console.error('Delete error:', err?.response?.data || err);
      setToast({ message: err?.response?.data?.message || 'Failed to delete shipment.', type: 'error' });
    }
  };

  // Status History
  const viewHistory = async (s) => {
    setHistoryShipment(s);
    try {
      const res = await axios.get(`${API}/${s._id}/history`, authConfig());
      setHistoryData(res.data.history || []);
    } catch (err) {
      console.error('History error:', err?.response?.data || err);
      setHistoryData([]);
      setToast({ message: 'Failed to load history.', type: 'error' });
    }
  };

  // Notes
  const viewNotes = (s) => {
    setNoteShipmentId(s._id);
    setShipmentNotes(s.notes || []);
    setNoteText('');
    setEditingNoteId(null);
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      const endpoint = editingNoteId
        ? `${API}/${noteShipmentId}/notes/${editingNoteId}`
        : `${API}/${noteShipmentId}/notes`;
      const method = editingNoteId ? 'put' : 'post';
      const res = await axios[method](endpoint, { text: noteText }, authConfig());
      setShipmentNotes(res.data.notes);
      setNoteText('');
      setEditingNoteId(null);
      setToast({ message: editingNoteId ? 'Note updated!' : 'Note added!', type: 'success' });
      refreshFirstPage();
    } catch (err) {
      console.error('Add note error:', err?.response?.data || err);
      setToast({ message: err?.response?.data?.message || 'Failed to add note.', type: 'error' });
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Individual Shipment Actions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Edit details, view status history, add notes, or quick-update status
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/operator/dock-management')}
            className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
          >
            Manage Docks
          </button>
          <button
            onClick={openCreate}
            className="rounded-2xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
          >
            + Create Shipment
          </button>
        </div>
      </div>

      {/* Shipments grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        </div>
      ) : shipments.length === 0 ? (
        <div className="py-16 text-center text-slate-500">No shipments available.        </div>
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shipments.map((s) => (
            <div
              key={s._id}
              className="group rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-950/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{s.shipName}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(s.arrivalTime).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Cargo Qty</p>
                  <p className="mt-0.5 font-medium text-slate-200">{Number(s.cargoQuantity).toLocaleString()} MT</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Dock</p>
                  <p className="mt-0.5 font-medium text-slate-200">{s.assignedDock}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Port</p>
                  <p className="mt-0.5 font-medium text-slate-200">{s.portName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">Containers</p>
                  <p className="mt-0.5 font-medium text-slate-200">{Number(s.containerCount || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Quick status */}
              <div className="mt-4">
                <label className="mb-1 block text-xs text-slate-500">Quick Status</label>
                <select
                  value={s.status}
                  onChange={(e) => handleQuickStatus(s._id, e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="flex-1 rounded-xl bg-cyan-500/15 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/25"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => deleteShipment(s._id)}
                  className="flex-1 rounded-xl bg-rose-500/15 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/25"
                >
                  🗑️ Delete
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => viewHistory(s)}
                  className="flex-1 rounded-xl bg-blue-500/15 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-500/25"
                >
                  📜 History
                </button>
                <button
                  onClick={() => viewNotes(s)}
                  className="flex-1 rounded-xl bg-amber-500/15 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/25"
                >
                  💬 Notes{s.notes?.length ? ` (${s.notes.length})` : ''}
                </button>
              </div>
            </div>
          ))}
        </div>
        {hasMore && (
          <SeeMoreShipmentsButton onClick={loadMoreShipments} disabled={loadingMore} />
        )}
        </>
      )}

      {/* Edit/Create Modal */}
      {(editShipment || isCreateModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease] rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">{isCreateModal ? 'Create Shipment' : 'Edit Shipment'}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Ship Name</label>
                <input className={inputCls} value={editForm.shipName} onChange={(e) => setEditForm({ ...editForm, shipName: e.target.value })} />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Departure Time</label>
                  <div className="flex gap-2">
                    <input type="datetime-local" className={inputCls} value={editForm.departureTime} onChange={(e) => setEditForm({ ...editForm, departureTime: e.target.value })} />
                    <button className="rounded-lg bg-slate-800 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-700">OK</button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Estimated Arrival Time</label>
                  <div className="flex gap-2">
                    <input type="datetime-local" className={inputCls} value={editForm.estimatedArrivalTime} readOnly title="Auto-calculated during Preview Route" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Cargo Qty (MT)</label>
                  <input type="number" className={inputCls} value={editForm.cargoQuantity} onChange={(e) => setEditForm({ ...editForm, cargoQuantity: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Container count</label>
                  <input type="number" className={inputCls} value={editForm.containerCount} onChange={(e) => setEditForm({ ...editForm, containerCount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Port name</label>
                  <input
                    className={inputCls}
                    value={editForm.portName}
                    readOnly={profile?.role !== 'admin'}
                    onChange={(e) => setEditForm({ ...editForm, portName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Assigned Dock</label>
                  <input
                    className={inputCls}
                    value={editForm.assignedDock}
                    disabled
                  />
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-950/60 p-3">
                <button
                  onClick={suggestBestDock}
                  disabled={suggestLoading}
                  className="w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {suggestLoading ? 'Suggesting Best Dock...' : 'Suggest Best Dock'}
                </button>
                {recommendation?.recommendedDock && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                    <p><span className="font-semibold">Recommended Dock:</span> {recommendation.recommendedDock}</p>
                    <p className="mt-1"><span className="font-semibold">Reason:</span> {recommendation.reason || 'No reason provided.'}</p>
                    <p className="mt-1"><span className="font-semibold">Estimated Cost Saving:</span> {Number(recommendation.estimatedCostSaving || 0).toLocaleString()}</p>
                    <p className="mt-1"><span className="font-semibold">Estimated Time Saving:</span> {Number(recommendation.estimatedTimeSavingHours || 0)} hours</p>
                    {Array.isArray(recommendation.warnings) && recommendation.warnings.length > 0 && (
                      <p className="mt-1 text-amber-200"><span className="font-semibold">Warnings:</span> {recommendation.warnings.join(' | ')}</p>
                    )}
                    <button
                      onClick={useRecommendedDock}
                      disabled={acceptingRecommendation}
                      className="mt-3 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {acceptingRecommendation ? 'Applying Dock...' : 'Use This Dock'}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Status</label>
                <select className={inputCls} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="" enabled>Select Status</option>
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Commodity</label>
                  <select className={inputCls} value={editForm.commodityType} onChange={(e) => setEditForm({ ...editForm, commodityType: e.target.value })}>
                    {COMMODITY_OPTIONS.map((commodity) => <option key={commodity} value={commodity}>{commodity}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Port Selection Mode</label>
                  <select 
                    className={inputCls} 
                    value={editForm.useCustomPorts ? 'custom' : 'predefined'} 
                    onChange={(e) => setEditForm({ ...editForm, useCustomPorts: e.target.value === 'custom' })}
                  >
                    <option value="predefined">Predefined Ports</option>
                    <option value="custom">Custom Ports (Geocode)</option>
                  </select>
                </div>
              </div>

              {editForm.useCustomPorts ? (
                // Custom port inputs with geocoding
                <div className="space-y-3">
                  <PortCoordinateInput
                    label="Starting Port"
                    portName={editForm.customStartingPortName}
                    setPortName={(name) => setEditForm({ ...editForm, customStartingPortName: name })}
                    coordinates={editForm.customStartingPortCoords}
                    setCoordinates={(coords) => setEditForm({ ...editForm, customStartingPortCoords: coords })}
                  />
                  <PortCoordinateInput
                    label="Destination Port"
                    portName={editForm.customDestinationPortName}
                    setPortName={(name) => setEditForm({ ...editForm, customDestinationPortName: name })}
                    coordinates={editForm.customDestinationPortCoords}
                    setCoordinates={(coords) => setEditForm({ ...editForm, customDestinationPortCoords: coords })}
                  />
                </div>
              ) : (
                // Predefined port dropdowns
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Starting Port</label>
                    <select className={inputCls} value={editForm.startingPortCode} onChange={(e) => setEditForm({ ...editForm, startingPortCode: e.target.value })}>
                      <option value="">Select</option>
                      {PORT_OPTIONS.map((port) => <option key={port.code} value={port.code}>{port.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Destination Port</label>
                    <select className={inputCls} value={editForm.destinationPortCode} onChange={(e) => setEditForm({ ...editForm, destinationPortCode: e.target.value })}>
                      <option value="">Select</option>
                      {PORT_OPTIONS.map((port) => <option key={port.code} value={port.code}>{port.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <button onClick={previewRouteRisk} disabled={previewLoading} className="w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50">
                {previewLoading ? 'Previewing...' : 'Preview Route & Weather Risk'}
              </button>
              {routePreview && (
                <div className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-950/60 p-4">
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span>Distance: <span className="text-white font-medium">{Number(routePreview?.routeData?.totalDistanceNM || 0).toFixed(1)} NM</span></span>
                    <span className={`px-2 py-0.5 rounded-full uppercase font-bold ${routePreview?.weatherRiskAssessment?.riskLevel === 'critical' ? 'bg-rose-500/20 text-rose-300' :
                        routePreview?.weatherRiskAssessment?.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-300' :
                          routePreview?.weatherRiskAssessment?.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-emerald-500/20 text-emerald-300'
                      }`}>
                      {routePreview?.weatherRiskAssessment?.riskLevel || 'low'} Risk
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${routePreview?.weatherRiskAssessment?.overallRiskScore > 75 ? 'bg-rose-500' :
                          routePreview?.weatherRiskAssessment?.overallRiskScore > 50 ? 'bg-orange-500' :
                            routePreview?.weatherRiskAssessment?.overallRiskScore > 25 ? 'bg-amber-500' :
                              'bg-emerald-500'
                        }`}
                      style={{ width: `${routePreview?.weatherRiskAssessment?.overallRiskScore || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Risk Score: {routePreview?.weatherRiskAssessment?.overallRiskScore || 0}/100</span>
                  </div>
                  
                  {/* Visual Map in Preview */}
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-700/50 h-48">
                    <RouteMap 
                      startingPort={
                        editForm.useCustomPorts 
                          ? (editForm.customStartingPortName && editForm.customStartingPortCoords ? {
                              name: editForm.customStartingPortName,
                              coordinates: editForm.customStartingPortCoords,
                            } : null)
                          : PORT_OPTIONS.find(p => p.code === editForm.startingPortCode)
                      }
                      destinationPort={
                        editForm.useCustomPorts
                          ? (editForm.customDestinationPortName && editForm.customDestinationPortCoords ? {
                              name: editForm.customDestinationPortName,
                              coordinates: editForm.customDestinationPortCoords,
                            } : null)
                          : PORT_OPTIONS.find(p => p.code === editForm.destinationPortCode)
                      }
                      waypoints={routePreview?.routeData?.waypoints || []}
                      routeSource={routePreview?.routeData?.routeApiSource}
                      weatherAlerts={routePreview?.weatherRiskAssessment?.weatherAlerts || []}
                    />
                  </div>

                  {routePreview?.weatherRiskAssessment?.weatherAlerts?.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Potential Hazards</p>
                      {routePreview.weatherRiskAssessment.weatherAlerts.slice(0, 2).map((alert, idx) => (
                        <div key={idx} className="text-[11px] text-slate-300 leading-tight border-l-2 border-slate-700 pl-2">
                          {alert.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setEditShipment(null); setIsCreateModal(false); }} className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={isCreateModal ? saveCreate : saveEdit} className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">{isCreateModal ? 'Create' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[slideUp_0.3s_ease] rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Status History</h3>
                <p className="text-sm text-slate-400">{historyShipment.shipName}</p>
              </div>
              <button onClick={() => setHistoryShipment(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="mt-6 max-h-80 overflow-y-auto">
              {historyData.length === 0 ? (
                <p className="text-center text-sm text-slate-500">No history recorded yet.</p>
              ) : (
                <div className="relative border-l-2 border-slate-700 pl-6">
                  {historyData.map((h, i) => {
                    const cfg = STATUS_CONFIG[h.status] || STATUS_CONFIG['Select Status'];
                    return (
                      <div key={i} className="relative mb-6 last:mb-0">
                        <div
                          className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2"
                          style={{ borderColor: cfg.color, background: cfg.bg }}
                        />
                        <div className="rounded-xl bg-slate-800/60 p-3">
                          <StatusBadge status={h.status} />
                          <p className="mt-2 text-xs text-slate-400">
                            {new Date(h.changedAt).toLocaleString()} • by {h.changedBy}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {noteShipmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[slideUp_0.3s_ease] rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-white">Shipment Notes</h3>
              <button onClick={() => setNoteShipmentId(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="mt-4 max-h-60 space-y-3 overflow-y-auto">
              {shipmentNotes.length === 0 ? (
                <p className="text-center text-sm text-slate-500">No notes yet.</p>
              ) : (
                shipmentNotes.map((n, i) => (
                  <div key={i} className="rounded-xl bg-slate-800/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-slate-200">{n.text}</p>
                      <button
                        onClick={() => {
                          setEditingNoteId(n._id);
                          setNoteText(n.text);
                        }}
                        className="rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-300 transition hover:bg-amber-500/25"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {n.author} • {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={editingNoteId ? 'Edit note…' : 'Add a note…'}
                className={inputCls + ' flex-1'}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
              />
              <button
                onClick={addNote}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                {editingNoteId ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ShipmentActions;
