import { useState, useRef } from 'react';
import { api } from '../api';
import { API_HOST } from '../config';

const ProfileModal = ({ profile, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    username: profile?.username || '',
    email: profile?.email || '',
    password: '',
  });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(profile?.profilePicture ? `${API_HOST}${profile.profilePicture}` : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      if (formData.fullName !== profile.fullName) data.append('fullName', formData.fullName);
      if (formData.username !== profile.username) data.append('username', formData.username);
      if (formData.email !== profile.email) data.append('email', formData.email);
      if (formData.password) data.append('password', formData.password);
      if (file) data.append('profilePicture', file);

      const hasChanges =
        formData.fullName !== profile.fullName ||
        formData.username !== profile.username ||
        formData.email !== profile.email ||
        Boolean(formData.password) ||
        Boolean(file);

      if (!hasChanges) {
        setLoading(false);
        onClose();
        return;
      }

      const token = localStorage.getItem('flowsynqToken');
      const response = await api.put('/auth/profile', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });

      setSuccess('Profile updated successfully!');
      onUpdate(response.data.user);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-700/60 p-4 bg-slate-800/50">
          <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20">{error}</div>}
          {success && <div className="text-sm text-emerald-400 bg-emerald-400/10 p-3 rounded-xl border border-emerald-400/20">{success}</div>}

          {/* Profile Picture */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div
              className="relative h-20 w-20 rounded-full border border-slate-700/60 bg-slate-800 flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-slate-400 uppercase">
                  {profile?.fullName?.charAt(0) || profile?.username?.charAt(0)}
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Change Picture
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900 p-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900 p-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900 p-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">New Password (Optional)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Leave blank to keep current"
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900 p-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 p-2.5 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
