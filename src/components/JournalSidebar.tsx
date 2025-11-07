'use client';

import { useState, useEffect, useRef } from 'react';
import { auth } from '@/lib/auth';


interface JournalEntry {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  keywords: string[];
  related_content?: {
    type: 'rss' | 'pdf' | 'research';
    title: string;
    url?: string;
    id?: string;
  };
}

interface JournalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent?: {
    type: 'rss' | 'pdf' | 'research';
    title: string;
    url?: string;
    id?: string;
  } | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const STORAGE_KEY = 'readnest_journal_entries';

export default function JournalSidebar({ isOpen, onClose, currentContent }: JournalSidebarProps) {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
  const [journalContent, setJournalContent] = useState('');
  const [journalTitle, setJournalTitle] = useState('');
  const [journalStatus, setJournalStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const saveTimerRef = useRef<number | null>(null);

  // Load journal entries from API
  const loadJournalEntries = async () => {
    try {
      const token = auth.getToken();
      if (!token) return;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(`${API_BASE}/api/journals`, { headers });
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        throw new Error(`Failed to fetch entries: ${response.status}`);
      }

      const entries = await response.json();
      const normalizedEntries = Array.isArray(entries) ? entries.map((entry: any) => ({
        ...entry,
        keywords: Array.isArray(entry.keywords) ? entry.keywords : Object.keys(entry.keywords || {}),
      })) : [];
      
      setJournalEntries(normalizedEntries);
      if (normalizedEntries.length > 0 && !activeJournalId) {
        setActiveJournalId(normalizedEntries[0].id);
        setJournalContent(normalizedEntries[0].content || '');
        setJournalTitle(normalizedEntries[0].title);
      }
    } catch (error) {
      console.error('Failed to load journal entries:', error);
    }
  };

  // Load entries on mount and when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadJournalEntries();
    }
  }, [isOpen]);

  // Extract keywords from text
  const extractKeywords = (text: string): string[] => {
    if (!text) return [];
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'].includes(word));
    
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  };

  // Create new journal entry
  const createJournalEntry = async (linkToCurrentContent = false) => {
    try {
      const token = auth.getToken();
      if (!token) return;

      let title: string;
      let content: string;
      let relatedContent = undefined;
      
      if (linkToCurrentContent && currentContent) {
        // Create a linked entry
        title = `Notes on: ${currentContent.title}`;
        content = `# ${currentContent.title}\n\n**Source:** ${currentContent.type.toUpperCase()}\n**Date:** ${new Date().toLocaleDateString()}\n${currentContent.url ? `**URL:** ${currentContent.url}\n` : ''}\n---\n\n`;
        relatedContent = currentContent;
      } else {
        // Create a standalone entry
        title = `Journal Entry ${new Date().toLocaleDateString()}`;
        content = '';
        relatedContent = undefined;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(`${API_BASE}/api/journals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create entry: ${response.status}`);
      }

      const newEntry = await response.json();
      // Normalize keywords
      const normalizedEntry = {
        ...newEntry,
        keywords: Array.isArray(newEntry.keywords) ? newEntry.keywords : Object.keys(newEntry.keywords || {}),
        related_content: relatedContent,
      };

      // Reload entries to get the latest from server
      await loadJournalEntries();
      setActiveJournalId(normalizedEntry.id);
      setJournalContent(normalizedEntry.content);
      setJournalTitle(normalizedEntry.title);
      setJournalStatus('New entry created');
      setTimeout(() => setJournalStatus(''), 2000);
    } catch (error) {
      console.error('Failed to create entry:', error);
      setJournalStatus('Failed to create entry');
      setTimeout(() => setJournalStatus(''), 2000);
    }
  };

  // Save current journal entry
  const saveJournalEntry = async () => {
    if (!activeJournalId) return;
    
    try {
      const token = auth.getToken();
      if (!token) return;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(`${API_BASE}/api/journals/${activeJournalId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: journalTitle,
          content: journalContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save entry: ${response.status}`);
      }

      // Reload entries to get updated data from server
      await loadJournalEntries();
      setJournalStatus('Saved');
      setTimeout(() => setJournalStatus(''), 2000);
    } catch (error) {
      console.error('Failed to save entry:', error);
      setJournalStatus('Failed to save');
      setTimeout(() => setJournalStatus(''), 2000);
    }
  };

  // Delete journal entry
  const deleteJournalEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) {
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

      // Reload entries from server
      await loadJournalEntries();
      
      if (activeJournalId === entryId) {
        setActiveJournalId(null);
        setJournalContent('');
        setJournalTitle('');
      }
      
      setJournalStatus('Entry deleted');
      setTimeout(() => setJournalStatus(''), 2000);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      setJournalStatus('Failed to delete');
      setTimeout(() => setJournalStatus(''), 2000);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (!activeJournalId) return;
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = window.setTimeout(() => {
      saveJournalEntry();
    }, 2000);
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [journalContent, journalTitle, activeJournalId]);

  // Filter entries based on search
  const filteredEntries = journalEntries.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) {
    return null;
    //(
    //   <div className="w-12 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
    //     <div className="p-2">
    //       <button
    //         onClick={onClose}
    //         className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    //         title="Open journal"
    //       >
    //         <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    //         </svg>
    //       </button>
    //     </div>
    //   </div>
    // );
  }

  return (
    <div className="fixed top-16 right-0 w-80 h-[calc(100vh-4rem)] border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col z-40 shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Journal</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => createJournalEntry(false)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              title="New standalone entry"
            >
              + New
            </button>
            {currentContent && (
              <button
                onClick={() => createJournalEntry(true)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                title={`Link to ${currentContent.title}`}
              >
                + Link
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="Close journal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {journalStatus && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{journalStatus}</p>
        )}


        {/* Help Text */}
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>+ New:</strong> Create a standalone journal entry<br/>
            <strong>+ Link:</strong> Create a note linked to current content
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            title="List view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            title="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-auto border-b border-gray-200 dark:border-gray-700">
        {filteredEntries.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            {searchQuery ? 'No entries match your search' : 'No journal entries yet'}
            <br />
            <span className="text-xs">Create your first entry to get started</span>
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                  activeJournalId === entry.id ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                }`}
                onClick={() => {
                  setActiveJournalId(entry.id);
                  setJournalContent(entry.content);
                  setJournalTitle(entry.title);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {entry.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(entry.updated_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {(entry.content || '').slice(0, 100)}...
                    </p>
                    {entry.related_content && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs px-1 py-0.5 rounded ${
                          entry.related_content.type === 'rss' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : entry.related_content.type === 'research'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        }`}>
                          {entry.related_content.type.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {entry.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.keywords.slice(0, 3).map((keyword, index) => (
                          <span key={index} className="text-xs px-1 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteJournalEntry(entry.id);
                    }}
                    className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-2"
                    title="Delete entry"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2 grid grid-cols-2 gap-2">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                  activeJournalId === entry.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => {
                  setActiveJournalId(entry.id);
                  setJournalContent(entry.content);
                  setJournalTitle(entry.title);
                }}
              >
                <h4 className="font-medium text-xs text-gray-900 dark:text-white truncate">
                  {entry.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(entry.updated_at).toLocaleDateString()}
                </p>
                {entry.related_content && (
                  <span className={`text-xs px-1 py-0.5 rounded mt-1 inline-block ${
                    entry.related_content.type === 'rss' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : entry.related_content.type === 'research'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}>
                    {entry.related_content.type.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {activeJournalId ? (
          <>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <input
                  value={journalTitle}
                  onChange={(e) => setJournalTitle(e.target.value)}
                  className="flex-1 text-sm font-medium bg-transparent border-0 focus:outline-none text-gray-900 dark:text-white"
                  placeholder="Journal title"
                />
                <button
                  onClick={() => deleteJournalEntry(activeJournalId)}
                  className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Delete this entry"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 p-3">
              <textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="Write your notes here..."
                className="w-full h-full resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-sm">Select a journal entry or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
