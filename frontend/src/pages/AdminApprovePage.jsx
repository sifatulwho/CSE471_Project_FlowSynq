import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const API_BASE = 'http://localhost:5001/api/auth';

const AdminApprovePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const action = searchParams.get('action');
  const [message, setMessage] = useState('Processing request...');

  useEffect(() => {
    const processRequest = async () => {
      if (!token) {
        setMessage('Invalid or missing token.');
        return;
      }

      try {
        const response = await axios.post(`${API_BASE}/approve-request`, {
          token,
          action: action || 'approve'
        });
        setMessage(response.data.message || 'Request processed successfully.');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to process request.');
      }
    };

    processRequest();
  }, [token, action]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl text-center">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Admin Approval</h2>
        <p className="text-lg text-slate-300">{message}</p>
      </div>
    </div>
  );
};

export default AdminApprovePage;
