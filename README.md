# readnest frontend

A modern, privacy-focused reading hub frontend built with Next.js. Manage your journals, RSS feeds, documents, and academic research in one beautiful interface.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Contact](#contact)

## Overview

ReadNest Frontend provides a seamless, responsive user interface for managing your personal reading hub. It integrates journaling, RSS feed aggregation, document processing, and academic research tools into a single, intuitive dashboard.

**Who it's for:** Researchers, students, writers, and anyone who wants to centralize their reading, note-taking, and research workflow.

## Tech Stack

- **Framework**: Next.js 15 with Turbopack
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: React Hooks & Local Storage
- **HTTP Client**: Fetch API
- **Deployment**: Vercel-ready

## Features

- **Smart Journaling Interface**: Create and manage journal entries with real-time keyword extraction
- **RSS Feed Dashboard**: Subscribe to feeds and view aggregated articles in one place
- **Document Upload & Processing**: Upload PDF and DOCX files with automatic text extraction
- **Academic Research Integration**: Search across multiple academic databases (Semantic Scholar, arXiv, PubMed, OpenAlex)
- **AI-Powered Chat**: Interactive AI assistant with access to your notes and journals
- **Responsive Design**: Beautiful, modern UI that works on all devices
- **User Authentication**: Secure login and registration with Supabase
- **Real-time Search**: Fast, client-side search across all your content

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/marvellousz/readnest.git
   cd readnest/readnest-frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create `.env.local` in the root directory:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see the application.

## Usage

### Getting Started

1. **Register/Login**: Create an account or log in with existing credentials
2. **Dashboard**: Access your personalized dashboard with all features
3. **Navigation**: Use the sidebar to switch between Journals, Feeds, Documents, and Research

### Creating Journal Entries

1. Navigate to **Journals** from the sidebar
2. Click **"New Entry"** or **"+"** button
3. Enter a title and content
4. Keywords are automatically extracted as you type
5. Save your entry - it's automatically synced with the backend

### Managing RSS Feeds

1. Go to **Feeds** section
2. Click **"Add Feed"** button
3. Enter RSS feed URL and optional custom name
4. View aggregated articles from all your subscriptions
5. Refresh feeds manually or wait for automatic updates

### Uploading Documents

1. Navigate to **Documents** section
2. Click **"Upload Document"** button
3. Select PDF or DOCX file (max 10MB)
4. Document is automatically processed and text extracted
5. Search through document content using the search bar

### Academic Research

1. Go to **Research** section
2. Enter your search query
3. Select source (Semantic Scholar, arXiv, PubMed, OpenAlex, or All)
4. Browse results and use AI agent for summaries
5. Save interesting papers to your collection

### AI Chat Assistant

1. Access **Chat** from the dashboard
2. Ask questions about your notes, research, or general topics
3. AI has context from your recent journal entries
4. Get intelligent responses and recommendations

## Deployment

### Vercel (Recommended)

1. **Connect your GitHub repository** to Vercel

2. **Add environment variables** in Vercel dashboard:

   - `NEXT_PUBLIC_API_URL`: Your backend API URL (e.g., `https://api.readnest.com`)

3. **Deploy** - Vercel handles the build automatically

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:

- `NEXT_PUBLIC_API_URL` (Backend API URL)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Contact

- **Email**: pranavmurali024@gmail.com
- **GitHub**: [https://github.com/marvellousz/readnest](https://github.com/marvellousz/readnest)

---

Built with ❤️ for researchers and readers
