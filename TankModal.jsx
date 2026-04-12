import React, { useState, useEffect } from 'react';
/* eslint-disable */

const TankModal = ({ isOpen, onClose, onSave, tankData, defaultTankId, errorMsg }) => {
  const [formData, setFormData] = useState({
    tankId: '',
    location: '',
    commodity: '',
    capacity: 0,
    currentLevel: 0
  });

  useEffect(() => {
    if (tankData) {
      setFormData(tankData);
    } else {
      setFormData({
        tankId: defaultTankId || '',
        location: '',
        commodity: '',
        capacity: 0,
        currentLevel: 0
      });
    }
  }, [tankData, isOpen, defaultTankId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'capacity' || name === 'currentLevel' ? Number(value) : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <h2 className="text-xl font-semibold text-white">{tankData ? 'Update Tank' : 'Add New Tank'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">&times;</button>
        </div>
        
        {errorMsg && (
          <div className="px-6 pt-4">
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm">
              {errorMsg}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Tank ID</label>
            <input 
              type="text" 
              name="tankId" 
              value={formData.tankId} 
              onChange={handleChange} 
              disabled={!!tankData}
              required 
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Location</label>
            <input 
              type="text" 
              name="location" 
              value={formData.location} 
              onChange={handleChange} 
              required 
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Commodity</label>
            <input 
              type="text" 
              name="commodity" 
              value={formData.commodity} 
              onChange={handleChange} 
              required 
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Capacity</label>
              <input 
                type="number" 
                name="capacity" 
                value={formData.capacity} 
                onChange={handleChange} 
                min="1"
                required 
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Current Level</label>
              <input 
                type="number" 
                name="currentLevel" 
                value={formData.currentLevel} 
                onChange={handleChange} 
                min="0"
                max={formData.capacity}
                required 
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>
          </div>
          
          <div className="pt-4 flex items-center justify-end gap-3 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-slate-300 font-medium hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-full font-medium transition shadow-lg shadow-cyan-900/40"
            >
              {tankData ? 'Save Changes' : 'Create Tank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TankModal;
