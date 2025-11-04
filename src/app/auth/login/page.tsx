"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const params = useSearchParams();

  useEffect(() => {
    if (params?.get('registered')) {
      setInfo('Account created. Check your email to confirm, then sign in.');
    }
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-zinc-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-semibold mb-1 text-white">Welcome back</h1>
        <p className="text-slate-300 mb-6">Sign in to your ReadNest account</p>
        {info && (
          <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg">
            <p className="text-emerald-400 text-sm">{info}</p>
          </div>
        )}
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
          {info && <p className="text-emerald-400 text-sm">{info}</p>}
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-md transition-colors"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-300">
          No account? <a className="text-emerald-400 hover:text-emerald-300 underline" href="/auth/register">Create one</a>
        </p>
      </div>
    </div>
  );
}


