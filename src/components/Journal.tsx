// src/components/Journal.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  journalAPI,
  JournalEntry
} from '@/lib/journalAPI';

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [titleEditing, setTitleEditing] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const saveTimerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<string>('');

  // load
  useEffect(() => {
    (async () => {
      try {
        const all = await journalAPI.getAllJournals();
        setEntries(all);
        if (all.length) {
          setActiveId(all[0].id);
          setEditorContent(all[0].content || '');
          setTitleEditing(all[0].title);
        }
      } catch (error) {
        console.error('Failed to load journals:', error);
        setStatus('Failed to load journals');
      }
    })();
  }, []);

  // set active entry when activeId changes
  useEffect(() => {
    const e = entries.find((x) => x.id === activeId) || null;
    setEditorContent(e ? e.content : '');
    setTitleEditing(e ? e.title : '');
  }, [activeId, entries]);

  // helper to refresh list
  async function refreshList(selectId?: string | null) {
    try {
      const all = await journalAPI.getAllJournals();
      setEntries(all);
      if (selectId) {
        setActiveId(selectId);
      } else if (!all.length) {
        setActiveId(null);
        setEditorContent('');
        setTitleEditing('');
      }
    } catch (error) {
      console.error('Failed to refresh journals:', error);
      setStatus('Failed to refresh journals');
    }
  }

  // add new
  async function handleAdd() {
    setIsAdding(true);
    try {
      const title = window.prompt('Title for your new journal', `Journal ${entries.length + 1}`) || `Journal ${entries.length + 1}`;
      const created = await journalAPI.createJournal({ title, content: '' });
      await refreshList(created.id);
      setIsAdding(false);
      // focus
      setTimeout(() => {
        setActiveId(created.id);
      }, 10);
    } catch (error) {
      console.error('Failed to create journal:', error);
      setStatus('Failed to create journal');
      setIsAdding(false);
    }
  }

  // delete
  async function handleDelete(id?: string) {
    const toDelete = id || activeId;
    if (!toDelete) return;
    if (!confirm('Delete this journal? This cannot be undone.')) return;
    try {
      await journalAPI.deleteJournal(toDelete);
      await refreshList();
    } catch (error) {
      console.error('Failed to delete journal:', error);
      setStatus('Failed to delete journal');
    }
  }

  // save (manual)
  async function handleSaveNow() {
    if (!activeId) return;
    setStatus('Saving…');
    try {
      const updated = await journalAPI.updateJournal(activeId, {
        content: editorContent,
        title: titleEditing
      });
      // update local state
      setEntries((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
      setStatus('Saved');
      setTimeout(() => setStatus(''), 1200);
    } catch (error) {
      console.error('Failed to save journal:', error);
      setStatus('Failed to save journal');
    }
  }

  // debounce autosave
  useEffect(() => {
    if (!activeId) return;
    // clear previous
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      (async () => {
        if (!activeId) return;
        try {
          await journalAPI.updateJournal(activeId, {
            content: editorContent,
            title: titleEditing
          });
          const all = await journalAPI.getAllJournals();
          setEntries(all);
          setStatus('Auto-saved');
          setTimeout(() => setStatus(''), 1000);
        } catch (error) {
          console.error('Auto-save failed:', error);
          setStatus('Auto-save failed');
        }
      })();
    }, 1200); // 1.2s after user stops typing
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorContent, titleEditing, activeId]);

  // rename title inline
  async function handleRename(id?: string) {
    const target = id || activeId;
    if (!target) return;
    const current = entries.find((e) => e.id === target);
    const newTitle = prompt('Rename journal', current?.title || '') || current?.title;
    if (!newTitle) return;
    if (!current) return;
    try {
      const updated = await journalAPI.updateJournal(target, { title: newTitle });
      setEntries((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (activeId === updated.id) setTitleEditing(updated.title);
    } catch (error) {
      console.error('Failed to rename journal:', error);
      setStatus('Failed to rename journal');
    }
  }

  // quick download (optional)
  function downloadTxt(entry: JournalEntry) {
    const blob = new Blob([entry.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.title.replace(/[^\w\d-_ ]/g, '') || 'journal'}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // search filter
  const visible = entries.filter((e) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (e.title && e.title.toLowerCase().includes(s)) ||
      (e.content && e.content.toLowerCase().includes(s)) ||
      (e.keywords && Object.keys(e.keywords).some((k) => k.includes(s)))
    );
  });

  return (
    <div className="h-full flex">
      {/* Left list */}
      <div className={`transition-all duration-200 ${leftCollapsed ? 'w-12' : 'w-80'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col`}>
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {!leftCollapsed ? (
            <>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Journal</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your personal notebook and entries will be displayed here.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">+ Add</button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button onClick={handleAdd} className="p-1 bg-blue-600 text-white rounded text-sm">+</button>
            </div>
          )}
        </div>

        {!leftCollapsed && (
          <div className="p-3 border-b">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title / content..."
              className="w-full px-2 py-1 border rounded bg-gray-50 dark:bg-gray-800 text-sm placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {visible.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No journals yet — click Add to create one.</div>
          )}

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {visible.map((e) => (
              <div
                key={e.id}
                onClick={() => setActiveId(e.id)}
                className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 flex gap-3 items-start ${activeId === e.id ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">{e.title}</h4>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(e.updated_at).split(',')[0]}</div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{(e.content || '').slice(0, 200)}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <button title="Rename" onClick={(ev) => { ev.stopPropagation(); handleRename(e.id); }} className="text-xs text-gray-500 hover:text-gray-700">✎</button>
                  <button title="Delete" onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }} className="text-xs text-red-500 hover:text-red-700">🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* collapse handle */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center">
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="p-1 bg-gray-100 dark:bg-gray-800 rounded-full"
            aria-label="Toggle sidebar"
          >
            <div style={{ transform: leftCollapsed ? 'rotate(180deg)' : 'none' }}>⟨</div>
          </button>
        </div>
      </div>

      {/* Editor pane */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input
              value={titleEditing}
              onChange={(e) => setTitleEditing(e.target.value)}
              onBlur={async () => {
                if (!activeId) return;
                try {
                  await journalAPI.updateJournal(activeId, { title: titleEditing });
                  const all = await journalAPI.getAllJournals();
                  setEntries(all);
                } catch (error) {
                  console.error('Failed to update title:', error);
                  setStatus('Failed to update title');
                }
              }}
              placeholder="Journal title"
              className="w-full text-xl font-semibold bg-transparent border-0 focus:outline-none"
            />
            <div className="text-xs text-gray-500 mt-1">{status || (activeId ? `Last saved: ${formatDate(entries.find((x) => x.id === activeId)?.updated_at)}` : '')}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const e = entries.find((x) => x.id === activeId);
                if (e) downloadTxt(e);
              }}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded"
            >
              Export
            </button>
            <button onClick={handleSaveNow} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Save</button>
            <button onClick={() => navigator.clipboard?.writeText(editorContent)} className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded">Copy</button>
            <button onClick={() => { setTitleEditing(''); setEditorContent(''); }} className="px-3 py-1 text-sm text-gray-600 rounded">Clear</button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          {!activeId ? (
            <div className="text-gray-500">Select or add a journal to start writing.</div>
          ) : (
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              placeholder="Write your thoughts, notes, or insights here..."
              className="w-full h-full resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
              style={{ minHeight: '300px' }}
            />
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {activeId ? `${(entries.find((x) => x.id === activeId)?.word_count || 0)} words` : ''}
          </div>
          <div className="text-xs text-gray-500">Autosaves to backend with localStorage fallback</div>
        </div>
      </div>
    </div>
  );
}
