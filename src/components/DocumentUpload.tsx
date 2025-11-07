'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'docx';
  size: number;
  uploadDate: string;
  content?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const STORAGE_KEY = 'readnest_documents';

interface DocumentUploadProps {
  onContentSelect?: (content: {
    type: 'rss' | 'pdf';
    title: string;
    url?: string;
    id?: string;
  }) => void;
}

export default function DocumentUpload({ onContentSelect }: DocumentUploadProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle authentication errors
  const handleAuthError = () => {
    auth.logout();
    router.push('/auth/login');
  };

  // Fetch auth headers
  const authHeaders = () => {
    const token = auth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load documents from localStorage
  const loadDocuments = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const docs = JSON.parse(stored);
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  // Save documents to localStorage
  const saveDocuments = (docs: Document[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch (error) {
      console.error('Failed to save documents:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const fileArray = Array.from(files);
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validFiles = fileArray.filter(file => {
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    if (validFiles.length !== fileArray.length) {
      setError('Some files were skipped. Only PDF, DOC, and DOCX files under 10MB are allowed.');
    }

    let successCount = 0;
    let errorCount = 0;

    for (const file of validFiles) {
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const documentType = file.type.includes('pdf') ? 'pdf' : 'doc';
      
      const newDocument: Document = {
        id: documentId,
        name: file.name,
        type: documentType,
        size: file.size,
        uploadDate: new Date().toISOString(),
        status: 'uploading'
      };

      // Use functional update to get latest documents state
      setDocuments(prevDocs => {
        const updatedDocs = [newDocument, ...prevDocs];
        saveDocuments(updatedDocs);
        return updatedDocs;
      });

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);

        const token = auth.getToken();
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/api/documents/upload`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          setDocuments(prevDocs => {
            const finalDocs = prevDocs.map(doc => 
              doc.id === documentId 
                ? { ...doc, status: 'ready', content: result.content, id: result.id }
                : doc
            );
            saveDocuments(finalDocs);
            return finalDocs;
          });
          successCount++;
        } else {
          const errorText = await response.text();
          console.error('Upload error response:', response.status, errorText);
          let errorMessage = `Upload failed: ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        setDocuments(prevDocs => {
          const errorDocs = prevDocs.map(doc => 
            doc.id === documentId 
              ? { ...doc, status: 'error' }
              : doc
          );
          saveDocuments(errorDocs);
          return errorDocs;
        });
        errorCount++;
        setError(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      setSuccess(`Successfully uploaded ${successCount} document(s)`);
      setTimeout(() => setSuccess(null), 3000);
    }
  }, []);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files);
    }
  };

  // Start editing document name
  const startEditing = (documentId: string, currentName: string) => {
    setEditingDocument(documentId);
    setEditName(currentName);
  };

  // Save document name edit
  const saveEdit = (documentId: string) => {
    if (!editName.trim()) {
      setError('Document name cannot be empty');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const updatedDocs = documents.map(doc => 
      doc.id === documentId 
        ? { ...doc, name: editName.trim() }
        : doc
    );
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);
    
    // Update selected document if it's the one being edited
    if (selectedDocument?.id === documentId) {
      setSelectedDocument({ ...selectedDocument, name: editName.trim() });
    }
    
    setEditingDocument(null);
    setEditName('');
    setSuccess('Document renamed successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingDocument(null);
    setEditName('');
  };

  // Delete document
  const deleteDocument = (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    const updatedDocs = documents.filter(doc => doc.id !== documentId);
    setDocuments(updatedDocs);
    saveDocuments(updatedDocs);
    
    if (selectedDocument?.id === documentId) {
      setSelectedDocument(null);
    }
    
    setSuccess('Document deleted successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status color
  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'uploading': return 'text-yellow-600 dark:text-yellow-400';
      case 'processing': return 'text-blue-600 dark:text-blue-400';
      case 'ready': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Handle document selection
  const handleDocumentClick = (document: Document) => {
    if (document.status === 'ready') {
      setSelectedDocument(document);
      setSummary(null); // Clear summary when selecting new document
      // Notify parent component about content selection for journaling
      if (onContentSelect) {
        onContentSelect({
          type: 'pdf',
          title: document.name,
          id: document.id
        });
      }
    }
  };

  const handleSummarize = async () => {
    if (!selectedDocument) return;
    
    setSummarizing(true);
    setSummary(null);
    setError(null);

    try {
      const documentText = selectedDocument.content || '';
      if (!documentText.trim()) {
        throw new Error('No content available to summarize');
      }

      const prompt = `Please provide a concise summary of the following document in 2-3 paragraphs. Focus on the main points and key information:\n\nTitle: ${selectedDocument.name}\n\nContent:\n${documentText.slice(0, 4000)}`;

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
        throw new Error(`Failed to summarize document: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.response || 'Unable to generate summary');
    } catch (err: any) {
      console.error('Failed to summarize:', err);
      setError(err.message || 'Failed to summarize document');
    } finally {
      setSummarizing(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'uploading':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'ready':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Document List */}
      <div className={`${selectedDocument ? 'w-1/3' : 'w-full'} border-r border-gray-200 dark:border-gray-700 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Documents</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {documents.length} document(s) uploaded
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Uploading...' : '+ Upload'}
            </button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                PDF, DOC, DOCX files up to 10MB
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Choose Files
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-auto">
          {documents.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-1">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedDocument?.id === doc.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  } ${doc.status !== 'ready' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {doc.type === 'pdf' ? (
                        <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {editingDocument === doc.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(doc.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEdit(doc.id)}
                              className="p-1 text-green-500 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              title="Save"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
                              title="Cancel"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <h3 className="font-medium text-gray-900 dark:text-white truncate flex-1">
                            {doc.name}
                          </h3>
                        )}
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 ${getStatusColor(doc.status)}`}>
                            {getStatusIcon(doc.status)}
                            <span className="text-xs capitalize">{doc.status}</span>
                          </div>
                          {doc.status === 'ready' && editingDocument !== doc.id && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(doc.id, doc.name);
                                }}
                                className="p-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                title="Rename document"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDocument(doc.id);
                                }}
                                className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Delete document"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatFileSize(doc.size)}
                        </p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(doc.uploadDate).toLocaleDateString()}
                        </p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400 uppercase">
                          {doc.type}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Document Viewer */}
      {selectedDocument && (
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedDocument.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {formatFileSize(selectedDocument.size)} • {selectedDocument.type.toUpperCase()} • 
                  Uploaded {new Date(selectedDocument.uploadDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSummarize}
                  disabled={summarizing || !selectedDocument || !selectedDocument.content}
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
                <button 
                  onClick={() => {
                    setSelectedDocument(null);
                    setSummary(null);
                  }} 
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
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
              
              {selectedDocument.content ? (
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedDocument.content}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">
                    Document content is being processed...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
