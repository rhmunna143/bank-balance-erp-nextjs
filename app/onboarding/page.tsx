"use client";

import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from 'react';
import { createJoinRequest, getUserRequests } from '@/services/userService';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [bankSlug, setBankSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await getUserRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await createJoinRequest(bankSlug);
      setSuccess('Request sent successfully. Waiting for admin approval.');
      setBankSlug('');
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-8">
        <UserButton afterSignOutUrl="/" />
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to AgentBank ERP
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You are currently not associated with any bank.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-8">
          
          {/* Join Bank Form */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">Join an Existing Bank</h3>
            <p className="mt-1 text-sm text-gray-500 mb-4">
              Enter the unique Bank ID (Slug) provided by your administrator to request access.
            </p>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={bankSlug}
                  onChange={(e) => setBankSlug(e.target.value)}
                  placeholder="e.g. my-agent-bank"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <button
                type="submit"
                disabled={loading || !bankSlug}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Sending Request...' : 'Request Access'}
              </button>
            </form>

            {requests.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Your Pending Requests</h4>
                <ul className="divide-y divide-gray-200 border rounded-md">
                  {requests.map(req => (
                    <li key={req.id} className="p-3 flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-900">{req.bank.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        req.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.status}
                      </span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="mt-4 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Check Approval Status
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Create Bank */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">Are you a Bank Owner?</h3>
            <p className="mt-1 text-sm text-gray-500 mb-4">
              If you want to start a new bank on our platform, click below to set up your organization.
            </p>
            <Link
              href="/create-bank"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create a New Bank
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
