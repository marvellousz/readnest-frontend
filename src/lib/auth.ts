const BASE_URL = 'http://localhost:8000';

export interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  user?: { id: string; email: string } | null;
}

export const auth = {
  getToken(): string | null {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('readnest_token') : null;
    } catch {
      return null;
    }
  },

  setToken(token: string | null) {
    try {
      if (typeof window === 'undefined') return;
      if (token) localStorage.setItem('readnest_token', token);
      else localStorage.removeItem('readnest_token');
    } catch {}
  },

  getUser(): { id: string; email: string } | null {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem('readnest_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  setUser(user: { id: string; email: string } | null) {
    try {
      if (typeof window === 'undefined') return;
      if (user) localStorage.setItem('readnest_user', JSON.stringify(user));
      else localStorage.removeItem('readnest_user');
    } catch {}
  },

  getUserInitial(email: string): string {
    return email.charAt(0).toUpperCase();
  },

  async register(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Registration failed');
    const data = (await res.json()) as AuthResponse;
    // May not return session; rely on login for token
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = (await res.json()) as AuthResponse;
    if (data.access_token) {
      this.setToken(data.access_token);
      if (data.user) {
        this.setUser(data.user);
      }
    }
    return data;
  },

  logout() {
    this.setToken(null);
    this.setUser(null);
    // Optionally call backend /auth/logout
    fetch(`${BASE_URL}/auth/logout`, { method: 'POST' }).catch(() => {});
  },
};


