import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import VideoBackground from '../components/VideoBackground';
import { COMMODITY_OPTIONS } from '../constants/ports';
import { API_BASE } from '../config';

const COUNTRIES = [
  { name: 'Afghanistan', flag: '🇦🇫' }, { name: 'Albania', flag: '🇦🇱' }, { name: 'Algeria', flag: '🇩🇿' }, { name: 'Andorra', flag: '🇦🇩' },
  { name: 'Angola', flag: '🇦🇴' }, { name: 'Antigua and Barbuda', flag: '🇦🇬' }, { name: 'Argentina', flag: '🇦🇷' }, { name: 'Armenia', flag: '🇦🇲' },
  { name: 'Australia', flag: '🇦🇺' }, { name: 'Austria', flag: '🇦🇹' }, { name: 'Azerbaijan', flag: '🇦🇿' }, { name: 'Bahamas', flag: '🇧🇸' },
  { name: 'Bahrain', flag: '🇧🇭' }, { name: 'Bangladesh', flag: '🇧🇩' }, { name: 'Barbados', flag: '🇧🇧' }, { name: 'Belarus', flag: '🇧🇾' },
  { name: 'Belgium', flag: '🇧🇪' }, { name: 'Belize', flag: '🇧🇿' }, { name: 'Benin', flag: '🇧🇯' }, { name: 'Bhutan', flag: '🇧🇹' },
  { name: 'Bolivia', flag: '🇧🇴' }, { name: 'Bosnia and Herzegovina', flag: '🇧🇦' }, { name: 'Botswana', flag: '🇧🇼' }, { name: 'Brazil', flag: '🇧🇷' },
  { name: 'Brunei', flag: '🇧🇳' }, { name: 'Bulgaria', flag: '🇧🇬' }, { name: 'Burkina Faso', flag: '🇧🇫' }, { name: 'Burundi', flag: '🇧🇮' },
  { name: 'Cabo Verde', flag: '🇨🇻' }, { name: 'Cambodia', flag: '🇰🇭' }, { name: 'Cameroon', flag: '🇨🇲' }, { name: 'Canada', flag: '🇨🇦' },
  { name: 'Central African Republic', flag: '🇨🇫' }, { name: 'Chad', flag: '🇹🇩' }, { name: 'Chile', flag: '🇨🇱' }, { name: 'China', flag: '🇨🇳' },
  { name: 'Colombia', flag: '🇨🇴' }, { name: 'Comoros', flag: '🇰🇲' }, { name: 'Congo', flag: '🇨🇬' }, { name: 'Costa Rica', flag: '🇨🇷' },
  { name: 'Croatia', flag: '🇭🇷' }, { name: 'Cuba', flag: '🇨🇺' }, { name: 'Cyprus', flag: '🇨🇾' }, { name: 'Czech Republic', flag: '🇨🇿' },
  { name: 'Denmark', flag: '🇩🇰' }, { name: 'Djibouti', flag: '🇩🇯' }, { name: 'Dominica', flag: '🇩🇲' }, { name: 'Dominican Republic', flag: '🇩🇴' },
  { name: 'Ecuador', flag: '🇪🇨' }, { name: 'Egypt', flag: '🇪🇬' }, { name: 'El Salvador', flag: '🇸🇻' }, { name: 'Equatorial Guinea', flag: '🇬🇶' },
  { name: 'Eritrea', flag: '🇪🇷' }, { name: 'Estonia', flag: '🇪🇪' }, { name: 'Eswatini', flag: '🇸🇿' }, { name: 'Ethiopia', flag: '🇪🇹' },
  { name: 'Fiji', flag: '🇫🇯' }, { name: 'Finland', flag: '🇫🇮' }, { name: 'France', flag: '🇫🇷' }, { name: 'Gabon', flag: '🇬🇦' },
  { name: 'Gambia', flag: '🇬🇲' }, { name: 'Georgia', flag: '🇬🇪' }, { name: 'Germany', flag: '🇩🇪' }, { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Greece', flag: '🇬🇷' }, { name: 'Grenada', flag: '🇬🇩' }, { name: 'Guatemala', flag: '🇬🇹' }, { name: 'Guinea', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', flag: '🇬🇼' }, { name: 'Guyana', flag: '🇬🇾' }, { name: 'Haiti', flag: '🇭🇹' }, { name: 'Honduras', flag: '🇭🇳' },
  { name: 'Hungary', flag: '🇭🇺' }, { name: 'Iceland', flag: '🇮🇸' }, { name: 'India', flag: '🇮🇳' }, { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Iran', flag: '🇮🇷' }, { name: 'Iraq', flag: '🇮🇶' }, { name: 'Ireland', flag: '🇮🇪' }, { name: 'Israel', flag: '🇮🇱' },
  { name: 'Italy', flag: '🇮🇹' }, { name: 'Jamaica', flag: '🇯🇲' }, { name: 'Japan', flag: '🇯🇵' }, { name: 'Jordan', flag: '🇯🇴' },
  { name: 'Kazakhstan', flag: '🇰🇿' }, { name: 'Kenya', flag: '🇰🇪' }, { name: 'Kiribati', flag: '🇰🇮' }, { name: 'Kuwait', flag: '🇰🇼' },
  { name: 'Kyrgyzstan', flag: '🇰🇬' }, { name: 'Laos', flag: '🇱🇦' }, { name: 'Latvia', flag: '🇱🇻' }, { name: 'Lebanon', flag: '🇱🇧' },
  { name: 'Lesotho', flag: '🇱🇸' }, { name: 'Liberia', flag: '🇱🇷' }, { name: 'Libya', flag: '🇱🇾' }, { name: 'Liechtenstein', flag: '🇱🇮' },
  { name: 'Lithuania', flag: '🇱🇹' }, { name: 'Luxembourg', flag: '🇱🇺' }, { name: 'Madagascar', flag: '🇲🇬' }, { name: 'Malawi', flag: '🇲🇼' },
  { name: 'Malaysia', flag: '🇲🇾' }, { name: 'Maldives', flag: '🇲🇻' }, { name: 'Mali', flag: '🇲🇱' }, { name: 'Malta', flag: '🇲🇹' },
  { name: 'Marshall Islands', flag: '🇲🇭' }, { name: 'Mauritania', flag: '🇲🇷' }, { name: 'Mauritius', flag: '🇲🇺' }, { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Micronesia', flag: '🇫🇲' }, { name: 'Moldova', flag: '🇲🇩' }, { name: 'Monaco', flag: '🇲🇨' }, { name: 'Mongolia', flag: '🇲🇳' },
  { name: 'Montenegro', flag: '🇲🇪' }, { name: 'Morocco', flag: '🇲🇦' }, { name: 'Mozambique', flag: '🇲🇿' }, { name: 'Myanmar', flag: '🇲🇲' },
  { name: 'Namibia', flag: '🇳🇦' }, { name: 'Nauru', flag: '🇳🇷' }, { name: 'Nepal', flag: '🇳🇵' }, { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'New Zealand', flag: '🇳🇿' }, { name: 'Nicaragua', flag: '🇳🇮' }, { name: 'Niger', flag: '🇳🇪' }, { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'North Korea', flag: '🇰🇵' }, { name: 'North Macedonia', flag: '🇲🇰' }, { name: 'Norway', flag: '🇳🇴' }, { name: 'Oman', flag: '🇴🇲' },
  { name: 'Pakistan', flag: '🇵🇰' }, { name: 'Palau', flag: '🇵🇼' }, { name: 'Palestine', flag: '🇵🇸' }, { name: 'Panama', flag: '🇵🇦' },
  { name: 'Papua New Guinea', flag: '🇵🇬' }, { name: 'Paraguay', flag: '🇵🇾' }, { name: 'Peru', flag: '🇵🇪' }, { name: 'Philippines', flag: '🇵🇭' },
  { name: 'Poland', flag: '🇵🇱' }, { name: 'Portugal', flag: '🇵🇹' }, { name: 'Qatar', flag: '🇶🇦' }, { name: 'Romania', flag: '🇷🇴' },
  { name: 'Russia', flag: '🇷🇺' }, { name: 'Rwanda', flag: '🇷🇼' }, { name: 'Saint Kitts and Nevis', flag: '🇰🇳' }, { name: 'Saint Lucia', flag: '🇱🇨' },
  { name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' }, { name: 'Samoa', flag: '🇼🇸' }, { name: 'San Marino', flag: '🇸🇲' },
  { name: 'Sao Tome and Principe', flag: '🇸🇹' }, { name: 'Saudi Arabia', flag: '🇸🇦' }, { name: 'Senegal', flag: '🇸🇳' }, { name: 'Serbia', flag: '🇷🇸' },
  { name: 'Seychelles', flag: '🇸🇨' }, { name: 'Sierra Leone', flag: '🇸🇱' }, { name: 'Singapore', flag: '🇸🇬' }, { name: 'Slovakia', flag: '🇸🇰' },
  { name: 'Slovenia', flag: '🇸🇮' }, { name: 'Solomon Islands', flag: '🇸🇧' }, { name: 'Somalia', flag: '🇸🇴' }, { name: 'South Africa', flag: '🇿🇦' },
  { name: 'South Korea', flag: '🇰🇷' }, { name: 'South Sudan', flag: '🇸🇸' }, { name: 'Spain', flag: '🇪🇸' }, { name: 'Sri Lanka', flag: '🇱🇰' },
  { name: 'Sudan', flag: '🇸🇩' }, { name: 'Suriname', flag: '🇸🇷' }, { name: 'Sweden', flag: '🇸🇪' }, { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Syria', flag: '🇸🇾' }, { name: 'Taiwan', flag: '🇹🇼' }, { name: 'Tajikistan', flag: '🇹🇯' }, { name: 'Tanzania', flag: '🇹🇿' },
  { name: 'Thailand', flag: '🇹🇭' }, { name: 'Timor-Leste', flag: '🇹🇱' }, { name: 'Togo', flag: '🇹🇬' }, { name: 'Tonga', flag: '🇹🇴' },
  { name: 'Trinidad and Tobago', flag: '🇹🇹' }, { name: 'Tunisia', flag: '🇹🇳' }, { name: 'Turkey', flag: '🇹🇷' }, { name: 'Turkmenistan', flag: '🇹🇲' },
  { name: 'Tuvalu', flag: '🇹🇻' }, { name: 'Uganda', flag: '🇺🇬' }, { name: 'Ukraine', flag: '🇺🇦' }, { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'United Kingdom', flag: '🇬🇧' }, { name: 'United States', flag: '🇺🇸' }, { name: 'Uruguay', flag: '🇺🇾' }, { name: 'Uzbekistan', flag: '🇺🇿' },
  { name: 'Vanuatu', flag: '🇻🇺' }, { name: 'Vatican City', flag: '🇻🇦' }, { name: 'Venezuela', flag: '🇻🇪' }, { name: 'Vietnam', flag: '🇻🇳' },
  { name: 'Yemen', flag: '🇾🇪' }, { name: 'Zambia', flag: '🇿🇲' }, { name: 'Zimbabwe', flag: '🇿🇼' },
];

const PORTS = [
  'Chattogram Port', 'Mongla Port', 'Payra Port',
  'Port of Colombo', 'Port of Mumbai', 'Port of Karachi', 'Port Qasim', 'Port of Chabahar',
  'Port of Singapore', 'Port Klang', 'Tanjung Pelepas Port', 'Port of Laem Chabang',
  'Port of Jakarta (Tanjung Priok)', 'Port of Manila', 'Port of Shanghai', 'Port of Ningbo-Zhoushan',
  'Port of Shenzhen', 'Port of Guangzhou', 'Port of Qingdao', 'Port of Tianjin', 'Port of Hong Kong',
  'Port of Busan', 'Port of Yokohama', 'Port of Tokyo',
  'Port of Jebel Ali', 'Port of Khalifa', 'Port Rashid', 'Port of Dammam', 'Port of Jeddah',
  'Port of Salalah', 'Port of Sohar', 'Port of Kuwait', 'Port of Hamad',
  'Port of Rotterdam', 'Port of Antwerp-Bruges', 'Port of Hamburg', 'Port of Bremerhaven',
  'Port of Felixstowe', 'Port of London', 'Port of Le Havre', 'Port of Marseille-Fos',
  'Port of Genoa', 'Port of Valencia', 'Port of Barcelona', 'Port of Piraeus',
  'Port of Los Angeles', 'Port of Long Beach', 'Port of Oakland', 'Port of Seattle',
  'Port of Tacoma', 'Port of Vancouver', 'Port of Prince Rupert', 'Port of New York',
  'Port of Savannah', 'Port of Charleston', 'Port of Miami', 'Port of Houston', 'Port of Montreal',
  'Port of Santos', 'Port of Rio de Janeiro', 'Port of Buenos Aires', 'Port of Callao',
  'Port of Cartagena', 'Port of Valparaiso',
  'Port of Durban', 'Port of Cape Town', 'Port of Mombasa', 'Port of Dar es Salaam',
  'Port of Djibouti', 'Port of Alexandria', 'Port Said', 'Port of Lagos', 'Port of Tema',
  'Port of Sydney', 'Port of Melbourne', 'Port of Brisbane', 'Port of Fremantle',
  'Port of Auckland', 'Port of Tauranga',
];

const AUTH_API = `${API_BASE}/auth`;

const inputCls =
  'auth-input mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20';

const labelCls = 'block text-xs font-medium uppercase tracking-wide text-slate-400';

const initialForm = {
  fullName: '',
  username: '',
  email: '',
  country: '',
  portName: '',
  role: '',
  exportCommodities: [],
};

const SignupPage = () => {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updatedForm = {
        ...prev,
        [name]: value,
      };

      if (name === 'role' && value === 'admin') {
        updatedForm.portName = '';
      }

      return updatedForm;
    });

    setError('');
    setMessage('');
  };

  const toggleCommodity = (commodity) => {
    setForm((prev) => ({
      ...prev,
      exportCommodities: prev.exportCommodities.includes(commodity)
        ? prev.exportCommodities.filter((c) => c !== commodity)
        : [...prev.exportCommodities, commodity],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (form.role !== 'admin' && !form.portName.trim()) {
      setError('Port name is required for this role.');
      return;
    }
    if (form.role === 'organization' && form.exportCommodities.length === 0) {
      setError('Select at least one export commodity.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        country: form.country,
        role: form.role,
        ...(form.role !== 'admin' ? { portName: form.portName } : {}),
        exportCommodities: form.exportCommodities,
      };

      const response = await axios.post(`${AUTH_API}/initiate-registration`, payload);
      setMessage(response.data.message || 'Request submitted successfully.');

      setTimeout(() => {
        navigate('/verify-otp', { state: { email: form.email, pendingApproval: response.data.pendingApproval } });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-50">
      <VideoBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center overflow-y-auto px-4 py-10">
        <div className="auth-card w-full max-w-2xl rounded-xl border border-slate-600/70 border-t-2 border-t-cyan-500 bg-slate-900/90 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
          <div className="auth-header mb-6 border-b border-slate-700/80 pb-5 text-center">
            <p className="text-xl font-semibold tracking-wide text-cyan-400">FlowSynq</p>
            <p className="mt-1 text-sm text-slate-400">Account Registration</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="auth-field auth-delay-1 grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>
                Full Name
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Full name"
                  className={inputCls}
                />
              </label>

              <label className={labelCls}>
                Username
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  placeholder="Username"
                  className={inputCls}
                />
              </label>
            </div>

            <div className="auth-field auth-delay-2 grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="Email address"
                  className={inputCls}
                />
              </label>

              <label className={labelCls}>
                Country
                <select
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                  className={inputCls}
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="auth-field auth-delay-3 grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>
                Role
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                  className={inputCls}
                >
                  <option value="">Select role</option>
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="analyst">Analyst</option>
                  <option value="organization">Organization</option>
                </select>
              </label>

              <label className={labelCls}>
                Port
                <select
                  name="portName"
                  value={form.portName}
                  onChange={handleChange}
                  required={form.role !== 'admin'}
                  disabled={form.role === 'admin'}
                  className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <option value="">{form.role === 'admin' ? 'Not required' : 'Select port'}</option>
                  {PORTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>

            {form.role === 'organization' && (
              <div className="auth-expand rounded-lg border border-slate-700/70 bg-slate-950/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Export Commodities</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {COMMODITY_OPTIONS.map((commodity) => (
                    <label
                      key={commodity}
                      className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={form.exportCommodities.includes(commodity)}
                        onChange={() => toggleCommodity(commodity)}
                      />
                      {commodity}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="auth-btn auth-field auth-delay-4 w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {loading ? 'Sending OTP…' : 'Continue'}
            </button>

            {message && (
              <p className="auth-alert rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200">
                {message}
              </p>
            )}

            {error && (
              <p className="auth-alert rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
                {error}
              </p>
            )}

            <p className="auth-field auth-delay-5 text-center text-sm text-slate-400">
              Already registered?{' '}
              <Link className="auth-link font-medium text-cyan-300 hover:text-cyan-200" to="/">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
