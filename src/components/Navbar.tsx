'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

interface NavbarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function Navbar({ 
  activeSection, 
  onSectionChange
}: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [userInitial, setUserInitial] = useState('U');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Only access localStorage on the client side to avoid hydration mismatch
    const currentUser = auth.getUser();
    setUser(currentUser);
    if (currentUser) {
      setUserInitial(auth.getUserInitial(currentUser.email));
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navigationItems = [
    { id: 'feed', label: 'Read' },
    { id: 'research', label: 'Research' },
    { id: 'notes', label: 'Notes' },
    { id: 'assistant', label: 'Assistant' },
  ];

  return (
    <div className="sticky top-0 z-50 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm">
      {/* Logo and Navigation */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          ReadNest
        </h1>

        {/* Navigation Items */}
        <nav className="flex items-center gap-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* User */}
      <div className="flex items-center gap-4">
        {/* User Avatar and Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">{userInitial}</span>
            </div>
            {user && (
              <span className="hidden md:block text-sm text-gray-700 dark:text-gray-300">
                {user.email}
              </span>
            )}
            <svg
              className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              {user && (
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
                </div>
              )}
              <button 
                onClick={() => { setIsDropdownOpen(false); onSectionChange('account'); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Profile & Settings
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button 
                onClick={() => { setIsDropdownOpen(false); auth.logout(); router.push('/auth/login'); }} 
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
