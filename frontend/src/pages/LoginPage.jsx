import VideoBackground from '../components/VideoBackground';     //new lines
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { API_BASE } from '../config';

const AUTH_API = `${API_BASE}/auth`;

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
      // Role-based redirect: operators go directly to operator hub
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
    // <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
    //   <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-30">
    //     <source src="https://cdn.pixabay.com/vimeo/583496330/ship-91781.mp4?width=1280&hash=8f77f8d0180d1a18b2ccbbee6f1c28464a37ed8d" type="video/mp4" />
    //   </video>
    <div className="relative min-h-screen overflow-hidden text-slate-50">
      {/* //new lines 69-72 */}
      <VideoBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-950/90 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5 rounded-3xl bg-slate-900/90 p-8">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">port Control Access</p>
                <h1 className="mt-4 text-4xl font-semibold text-white">Login to Flowsynq</h1>
                <p className="mt-3 text-slate-300">Sign in securely with your username or email and password for port operations and analytics access.</p>
              </div>

              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Username or email</label>
                  <input
                    name="identifier"
                    value={form.identifier}
                    onChange={handleChange}
                    required
                    placeholder="username or email"
                    className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    required
                    placeholder="********"
                    className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                    />
                    Show password
                  </label>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={form.remember}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
                    />
                    Remember me
                  </label>
                  <Link to="/signup" className="text-sm text-cyan-300 hover:text-cyan-200">Create account</Link>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              {message && <p className="rounded-3xl border border-cyan-500/40 bg-slate-900/80 px-4 py-3 text-sm text-cyan-200">{message}</p>}

              <div className="space-y-4 pt-3 flex flex-col items-center">
                <div className="flex items-center w-full mb-2">
                  <div className="flex-grow border-t border-slate-700"></div>
                  <span className="px-3 text-sm text-slate-500">or</span>
                  <div className="flex-grow border-t border-slate-700"></div>
                </div>
                <GoogleLogin
                  onSuccess={(credentialResponse) => handleGoogleSuccess(credentialResponse.credential)}
                  onError={() => setMessage('Google Login Failed')}
                  theme="filled_black"
                  shape="pill"
                />
              </div>
            </div>

            <div className="hidden rounded-3xl bg-gradient-to-br from-cyan-500/20 to-slate-950/70 p-8 text-slate-100 lg:block">
              <div className="space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">port Analytics</p>
                  <h2 className="mt-4 text-3xl font-semibold">Secure access for operations, inventory and forecasting.</h2>
                </div>
                <div className="rounded-3xl bg-slate-900/80 p-6">
                  <h3 className="text-xl font-semibold text-white">Why Flowsynq?</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    <li>• Role-based access for Admin, Operator and Analyst.</li>
                    <li>• Secure username/password login for all users.</li>
                    <li>• Designed for port and tank logistics workflows.</li>
                  </ul>
                </div>
                <div className="rounded-3xl border border-slate-700 bg-slate-950/90 p-6">
                  <p className="text-sm text-slate-400">Use admin email:</p>
                  <p className="mt-2 text-lg font-semibold text-white">admin@flowsynq.org</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
