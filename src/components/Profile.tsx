'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface UserStats {
  journals: number;
  articles: number;
  documents: number;
  feeds: number;
  totalWords: number;
}

export default function Profile() {
  const user = auth.getUser();
  const [stats, setStats] = useState<UserStats>({
    journals: 0,
    articles: 0,
    documents: 0,
    feeds: 0,
    totalWords: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      try {
        const token = auth.getToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // Fetch all data to calculate stats
        const [journalsRes, articlesRes, documentsRes, feedsRes] = await Promise.all([
          fetch(`${API_BASE}/api/journals`, { headers }),
          fetch(`${API_BASE}/api/feeds`, { headers }),
          fetch(`${API_BASE}/api/documents`, { headers }),
          fetch(`${API_BASE}/api/feeds/subscriptions`, { headers }),
        ]);

        const journals = journalsRes.ok ? await journalsRes.json() : [];
        const articles = articlesRes.ok ? await articlesRes.json() : [];
        const documents = documentsRes.ok ? await documentsRes.json() : [];
        const feeds = feedsRes.ok ? await feedsRes.json() : [];

        const totalWords = journals.reduce((sum: number, j: any) => sum + (j.word_count || 0), 0);

        setStats({
          journals: journals.length,
          articles: articles.length,
          documents: documents.length,
          feeds: feeds.length,
          totalWords,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (!user) {
    return null;
  }

  const memberSince = new Date(); // In a real app, get this from user registration date

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>
      
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-4xl font-bold text-white">
              {auth.getUserInitial(user.email)}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{user.email}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">User ID: {user.id.slice(0, 8)}...</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                ✓ Verified Account
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Member since {memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Email cannot be changed at this time
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={user.id}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Statistics</h3>
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading statistics...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {stats.journals}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Journal Entries</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {stats.articles}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Articles</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {stats.feeds}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">RSS Feeds</div>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {stats.documents}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Documents</div>
            </div>
          </div>
        )}
        
        {!loading && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Words Written</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {stats.totalWords.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Status</p>
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">Active</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Type</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">Free Plan</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
            <div className="font-medium text-gray-900 dark:text-white mb-1">Export Your Data</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Download all your journals, articles, and documents</div>
          </button>
          <button className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
            <div className="font-medium text-gray-900 dark:text-white mb-1">View Activity Log</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">See your recent activity and changes</div>
          </button>
        </div>
      </div>
    </div>
  );
}

