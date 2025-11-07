'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

interface Article {
  id: string;
  title: string;
  source: string;
  snippet: string;
  date: string;
  type: 'rss' | 'pdf';
  url?: string;
  feed_id?: string;
  content?: string;
  author?: string;
  tags?: string[];
}

interface FeedSubscription {
  id: string;
  url: string;
  title: string;
  description: string;
  last_updated: string;
  is_active: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface FeedProps {
  onContentSelect?: (content: {
    type: 'rss' | 'pdf';
    title: string;
    url?: string;
    id?: string;
  }) => void;
}

export default function Feed({ onContentSelect }: FeedProps) {
  const router = useRouter();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [isFeedMinimized, setIsFeedMinimized] = useState(false);
  const [rssUrl, setRssUrl] = useState('');
  const [feedName, setFeedName] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [subscriptions, setSubscriptions] = useState<FeedSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  // Handle authentication errors
  const handleAuthError = () => {
    auth.logout();
    router.push('/auth/login');
  };

  // Fetch articles from backend
  const authHeaders = () => {
    const token = auth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching articles from:', `${API_BASE}/api/feeds`);
      const res = await fetch(`${API_BASE}/api/feeds`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...authHeaders() }
      });
      console.log('Response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Articles fetched:', data.length);
        setArticles(data);
      } else {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch articles: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to fetch articles:', err.message);
      setError('Failed to load articles. Please check if the backend is running.');
      // Fallback to empty array instead of mock data
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch feed subscriptions
  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/feeds/subscriptions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...authHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      } else if (res.status === 401) {
        handleAuthError();
        return;
      }
    } catch (err: any) {
      console.error('Failed to fetch subscriptions:', err.message);
    }
  };

  // Refresh all feeds
  const refreshFeeds = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/feeds/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() }
      });
      if (res.ok) {
        const data = await res.json();
        setSuccess(`Feeds refreshed! Found ${data.total_articles} articles.`);
        await fetchArticles();
        await fetchSubscriptions();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to refresh feeds: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to refresh feeds:', err.message);
      setError('Failed to refresh feeds. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchSubscriptions();
    // Set up automatic refresh every 5 minutes
    const interval = setInterval(() => {
      refreshFeeds();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  // Simple URL validation for RSS
  const isValidUrl = (u: string) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAddFeed = async () => {
    if (!rssUrl.trim() || !isValidUrl(rssUrl.trim())) {
      setError('Please enter a valid URL (https://...)');
      return;
    }
    if (!feedName.trim()) {
      setError('Please enter a name for the feed');
      return;
    }
    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Adding feed to:', `${API_BASE}/api/feeds`);
      console.log('Feed URL:', rssUrl.trim());
      console.log('Feed Name:', feedName.trim());
      const res = await fetch(`${API_BASE}/api/feeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ 
          url: rssUrl.trim(),
          name: feedName.trim()
        })
      });
      
      console.log('Add feed response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Feed added successfully:', data);
        setSuccess(`Feed "${feedName.trim()}" added successfully! Found ${data.articles_count} articles.`);
        setRssUrl('');
        setFeedName('');
        setShowAddFeed(false);
        // Refresh articles and subscriptions
        await fetchArticles();
        await fetchSubscriptions();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        const errorText = await res.text();
        console.error('Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText };
        }
        throw new Error(errorData.detail || `Failed to add feed: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to add feed:', err.message);
      setError(err.message || 'Failed to add feed. Please check the URL and try again.');
    } finally {
      setAdding(false);
    }
  };

  // Delete feed subscription
  const handleDeleteFeed = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this feed subscription? This will remove all articles from this feed.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/feeds/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() }
      });
      
      if (res.ok) {
        setSuccess('Feed subscription deleted successfully.');
        await fetchArticles();
        await fetchSubscriptions();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to delete feed: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to delete feed:', err.message);
      setError(err.message || 'Failed to delete feed.');
    }
  };

  // Toggle feed status (activate/deactivate)
  const handleToggleFeedStatus = async (subscriptionId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/feeds/subscriptions/${subscriptionId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      if (res.ok) {
        const newStatus = !currentStatus;
        setSuccess(`Feed ${newStatus ? 'activated' : 'deactivated'} successfully`);
        await fetchSubscriptions();
        await fetchArticles();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        setError('Failed to update feed status');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Failed to toggle feed status:', error);
      setError('Failed to update feed status');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
    setSummary(null); // Clear summary when selecting new article
    // Notify parent component about content selection for journaling
    if (onContentSelect) {
      onContentSelect({
        type: 'rss',
        title: article.title,
        url: article.url,
        id: article.id
      });
    }
  };

  const handleSummarize = async () => {
    if (!selectedArticle) return;
    
    setSummarizing(true);
    setSummary(null);
    setError(null);

    try {
      const articleText = selectedArticle.content || selectedArticle.snippet || '';
      if (!articleText.trim()) {
        throw new Error('No content available to summarize');
      }

      const prompt = `Please provide a concise summary of the following article in 2-3 paragraphs. Focus on the main points and key information:\n\nTitle: ${selectedArticle.title}\n\nContent:\n${articleText.slice(0, 4000)}`;

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          message: prompt,
          conversation_history: []
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(`Failed to summarize article: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.response || 'Unable to generate summary');
    } catch (err: any) {
      console.error('Failed to summarize:', err);
      setError(err.message || 'Failed to summarize article');
    } finally {
      setSummarizing(false);
    }
  };


  return (
    <div className="h-full flex">
      {/* Article List */}
      <div className={`${selectedArticle ? (isFeedMinimized ? 'w-12' : 'w-1/3') : 'w-full'} border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}>
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {!isFeedMinimized && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">RSS Feeds</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {articles.length} articles from {subscriptions.length} feeds
                </p>
              </div>
            )}
            {isFeedMinimized && (
              <div className="flex flex-col items-center justify-center h-full">
                {/* Empty space - no text when minimized */}
              </div>
            )}
            <div className="flex items-center gap-2">
              {selectedArticle && (
                <button
                  onClick={() => setIsFeedMinimized(!isFeedMinimized)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title={isFeedMinimized ? "Expand RSS feeds" : "Minimize RSS feeds"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isFeedMinimized ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    )}
                  </svg>
                </button>
              )}
              {!isFeedMinimized && (
                <>
                  <button
                    onClick={refreshFeeds}
                    disabled={refreshing}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => setShowAddFeed(!showAddFeed)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    + Add RSS Feed
                  </button>
                </>
              )}
              {!isFeedMinimized && (
                <>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title="List view"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title="Grid view"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* Feed Subscriptions */}
          {!isFeedMinimized && subscriptions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Feed Subscriptions:</h3>
              <div className="flex flex-wrap gap-2">
                {subscriptions.map((sub) => (
                  <div 
                    key={sub.id} 
                    className={`flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-colors ${
                      sub.is_active 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => handleToggleFeedStatus(sub.id, sub.is_active)}
                    title={`Click to ${sub.is_active ? 'deactivate' : 'activate'} this feed`}
                  >
                    <div className={`w-2 h-2 rounded-full ${sub.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-xs">{sub.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFeed(sub.id);
                      }}
                      className="text-xs text-red-500 hover:text-red-700 ml-1"
                      title="Delete feed"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {!isFeedMinimized && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Click on feeds to activate/deactivate them. Green = active, Gray = inactive.
                </p>
              )}
            </div>
          )}

          {showAddFeed && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Feed Name
                  </label>
                  <input
                    type="text"
                    value={feedName}
                    onChange={(e) => setFeedName(e.target.value)}
                    placeholder="Enter a name for this feed (e.g., TechCrunch, My Blog)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    RSS Feed URL
                  </label>
                  <input
                    type="url"
                    value={rssUrl}
                    onChange={(e) => setRssUrl(e.target.value)}
                    placeholder="Enter RSS feed URL (e.g., https://example.com/feed.xml)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddFeed}
                    disabled={!rssUrl.trim() || !feedName.trim() || adding}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {adding ? 'Adding…' : 'Add Feed'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddFeed(false);
                      setRssUrl('');
                      setFeedName('');
                      setError(null);
                    }}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Popular RSS feeds: TechCrunch, Ars Technica, The Verge, etc.</p>
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {isFeedMinimized ? (
            <div className="flex flex-col items-center justify-center h-full">
              {/* Empty space - no text when minimized */}
            </div>
          ) : loading ? (
            <div className="p-6 text-center text-gray-500">Loading feeds…</div>
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {articles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => handleArticleClick(article)}
                  className={`p-3 cursor-pointer transition-colors ${selectedArticle?.id === article.id ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${article.type === 'rss' ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate flex-1">{article.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{article.source}</p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{article.date}</p>
                        {article.author && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">by {article.author}</p>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 line-clamp-2">{article.snippet}</p>
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {article.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {articles.length === 0 && <div className="p-6 text-center text-gray-500">No feeds yet — add one!</div>}
            </div>
          ) : (
            <div className="p-4 grid grid-cols-2 gap-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => handleArticleClick(article)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedArticle?.id === article.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                >
                  <div className={`w-2 h-2 rounded-full mb-2 ${article.type === 'rss' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">{article.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{article.source} • {article.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedArticle && (
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedArticle.title}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{selectedArticle.source} • {selectedArticle.date} • {selectedArticle.type.toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSummarize}
                  disabled={summarizing || !selectedArticle}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {summarizing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Summarizing...
                    </>
                  ) : (
                    'Summarize'
                  )}
                </button>
                <button onClick={() => {
                  setSelectedArticle(null);
                  setSummary(null);
                }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-auto">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {summary && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Summary</h3>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {summary}
                    </p>
                  </div>
                </div>
              )}
              
              {selectedArticle.content ? (
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedArticle.content}
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedArticle.snippet}</p>
                  {selectedArticle.url && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">Read the full article:</p>
                      <a 
                        href={selectedArticle.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                      >
                        {selectedArticle.url}
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.tags.map((tag, index) => (
                      <span key={index} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
