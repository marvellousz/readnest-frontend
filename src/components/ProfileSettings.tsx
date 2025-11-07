'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface UserStats {
  journals: number;
  articles: number;
  documents: number;
  feeds: number;
  totalWords: number;
}

export default function ProfileSettings() {
  const router = useRouter();
  const user = auth.getUser();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [stats, setStats] = useState<UserStats>({
    journals: 0,
    articles: 0,
    documents: 0,
    feeds: 0,
    totalWords: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading account information...
        </div>
      </div>
    );
  }

  const memberSince = new Date();

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Account</h1>
        
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

      {/* Profile Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
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
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
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
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Statistics</h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading statistics...</div>
            ) : (
              <>
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
              </>
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
      )}

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Reading Preferences */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Reading Preferences</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Auto-refresh Feeds
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically refresh RSS feeds
                  </p>
                </div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoRefresh ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {autoRefresh && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Refresh Interval (minutes)
                  </label>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="w-full md:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Items Per Page
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value={10}>10 items</option>
                  <option value={20}>20 items</option>
                  <option value={50}>50 items</option>
                  <option value={100}>100 items</option>
                </select>
              </div>
            </div>
          </div>

          {/* Display Preferences */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Display Preferences</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['system', 'light', 'dark'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setTheme(option)}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        theme === option
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="font-medium capitalize mb-1">{option}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {option === 'system' && 'Follow system'}
                        {option === 'light' && 'Light mode'}
                        {option === 'dark' && 'Dark mode'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Notifications</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    In-App Notifications
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show notifications for new articles and updates
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Email Notifications
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive email updates about your account activity
                  </p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailNotifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Security</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Current Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Password management is handled through Supabase authentication. To change your password, 
                  use the "Forgot Password" link on the login page.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div>
                  <div className="font-medium text-yellow-900 dark:text-yellow-300 mb-1">Two-Factor Authentication</div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-400">Not enabled</div>
                </div>
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Data Management</h2>
            
            <div className="space-y-4">
              <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white mb-1">Export Your Data</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Download all your journals, articles, and documents as JSON</div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Export
                  </button>
                </div>
              </div>

              <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white mb-1">Clear Cache</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Clear all cached data and reload</div>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to clear cache?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Actions</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to log out?')) {
                    auth.logout();
                    router.push('/auth/login');
                  }
                }}
                className="w-full md:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="font-medium text-red-900 dark:text-red-300 mb-2">Danger Zone</div>
                  <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                    These actions cannot be undone. Please be certain.
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Are you absolutely sure? This will permanently delete your account and all data. This action cannot be undone.')) {
                        alert('Account deletion is not yet implemented. Please contact support.');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

