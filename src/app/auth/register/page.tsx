"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.register(email, password);
      // With email confirmation enabled, Supabase sends a confirmation email.
      // Show friendly success state instead of treating as error.
      setSuccess('Account created! Check your email to confirm your address, then sign in.');
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-zinc-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-semibold mb-1 text-white">Create account</h1>
        <p className="text-slate-300 mb-6">Join ReadNest to get started</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-slate-300">Email</label>
            <input
              type="email"
              className="w-full bg-slate-900/60 border border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 rounded px-3 py-2 text-slate-100 placeholder-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block mb-1 text-slate-300">Password</label>
            <input
              type="password"
              className="w-full bg-slate-900/60 border border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 rounded px-3 py-2 text-slate-100 placeholder-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && (
          <div className="p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg">
            <p className="text-emerald-400 text-sm mb-2">{success}</p>
            <a href="/auth/login" className="text-emerald-300 hover:text-emerald-200 underline text-sm">
              Go to sign in →
            </a>
          </div>
        )}
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-md transition-colors"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-300">
          Already have an account? <a className="text-emerald-400 hover:text-emerald-300 underline" href="/auth/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}


