'use client';

import { useState } from "react";

interface Paper {
  title: string;
  summary: string;
  link: string;
  source?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Research() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchSource, setSearchSource] = useState<string>("all");

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // Search academic databases
      console.log(`Searching ${searchSource} for academic papers...`);
      const remoteRes = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&top_k=8&source=${searchSource}`);
      if (!remoteRes.ok) {
        const txt = await remoteRes.text();
        throw new Error(`Academic search failed: ${remoteRes.status} ${txt}`);
      }
      const remoteJson = await remoteRes.json();
      // /api/search returns { results: [ { title, summary, link, source } ] }
      const remoteResults = remoteJson.results || [];
      const papersForAgent = remoteResults.map((p: any) => ({
        title: p.title || "",
        abstract: p.summary || p.abstract || "",
        url: p.link || p.url || "",
        source: p.source || "Unknown"
      }));

      if (!papersForAgent.length) {
        setError('No academic papers found for that query.');
        return;
      }

      // Create a mapping from original papers to preserve source information
      const sourceMap = new Map();
      papersForAgent.forEach((paper: any, index: number) => {
        const key = paper.title?.toLowerCase() || `paper_${index}`;
        sourceMap.set(key, paper.source || "Unknown");
      });

      // Call scholar-agent to summarize the academic papers (LLM)
      const agentRes = await fetch(`${API_BASE}/api/scholar-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_prompt: query,
          papers: papersForAgent
        }),
      });
      if (!agentRes.ok) {
        const txt = await agentRes.text();
        throw new Error(`Scholar Agent failed: ${agentRes.status} ${txt}`);
      }
      const agentData = await agentRes.json();
      const agentResults = agentData.results ?? agentData ?? [];

      // Normalize results for UI and preserve source information
      const normalized: Paper[] = (Array.isArray(agentResults) ? agentResults : [])
        .map((r: any, index: number) => {
          const title = r.title || r.name || r.title_text || "Untitled";
          // Try to find the original source by matching title
          const originalSource = sourceMap.get(title.toLowerCase()) || 
                                sourceMap.get(`paper_${index}`) || 
                                "Unknown";
          
          return {
            title: title,
            summary: r.summary || r.abstract || (r.snippet && String(r.snippet).slice(0, 300)) || "",
            link: r.link || r.url || r.pdf || "",
            source: originalSource
          };
        });

      setResults(normalized);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Simple Search Section */}
        <div className="mb-8">
          <div className="flex gap-3 items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search research papers..."
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <select
              value={searchSource}
              onChange={(e) => setSearchSource(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sources</option>
              <option value="semantic_scholar">Semantic Scholar</option>
              <option value="openalex">OpenAlex</option>
              <option value="arxiv">arXiv</option>
              <option value="pubmed">PubMed</option>
            </select>
            <button
              onClick={runSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-4">
              {results.map((paper, idx) => (
                <div key={idx} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg flex-1">
                      {paper.title}
                    </h4>
                    {paper.source && (
                      <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        {paper.source}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                    {paper.summary}
                  </p>
                  {paper.link && (
                    <a
                      href={paper.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open Paper
                    </a>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              Enter a search term to find research papers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
