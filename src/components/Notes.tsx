import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/auth';

// Define the JournalEntry interface inline to avoid import issues
type JournalEntry = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  keywords?: { [key: string]: number } | string[];
  related_content?: {
    type: 'rss' | 'pdf';
    title: string;
    url?: string;
    id?: string;
  };
};

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://readnest-backend.vercel.app' 
  : 'http://localhost:8000';

// Helper function to normalize keywords
const normalizeKeywords = (keywords: { [key: string]: number } | string[] | undefined): string[] => {
  if (!keywords) return [];
  if (Array.isArray(keywords)) return keywords;
  // If it's an object, convert to array of keys
  return Object.keys(keywords);
};

export default function Notes() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Ensure entries is always an array
  const safeEntries = Array.isArray(entries) ? entries : [];

  // Fetch all journal entries
  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = auth.getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${API_BASE}/api/journals`, { headers });
      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if unauthorized
          auth.logout();
          window.location.href = '/auth/login';
          return;
        }
        throw new Error(`Failed to fetch entries: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched journal data:', data);
      // The API returns List[JournalEntry] directly, not wrapped in an object
      const entriesData = Array.isArray(data) ? data : [];
      // Normalize keywords for each entry
      const normalizedEntries = entriesData.map((entry: any) => ({
        ...entry,
        keywords: normalizeKeywords(entry.keywords),
      }));
      console.log('Processed entries:', normalizedEntries);
      setEntries(normalizedEntries);
    } catch (err: any) {
      console.error('Error fetching entries:', err);
      setError('Failed to load journal entries. Please try again.');
      // Set empty array on error to prevent crashes
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // Update edit state when selected entry changes
  useEffect(() => {
    if (selectedEntry) {
      setEditTitle(selectedEntry.title);
      setEditContent(selectedEntry.content);
      setIsEditing(false);
    }
  }, [selectedEntry]);

  // Save entry function
  const saveEntry = async () => {
    if (!selectedEntry || !editTitle.trim()) return;
    
    setSaving(true);
    try {
      const token = auth.getToken();
      if (!token) return;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(`${API_BASE}/api/journals/${selectedEntry.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save entry: ${response.status}`);
      }

      const updatedEntry = await response.json();
      const normalizedEntry = {
        ...updatedEntry,
        keywords: normalizeKeywords(updatedEntry.keywords),
      };

      // Update entries list
      setEntries(prevEntries => prevEntries.map(e => e.id === selectedEntry.id ? normalizedEntry : e));
      setSelectedEntry(normalizedEntry);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to save entry:', err);
      setError('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  // Delete entry function
  const deleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const token = auth.getToken();
      if (!token) return;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(`${API_BASE}/api/journals/${entryId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete entry: ${response.status}`);
      }

      // Remove from entries list
      setEntries(entries.filter(e => e.id !== entryId));
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error('Failed to delete entry:', err);
      setError('Failed to delete entry');
    }
  };

  // Filter entries based on search term
  const filteredEntries = safeEntries.filter(entry => {
    const keywordsArray = normalizeKeywords(entry.keywords);
    return (
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      keywordsArray.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchEntries}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-white dark:bg-gray-900 overflow-hidden">
      {/* Notes List */}
      <div className={`${selectedEntry ? 'w-1/2' : 'w-full'} border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notes</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredEntries.length} of {safeEntries.length} entries
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchEntries}
                disabled={loading}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
                title="Refresh notes"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Notes List/Grid */}
        <div className="flex-1 overflow-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No notes found matching your search.' : 'No notes yet. Create your first note in the journal sidebar!'}
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedEntry?.id === entry.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {entry.title}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(entry.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                    {truncateContent(entry.content)}
                  </p>
                  {entry.related_content && (
                    <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Linked to {entry.related_content.type.toUpperCase()}: {entry.related_content.title}
                    </div>
                  )}
                  {normalizeKeywords(entry.keywords).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {normalizeKeywords(entry.keywords).map((keyword, index) => (
                        <span key={index} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 grid grid-cols-2 gap-4">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedEntry?.id === entry.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                    {entry.title}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-xs mb-2 line-clamp-3">
                    {truncateContent(entry.content, 100)}
                  </p>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(entry.created_at)}
                  </div>
                  {normalizeKeywords(entry.keywords).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {normalizeKeywords(entry.keywords).slice(0, 2).map((keyword, index) => (
                        <span key={index} className="text-xs px-1 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                          {keyword}
                        </span>
                      ))}
                      {normalizeKeywords(entry.keywords).length > 2 && (
                        <span className="text-xs text-gray-500">+{normalizeKeywords(entry.keywords).length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Entry Details */}
      {selectedEntry && (
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-2 gap-3">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-xl font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Entry title"
                />
              ) : (
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
                  {selectedEntry.title}
                </h2>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isEditing ? (
                  <>
                    <button
                      onClick={saveEntry}
                      disabled={saving || !editTitle.trim()}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditTitle(selectedEntry.title);
                        setEditContent(selectedEntry.content);
                      }}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      title="Edit entry"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteEntry(selectedEntry.id)}
                      className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete entry"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedEntry(null);
                    setIsEditing(false);
                  }}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(selectedEntry.created_at)}
              {selectedEntry.updated_at !== selectedEntry.created_at && (
                <span className="ml-2">• Updated {formatDate(selectedEntry.updated_at)}</span>
              )}
            </p>
          </div>
          
          <div className="flex-1 p-6 overflow-auto">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Write your notes here..."
                className="w-full h-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            ) : (
              <>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {selectedEntry.content || <span className="text-gray-400 italic">No content</span>}
                  </div>
                </div>
            
                {selectedEntry.related_content && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Linked Content</h4>
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      <strong>{selectedEntry.related_content.type.toUpperCase()}:</strong> {selectedEntry.related_content.title}
                    </p>
                    {selectedEntry.related_content.url && (
                      <a
                        href={selectedEntry.related_content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open Original
                      </a>
                    )}
                  </div>
                )}
                
                {normalizeKeywords(selectedEntry.keywords).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {normalizeKeywords(selectedEntry.keywords).map((keyword, index) => (
                        <span key={index} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
