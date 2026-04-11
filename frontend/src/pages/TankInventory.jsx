import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';
import TankModal from '../components/TankModal';

const TankInventory = () => {
  const { profile } = useOutletContext() || {};
  const [tanks, setTanks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTank, setSelectedTank] = useState(null);
  const [modalError, setModalError] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  const reloadTanks = useCallback(
    () =>
      api
        .get('/tanks')
        .then((res) => {
          setTanks(res.data);
        })
        .catch((err) => {
          console.error(err);
        }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    reloadTanks().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadTanks]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredTanks = tanks.filter(
    (tank) =>
      tank.tankId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tank.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTanks = tanks.length;
  const totalCapacity = tanks.reduce((acc, curr) => acc + curr.capacity, 0);
  const currentTotalFill = tanks.reduce((acc, curr) => acc + curr.currentLevel, 0);
  const avgFill = totalCapacity === 0 ? 0 : Math.round((currentTotalFill / totalCapacity) * 100);

  const getStatus = (capacity, currentLevel) => {
    const fillPercentage = capacity === 0 ? 0 : (currentLevel / capacity) * 100;
    if (fillPercentage >= 90) return { text: 'Critical', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    if (fillPercentage >= 75) return { text: 'Near Full', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    return { text: 'Safe', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  };

  const handleEdit = (tank) => {
    setModalError('');
    setSelectedTank(tank);
    setIsModalOpen(true);
  };

  const getNextTankId = () => {
    const existingIds = tanks.map(t => t.tankId).filter(id => typeof id === 'string' && id.startsWith('TK-'));
    let maxNum = 0;
    existingIds.forEach(id => {
      const num = parseInt(id.replace('TK-', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return `TK-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleAddNew = () => {
    setModalError('');
    setSelectedTank(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (formData) => {
    setModalError('');

    if (!selectedTank) {
      const isDuplicate = tanks.some(t => t.tankId.toLowerCase() === formData.tankId.toLowerCase());
      if (isDuplicate) {
        setModalError("Don't use existing tank id");
        return;
      }
    }

    try {
      if (selectedTank) {
        await api.put(`/tanks/${selectedTank._id}`, formData);
      } else {
        await api.post('/tanks', formData);
      }
      setIsModalOpen(false);
      reloadTanks();
    } catch (err) {
      console.error('Error saving tank:', err);
      if (err.response && err.response.data && err.response.data.message) {
        if (err.response.data.message.includes('E11000 duplicate key error')) {
          setModalError("Don't use existing tank id");
        } else {
          setModalError(err.response.data.message);
        }
      } else {
        setModalError('Failed to save tank. Please try again.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this tank?')) {
      try {
        await api.delete(`/tanks/${id}`);
        reloadTanks();
      } catch (err) {
        console.error('Error deleting tank:', err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Tank Inventory Management</h1>
          <p className="mt-1 text-slate-400">Add, update or delete tank records from the inventory.</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleAddNew}
            className="rounded-2xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition shadow-lg shadow-cyan-900/30"
          >
            + Add New Tank
          </button>
        )}
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/5 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total Tanks</p>
          <p className="mt-2 text-3xl font-bold text-white">{totalTanks}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/5 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total Capacity</p>
          <p className="mt-2 text-3xl font-bold text-white">{totalCapacity.toLocaleString()} <span className="text-lg text-slate-500 font-normal">KL</span></p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 ring-1 ring-white/5 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500">Average Fill</p>
          <p className="mt-2 text-3xl font-bold text-white">{avgFill}%</p>
        </div>
      </div>

      {/* Search and Table */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 ring-1 ring-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Tank Inventory</h2>
          <input
            type="text"
            placeholder="Search by Tank ID or Location"
            value={searchQuery}
            onChange={handleSearch}
            className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition w-full sm:w-72"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950/90 text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-medium">Tank ID</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Commodity</th>
                <th className="px-5 py-3 font-medium">Capacity (kL)</th>
                <th className="px-5 py-3 font-medium min-w-[150px]">Current Level</th>
                <th className="px-5 py-3 font-medium text-center">Fill %</th>
                <th className="px-5 py-3 font-medium text-center">Status</th>
                {isAdmin && <th className="px-5 py-3 font-medium text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-5 py-10 text-center text-slate-500">Loading tanks...</td>
                </tr>
              ) : filteredTanks.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-5 py-10 text-center text-slate-500">No tanks found.</td>
                </tr>
              ) : (
                filteredTanks.map((tank) => {
                  const fillPercentage = tank.capacity === 0 ? 0 : Math.round((tank.currentLevel / tank.capacity) * 100);
                  const status = getStatus(tank.capacity, tank.currentLevel);

                  let progressColor = 'bg-emerald-500';
                  if (fillPercentage >= 90) progressColor = 'bg-rose-500';
                  else if (fillPercentage >= 75) progressColor = 'bg-amber-500';

                  return (
                    <tr key={tank._id} className="transition hover:bg-sky-500/5">
                      <td className="px-5 py-3 font-medium text-slate-200">{tank.tankId}</td>
                      <td className="px-5 py-3 text-slate-400">{tank.location}</td>
                      <td className="px-5 py-3 text-slate-300 font-medium">{tank.commodity}</td>
                      <td className="px-5 py-3 text-slate-400">{tank.capacity.toLocaleString()} kL</td>
                      <td className="px-5 py-3">
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div className={`${progressColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(fillPercentage, 100)}%` }}></div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center font-medium text-slate-300">{fillPercentage}%</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(tank)}
                              className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline py-1"
                            >
                              Edit
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                              onClick={() => handleDelete(tank._id)}
                              className="text-rose-500 hover:text-rose-400 font-medium hover:underline py-1"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TankModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        tankData={selectedTank}
        defaultTankId={getNextTankId()}
        errorMsg={modalError}
      />
    </div>
  );
};

export default TankInventory;
