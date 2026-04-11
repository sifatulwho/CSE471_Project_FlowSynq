import { useState } from 'react';
import { getPortCoordinates } from '../api';

const PortCoordinateInput = ({ label, portName, setPortName, coordinates, setCoordinates, disabled = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGeocode = async () => {
    if (!portName.trim()) {
      setError('Please enter a port name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await getPortCoordinates(portName.trim());
      if (result && result.success && result.data) {
        setCoordinates({
          latitude: result.data.latitude,
          longitude: result.data.longitude
        });
        setError('');
      } else {
        setError('Port not found. Please check the name and try again.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to geocode port. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20';

  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          className={inputCls}
          value={portName}
          onChange={(e) => setPortName(e.target.value)}
          placeholder="Enter port name"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleGeocode}
          disabled={loading || disabled || !portName.trim()}
          className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        >
          {loading ? '...' : 'Geocode'}
        </button>
      </div>
      {coordinates && (
        <div className="text-xs text-slate-500">
          Coordinates: {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
        </div>
      )}
      {error && (
        <div className="text-xs text-rose-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default PortCoordinateInput;