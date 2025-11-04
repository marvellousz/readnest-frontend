// src/lib/journalAPI.ts
export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  keywords?: { [word: string]: number };
}

export interface JournalCreate {
  title: string;
  content?: string;
}

export interface JournalUpdate {
  title?: string;
  content?: string;
}

const API_BASE_URL = 'http://localhost:8000/api';

function getAccessToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('readnest_token') : null;
  } catch {
    return null;
  }
}

class JournalAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const token = getAccessToken();
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getAllJournals(): Promise<JournalEntry[]> {
    return this.request<JournalEntry[]>('/journals');
  }

  async getJournal(id: string): Promise<JournalEntry> {
    return this.request<JournalEntry>(`/journals/${id}`);
  }

  async createJournal(data: JournalCreate): Promise<JournalEntry> {
    return this.request<JournalEntry>('/journals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJournal(id: string, data: JournalUpdate): Promise<JournalEntry> {
    return this.request<JournalEntry>(`/journals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteJournal(id: string): Promise<void> {
    await this.request(`/journals/${id}`, {
      method: 'DELETE',
    });
  }

  async searchJournals(query: string): Promise<JournalEntry[]> {
    return this.request<JournalEntry[]>(`/journals/search/${encodeURIComponent(query)}`);
  }
}

// Local storage fallback
class LocalStorageJournalAPI {
  private STORAGE_KEY = 'readnest-journals';

  private getStoredJournals(): JournalEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveJournals(journals: JournalEntry[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(journals));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  async getAllJournals(): Promise<JournalEntry[]> {
    const journals = this.getStoredJournals();
    return journals.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  async getJournal(id: string): Promise<JournalEntry> {
    const journals = this.getStoredJournals();
    const journal = journals.find(j => j.id === id);
    if (!journal) {
      throw new Error('Journal not found');
    }
    return journal;
  }

  async createJournal(data: JournalCreate): Promise<JournalEntry> {
    const now = new Date().toISOString();
    const newJournal: JournalEntry = {
      id: `j_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      title: data.title,
      content: data.content || '',
      created_at: now,
      updated_at: now,
      word_count: (data.content || '').split(/\s+/).filter(Boolean).length,
      keywords: this.extractKeywords(data.content || ''),
    };

    const journals = this.getStoredJournals();
    journals.push(newJournal);
    this.saveJournals(journals);
    return newJournal;
  }

  async updateJournal(id: string, data: JournalUpdate): Promise<JournalEntry> {
    const journals = this.getStoredJournals();
    const journalIndex = journals.findIndex(j => j.id === id);
    
    if (journalIndex === -1) {
      throw new Error('Journal not found');
    }

    const journal = journals[journalIndex];
    const updatedJournal: JournalEntry = {
      ...journal,
      title: data.title ?? journal.title,
      content: data.content ?? journal.content,
      updated_at: new Date().toISOString(),
      word_count: (data.content ?? journal.content).split(/\s+/).filter(Boolean).length,
      keywords: this.extractKeywords(data.content ?? journal.content),
    };

    journals[journalIndex] = updatedJournal;
    this.saveJournals(journals);
    return updatedJournal;
  }

  async deleteJournal(id: string): Promise<void> {
    const journals = this.getStoredJournals();
    const filteredJournals = journals.filter(j => j.id !== id);
    this.saveJournals(filteredJournals);
  }

  async searchJournals(query: string): Promise<JournalEntry[]> {
    const journals = this.getStoredJournals();
    const queryLower = query.toLowerCase();
    
    return journals.filter(journal => 
      journal.title.toLowerCase().includes(queryLower) ||
      journal.content.toLowerCase().includes(queryLower) ||
      Object.keys(journal.keywords || {}).some(keyword => 
        keyword.toLowerCase().includes(queryLower)
      )
    );
  }

  private extractKeywords(text: string): { [word: string]: number } {
    if (!text) return {};
    
    const tokens = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
    
    const freq: { [word: string]: number } = {};
    for (const token of tokens) {
      freq[token] = (freq[token] || 0) + 1;
    }
    
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);
    
    return Object.fromEntries(sorted);
  }
}

// Hybrid API that tries backend first, falls back to localStorage
class HybridJournalAPI {
  private backendAPI = new JournalAPI();
  private localStorageAPI = new LocalStorageJournalAPI();
  private useBackend = true;

  private async tryBackend<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.useBackend) {
      throw new Error('Backend disabled');
    }

    try {
      return await operation();
    } catch (error) {
      console.warn('Backend operation failed, falling back to localStorage:', error);
      this.useBackend = false;
      throw error;
    }
  }

  async getAllJournals(): Promise<JournalEntry[]> {
    try {
      return await this.tryBackend(() => this.backendAPI.getAllJournals());
    } catch {
      return this.localStorageAPI.getAllJournals();
    }
  }

  async getJournal(id: string): Promise<JournalEntry> {
    try {
      return await this.tryBackend(() => this.backendAPI.getJournal(id));
    } catch {
      return this.localStorageAPI.getJournal(id);
    }
  }

  async createJournal(data: JournalCreate): Promise<JournalEntry> {
    try {
      const result = await this.tryBackend(() => this.backendAPI.createJournal(data));
      // Also save to localStorage as backup
      try {
        await this.localStorageAPI.createJournal(data);
      } catch (error) {
        console.warn('Failed to backup to localStorage:', error);
      }
      return result;
    } catch {
      return this.localStorageAPI.createJournal(data);
    }
  }

  async updateJournal(id: string, data: JournalUpdate): Promise<JournalEntry> {
    try {
      const result = await this.tryBackend(() => this.backendAPI.updateJournal(id, data));
      // Also update localStorage as backup
      try {
        await this.localStorageAPI.updateJournal(id, data);
      } catch (error) {
        console.warn('Failed to backup to localStorage:', error);
      }
      return result;
    } catch {
      return this.localStorageAPI.updateJournal(id, data);
    }
  }

  async deleteJournal(id: string): Promise<void> {
    try {
      await this.tryBackend(() => this.backendAPI.deleteJournal(id));
      // Also delete from localStorage
      try {
        await this.localStorageAPI.deleteJournal(id);
      } catch (error) {
        console.warn('Failed to delete from localStorage:', error);
      }
    } catch {
      await this.localStorageAPI.deleteJournal(id);
    }
  }

  async searchJournals(query: string): Promise<JournalEntry[]> {
    try {
      return await this.tryBackend(() => this.backendAPI.searchJournals(query));
    } catch {
      return this.localStorageAPI.searchJournals(query);
    }
  }

  // Method to check if backend is available
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Method to force use of localStorage
  setUseBackend(useBackend: boolean): void {
    this.useBackend = useBackend;
  }
}

// Export the hybrid API as the default
export const journalAPI = new HybridJournalAPI();

// Export individual APIs for testing
export { JournalAPI, LocalStorageJournalAPI, HybridJournalAPI };
