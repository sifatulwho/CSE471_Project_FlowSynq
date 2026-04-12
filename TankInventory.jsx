import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import TankModal from '../TankModal';

const TankInventory = () => {
  const [tanks, setTanks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTank, setSelectedTank] = useState(null);
  const [modalError, setModalError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTanks = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/tanks');
      setTanks(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTanks();
  }, []);

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

    // Explicitly check for duplicate tank ID before making backend request
    if (!selectedTank) {
      const isDuplicate = tanks.some(t => t.tankId.toLowerCase() === formData.tankId.toLowerCase());
      if (isDuplicate) {
        setModalError("Don't use existing tank id");
        return;
      }
    }

    try {
      if (selectedTank) {
        await axios.put(`http://localhost:5001/api/tanks/${selectedTank._id}`, formData);
      } else {
        await axios.post('http://localhost:5001/api/tanks', formData);
      }
      setIsModalOpen(false);
      fetchTanks();
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
        await axios.delete(`http://localhost:5001/api/tanks/${id}`);
        fetchTanks();
      } catch (err) {
        console.error('Error deleting tank:', err);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('flowsynqToken');
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white tracking-tight">Flowsynq</h2>
          <p className="text-xs text-cyan-400 mt-1 uppercase tracking-widest">Port Control</p>
        </div>
        <div className="flex-1 p-4 space-y-2">
          <button onClick={() => navigate('/dashboard')} className="w-full text-left px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition">
            Dashboard
          </button>
          <button className="w-full text-left px-4 py-3 rounded-xl bg-cyan-500/10 text-cyan-400 font-medium border border-cyan-500/20">
            Tank Inventory
          </button>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition font-medium">
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 lg:p-8 bg-slate-950/50 overflow-hidden h-screen">
        <div className="space-y-6 flex-shrink-0">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Tank Inventory Management</h1>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-full font-medium transition shadow-lg shadow-blue-900/50"
          >
            + Add New
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center shadow-lg">
            <span className="text-slate-400 text-sm font-medium mb-1">Total Tanks</span>
            <span className="text-4xl font-bold text-white">{totalTanks}</span>
          </div>
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center shadow-lg">
            <span className="text-slate-400 text-sm font-medium mb-1">Total Capacity</span>
            <span className="text-4xl font-bold text-white">{totalCapacity} <span className="text-xl text-slate-500 font-normal">KL</span></span>
          </div>
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center shadow-lg">
            <span className="text-slate-400 text-sm font-medium mb-1">Average Fill</span>
            <span className="text-4xl font-bold text-white">{avgFill}%</span>
          </div>
        </div>
        </div>

        {/* Search and Table Container */}
        <div className="mt-6 flex-1 flex flex-col bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden min-h-0">

          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-semibold text-white">Tank Inventory</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Tank ID or Location"
                value={searchQuery}
                onChange={handleSearch}
                className="bg-slate-950 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg w-full sm:w-72 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>
          </div>

          <div className="overflow-auto flex-1 relative">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 bg-slate-950/90 text-slate-400 border-b border-slate-800 z-10 backdrop-blur-sm shadow-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Tank ID</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Commodity</th>
                  <th className="px-6 py-4 font-medium">Capacity (kL)</th>
                  <th className="px-6 py-4 font-medium min-w-[150px]">Current Level</th>
                  <th className="px-6 py-4 font-medium text-center">Fill %</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-slate-500">Loading tanks...</td>
                  </tr>
                ) : filteredTanks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-slate-500">No tanks found.</td>
                  </tr>
                ) : (
                  filteredTanks.map((tank) => {
                    const fillPercentage = tank.capacity === 0 ? 0 : Math.round((tank.currentLevel / tank.capacity) * 100);
                    const status = getStatus(tank.capacity, tank.currentLevel);

                    let progressColor = 'bg-emerald-500';
                    if (fillPercentage >= 90) progressColor = 'bg-rose-500';
                    else if (fillPercentage >= 75) progressColor = 'bg-amber-500';

                    return (
                      <tr key={tank._id} className="hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 font-medium text-slate-200">{tank.tankId}</td>
                        <td className="px-6 py-4 text-slate-400">{tank.location}</td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{tank.commodity}</td>
                        <td className="px-6 py-4 text-slate-400">{tank.capacity} kL</td>
                        <td className="px-6 py-4">
                          <div className="w-full bg-slate-800 rounded-full h-2">
                            <div className={`${progressColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(fillPercentage, 100)}%` }}></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-slate-300">{fillPercentage}%</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
