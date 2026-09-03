import VideoBackground from '../components/VideoBackground';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { API_BASE } from '../config';

const AUTH_API = `${API_BASE}/auth`;

const inputCls =
  'auth-input w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20';

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '', remember: false });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('flowsynqRemember');
    if (saved) {
      const data = JSON.parse(saved);
      setForm((prev) => ({
        ...prev,
        identifier: data.identifier || data.username || '',
        password: data.password || '',
        remember: true,
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API}/login`, {
        identifier: form.identifier,
        password: form.password,
      });
      localStorage.setItem('flowsynqToken', response.data.token);
      localStorage.setItem('flowsynqUser', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('flowsynq-auth-change'));
      if (form.remember) {
        localStorage.setItem('flowsynqRemember', JSON.stringify({ identifier: form.identifier, password: form.password }));
      } else {
        localStorage.removeItem('flowsynqRemember');
      }
      if (response.data.user.role === 'operator') {
        navigate('/operator/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed. Please check your username/email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setMessage('');
    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API}/google-login`, {
        credential,
      });
      localStorage.setItem('flowsynqToken', response.data.token);
      localStorage.setItem('flowsynqUser', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('flowsynq-auth-change'));

      if (response.data.user.role === 'operator') {
        navigate('/operator/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-50">
      <VideoBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center overflow-y-auto px-4 py-10">
        <div className="auth-card w-full max-w-md rounded-xl border border-slate-600/70 border-t-2 border-t-cyan-500 bg-slate-900/90 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
          <div className="auth-header mb-7 border-b border-slate-700/80 pb-6 text-center">
            <p className="text-xl font-semibold tracking-wide text-cyan-400">FlowSynq</p>
            <p className="mt-1 text-sm text-slate-400">Port Operations Portal</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="auth-field auth-delay-1">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Username or Email
              </label>
              <input
                name="identifier"
                value={form.identifier}
                onChange={handleChange}
                required
                autoComplete="username"
                placeholder="Enter username or email"
                className={inputCls}
              />
            </div>

            <div className="auth-field auth-delay-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Password
              </label>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="Enter password"
                className={inputCls}
              />
            </div>

            <div className="auth-field auth-delay-3 flex items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                />
                Remember me
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                />
                Show password
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-btn auth-field auth-delay-4 mt-2 w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {message && (
            <p className="auth-alert mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
              {message}
            </p>
          )}

          <div className="auth-field auth-delay-5 my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs text-slate-500">or continue with</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="auth-field auth-delay-5 flex justify-center">
            <GoogleLogin
              onSuccess={(credentialResponse) => handleGoogleSuccess(credentialResponse.credential)}
              onError={() => setMessage('Google login failed.')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              width="100%"
            />
          </div>

          <p className="auth-field auth-delay-6 mt-6 text-center text-sm text-slate-400">
            No account?{' '}
            <Link to="/signup" className="auth-link font-medium text-cyan-300 hover:text-cyan-200">
              Register
            </Link>
              {' '}|{' '}
              <Link to="/demo-request" className="auth-link font-medium text-cyan-300 hover:text-cyan-200">
                Request a demo
              </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
