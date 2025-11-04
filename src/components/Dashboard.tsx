'use client';

import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import Feed from './Feed';
import DocumentUpload from './DocumentUpload';
import LeftSidebar from './LeftSidebar';
import JournalSidebar from './JournalSidebar';
import Research from './Research';
import Notes from './Notes';
import AIAssistant from './AIAssistant';
import ProfileSettings from './ProfileSettings';
import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  useEffect(() => {
    const token = auth.getToken();
    if (!token) router.push('/auth/login');
  }, [router]);
  const [activeSection, setActiveSection] = useState('feed');
  const [activeTab, setActiveTab] = useState<'rss' | 'pdf'>('rss');
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState<{
    type: 'rss' | 'pdf' | 'research' | 'assistant';
    title: string;
    url?: string;
    id?: string;
  } | null>(null);

  const handleToggleJournal = () => {
    setIsJournalOpen(prev => !prev);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    // Close journal sidebar when switching sections (except when switching to notes, feed, research, or assistant)
    if (section !== 'feed' && section !== 'notes' && section !== 'research' && section !== 'assistant') {
      setIsJournalOpen(false);
    }
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case 'feed':
        return activeTab === 'rss' ? 
          <Feed onContentSelect={setCurrentContent} /> : 
          <DocumentUpload onContentSelect={setCurrentContent} />;
      case 'research':
        return <Research />;
      case 'notes':
        return <Notes />;
      case 'assistant':
        return <AIAssistant onContentSelect={setCurrentContent} />;
      case 'account':
        return <ProfileSettings />;
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Welcome to ReadNest
            </h2>
            <div className="text-gray-600 dark:text-gray-400">
              <p>Select a section from the navigation to get started.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sticky Top Navbar */}
      <Navbar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Only show for feed section */}
        {activeSection === 'feed' && (
          <LeftSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
          <div key={activeSection} className="flex-1 overflow-hidden">
            {renderMainContent()}
          </div>
        </main>

        {/* Right-side single stacked icon rail - only show when sidebar is closed and not on account */}
        {!isJournalOpen && activeSection !== 'account' && (
          <div className="flex flex-col items-center gap-2 p-2 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
            {/* Journal icon */}
            <button
              onClick={() => setIsJournalOpen(prev => !prev)}
              className="w-10 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              title="Open Journal"
            >
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        )}

        {/* Sidebars (render only expanded drawers) */}
        {(activeSection === 'feed' || activeSection === 'notes' || activeSection === 'research' || activeSection === 'assistant') && (
          <JournalSidebar
            isOpen={isJournalOpen}
            currentContent={currentContent}
            onClose={() => setIsJournalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
