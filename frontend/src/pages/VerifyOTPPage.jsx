import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import VideoBackground from '../components/VideoBackground';

import { API_BASE } from '../config';

const AUTH_API = `${API_BASE}/auth`;

const VerifyOTPPage = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/signup');
            return;
        }

        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [email, navigate]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length < 6) {
            setError('Please enter all 6 digits.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(`${AUTH_API}/verify-otp`, { email, otp: otpCode });
            setMessage(response.data.message || 'OTP Verified!');

            setTimeout(() => {
                navigate('/set-password', { state: { email } });
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post(`${AUTH_API}/resend-otp`, { email });
            setMessage(response.data.message || 'A new OTP has been sent.');
            setTimer(60); // Reset timer
            setOtp(['', '', '', '', '', '']); // Clear OTP inputs
        } catch (err) {
            const serverMsg = err.response?.data?.message;
            const serverErr = err.response?.data?.error;
            setError(serverMsg ? `${serverMsg} ${serverErr ? `(${serverErr})` : ''}` : 'Failed to resend OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden text-slate-50">
            <VideoBackground />

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
                <div className="w-full max-w-md rounded-[2rem] border border-slate-700/60 bg-slate-950/95 p-8 shadow-2xl shadow-slate-950/60 backdrop-blur-xl">
                    <div className="space-y-6 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-3xl font-semibold">Verify Email</h1>
                            <p className="text-slate-400">
                                We've sent a 6-digit code to <br />
                                <span className="font-medium text-slate-200">{email}</span>
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="flex justify-between gap-2">
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        id={`otp-${idx}`}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(idx, e)}
                                        className="h-12 w-12 rounded-xl border border-slate-700 bg-slate-900 text-center text-xl font-bold text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                                    />
                                ))}
                            </div>

                            <div className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                                >
                                    {loading ? 'Verifying…' : 'Verify Code'}
                                </button>

                                <div className="text-sm text-slate-400">
                                    {timer > 0 ? (
                                        <p>Resend code in <span className="font-medium text-cyan-400">{timer}s</span></p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
                                        >
                                            Resend OTP
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>

                        {message && (
                            <p className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                                {message}
                            </p>
                        )}

                        {error && (
                            <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTPPage;
