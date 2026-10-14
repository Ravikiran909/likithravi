import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  FileCode,
  Send,
  HelpCircle,
  X,
  Copy,
  Check,
  Activity,
  Terminal,
} from 'lucide-react';

interface MongoStatus {
  configured: boolean;
  connected: boolean;
  databaseName: string;
  sanitizedUri: string;
  host: string;
  pingLatencyMs: number | null;
  lastConnectedAt: string | null;
  lastError: string | null;
  collections: string[];
  documentCounts: Record<string, number>;
}

interface MongoDbAtlasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MongoDbAtlasModal: React.FC<MongoDbAtlasModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<MongoStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [records, setRecords] = useState<any | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'records' | 'test' | 'guide'>('status');
  const [selectedCollection, setSelectedCollection] = useState<'verificationRecords' | 'messages' | 'quizResults' | 'profiles' | 'progress'>('verificationRecords');
  const [writingTestRecord, setWritingTestRecord] = useState(false);
  const [writeResult, setWriteResult] = useState<any | null>(null);
  const [testNoteInput, setTestNoteInput] = useState('First live database write from AI Studio WhatsApp Learning Agent');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mongodb/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch MongoDB status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/mongodb/test-connection', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || `Connected to MongoDB Atlas (${data.status?.databaseName}) with ${data.status?.pingLatencyMs}ms ping.`,
        });
        if (data.status) setStatus(data.status);
      } else {
        setTestResult({
          success: false,
          error: data.error || 'Failed to establish connection to MongoDB Atlas.',
        });
        if (data.status) setStatus(data.status);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Network error reaching backend MongoDB endpoint.',
      });
    } finally {
      setTesting(false);
    }
  };

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const res = await fetch('/api/mongodb/records?limit=15');
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
        if (data.status) setStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to fetch records', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleWriteTestRecord = async () => {
    setWritingTestRecord(true);
    setWriteResult(null);
    try {
      const res = await fetch('/api/mongodb/verify-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggeredBy: 'AI Studio Student Portal Verification',
          purpose: 'Live Verification of MongoDB Atlas Persistence',
          testNote: testNoteInput.trim() || 'Verified live test write to MongoDB Atlas cluster',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWriteResult(data);
        if (data.status) setStatus(data.status);
        fetchRecords();
      } else {
        setWriteResult({ error: data.error || 'Write operation failed' });
      }
    } catch (err: any) {
      setWriteResult({ error: err.message || 'Write request failed' });
    } finally {
      setWritingTestRecord(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold">
              🍃
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  MongoDB Atlas Database Integration
                </h2>
                {status?.connected ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Connected ({status.pingLatencyMs}ms)</span>
                  </span>
                ) : status?.configured ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Configured (Testing Needed)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>Awaiting MONGODB_URI Secret</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Secure Server-Side Node.js Backend Driver • Native MongoDB Atlas Persistence
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Refresh MongoDB Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 px-6 pt-3 border-b border-slate-800 bg-slate-900/40 text-xs">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'status'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Connection Overview</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('records');
              fetchRecords();
            }}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'records'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Saved Records Explorer</span>
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'test'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Verify Live Write</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-2 font-medium border-b-2 transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Beginner Setup Guide</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: STATUS & OVERVIEW */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Connection Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  status?.connected
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : status?.configured
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                    : 'bg-slate-800/40 border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {status?.connected ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : status?.configured ? (
                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Database className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">
                      {status?.connected
                        ? 'MongoDB Atlas Cluster Connected & Ready'
                        : status?.configured
                        ? 'MONGODB_URI configured — Connection test recommended'
                        : 'MONGODB_URI Secret Not Configured in AI Studio'}
                    </div>
                    <p className="text-xs opacity-90 mt-0.5">
                      {status?.connected
                        ? `Real-time database operations active. Latency: ${status.pingLatencyMs}ms. Database: "${status.databaseName}".`
                        : status?.configured
                        ? 'Your connection string is loaded in the server environment. Click "Test Connection" to run a live ping.'
                        : 'To store and retrieve real data in your MongoDB Atlas cluster, configure the MONGODB_URI secret.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition cursor-pointer shrink-0 shadow-md shadow-emerald-600/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Testing Ping...' : 'Test Connection'}</span>
                </button>
              </div>

              {/* Test Connection Alert Box */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 ${
                    testResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold">
                      {testResult.success ? 'Success: ' : 'Connection Check Notice: '}
                    </span>
                    <span>{testResult.message || testResult.error}</span>
                  </div>
                </div>
              )}

              {/* Cluster Metadata Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Atlas Cluster Host
                  </span>
                  <div className="font-mono text-xs text-white truncate" title={status?.host || 'None'}>
                    {status?.host || 'Not configured'}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {status?.configured ? 'DNS SRV Monitored' : 'Awaiting secret'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Target Database
                  </span>
                  <div className="font-mono text-xs text-emerald-400 font-bold">
                    {status?.databaseName || 'whatsapp_learning'}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Collections: {status?.collections?.length || 0} active
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Security & Protocol
                  </span>
                  <div className="flex items-center space-x-1 text-xs text-emerald-300 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Server-Side Only</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Zero credentials exposed in browser
                  </span>
                </div>
              </div>

              {/* Masked Connection String Viewer */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sanitized Server Connection String (Credentials Masked)</span>
                  </span>
                  {status?.sanitizedUri && (
                    <button
                      onClick={() => handleCopy(status.sanitizedUri, 'uri')}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
                    >
                      {copiedText === 'uri' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Masked URI</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="font-mono text-xs bg-slate-900 px-3 py-2 rounded-lg text-slate-400 border border-slate-800 break-all select-all">
                  {status?.sanitizedUri || 'MONGODB_URI not yet configured in server environment.'}
                </div>
                <p className="text-[11px] text-slate-400">
                  🔒 Security Rule: Frontend code never receives the raw database password. All read/write queries route through secure Node.js API endpoints.
                </p>
              </div>

              {/* Document Count Breakdown */}
              {status?.connected && status?.documentCounts && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Atlas Collection Stats
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(status.documentCounts).map(([colName, count]) => (
                      <div
                        key={colName}
                        className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-center"
                      >
                        <div className="text-base font-bold text-emerald-400 font-mono">{count}</div>
                        <div className="text-[11px] text-slate-400 truncate">{colName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVED RECORDS EXPLORER */}
          {activeTab === 'records' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Live Records in MongoDB Atlas</h3>
                  <p className="text-xs text-slate-400">
                    Inspect real records stored in your database collections.
                  </p>
                </div>
                <button
                  onClick={fetchRecords}
                  disabled={recordsLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${recordsLoading ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Refresh Documents</span>
                </button>
              </div>

              {/* Collection Selector Tabs */}
              <div className="flex flex-wrap gap-1.5 text-xs bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setSelectedCollection('verificationRecords')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    selectedCollection === 'verificationRecords'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Verification Tests ({records?.verificationRecords?.length || 0})
                </button>
                <button
                  onClick={() => setSelectedCollection('messages')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    selectedCollection === 'messages'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Chat Messages ({records?.messages?.length || 0})
                </button>
                <button
                  onClick={() => setSelectedCollection('quizResults')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    selectedCollection === 'quizResults'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Quiz Results ({records?.quizResults?.length || 0})
                </button>
                <button
                  onClick={() => setSelectedCollection('profiles')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    selectedCollection === 'profiles'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Student Profiles ({records?.profiles?.length || 0})
                </button>
                <button
                  onClick={() => setSelectedCollection('progress')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    selectedCollection === 'progress'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Learning Progress ({records?.progress?.length || 0})
                </button>
              </div>

              {/* Records List */}
              <div className="space-y-3">
                {recordsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-xs">Fetching real documents from MongoDB Atlas...</span>
                  </div>
                ) : !status?.connected ? (
                  <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
                    <Database className="w-8 h-8 text-slate-500 mx-auto" />
                    <h4 className="text-sm font-semibold text-slate-300">Database Not Connected</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Configure your <code className="text-emerald-400 font-mono">MONGODB_URI</code> secret to view records stored in MongoDB Atlas.
                    </p>
                    <button
                      onClick={() => setActiveTab('guide')}
                      className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      View 3-Step Setup Guide
                    </button>
                  </div>
                ) : records && records[selectedCollection]?.length > 0 ? (
                  records[selectedCollection].map((item: any, idx: number) => (
                    <div
                      key={item._id || item.id || idx}
                      className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl space-y-2 text-xs transition"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono text-[11px]">
                            _id: {item._id || item.id}
                          </span>
                          {item.testId && (
                            <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                              {item.testId}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {item.createdAt || item.timestamp || item.savedToMongoAt || item.updatedAt || 'Synced'}
                        </span>
                      </div>
                      <pre className="font-mono text-[11px] bg-slate-900 p-2.5 rounded-lg text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl space-y-2 text-slate-400">
                    <p className="text-xs">No documents saved in this collection yet.</p>
                    <button
                      onClick={() => setActiveTab('test')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Insert Test Record Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VERIFY LIVE WRITE */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Insert Live Verification Record into Atlas</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Clicking below executes a real <code className="text-emerald-400 font-mono">db.collection('verification_records').insertOne(...)</code> command on your MongoDB Atlas cluster. You can then open your MongoDB Atlas Web Dashboard and look at the <code className="text-emerald-400 font-mono">whatsapp_learning &gt; verification_records</code> collection to see this exact record!
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Custom Test Note (Optional):</label>
                  <input
                    type="text"
                    value={testNoteInput}
                    onChange={(e) => setTestNoteInput(e.target.value)}
                    placeholder="Enter custom verification note..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleWriteTestRecord}
                  disabled={writingTestRecord || !status?.connected}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Send className={`w-3.5 h-3.5 ${writingTestRecord ? 'animate-pulse' : ''}`} />
                  <span>{writingTestRecord ? 'Writing to MongoDB Atlas...' : 'Write Test Record Now'}</span>
                </button>
                {!status?.connected && (
                  <p className="text-[11px] text-amber-400">
                    ⚠️ Please test or configure your MONGODB_URI connection first before attempting a write.
                  </p>
                )}
              </div>

              {/* Write Confirmation Result Box */}
              {writeResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    writeResult.success
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    {writeResult.success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Confirmed Written to MongoDB Atlas!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-400" />
                        <span>Write Operation Notice</span>
                      </>
                    )}
                  </div>
                  <p>{writeResult.message || writeResult.error}</p>

                  {writeResult.record && (
                    <div className="bg-slate-950/90 p-3 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500">Document _id: </span>
                        <span className="text-emerald-400 font-bold">{writeResult.record._id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">testId: </span>
                        <span className="text-cyan-400">{writeResult.record.testId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Collection: </span>
                        <span className="text-white">verification_records</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Timestamp: </span>
                        <span className="text-slate-300">{writeResult.record.createdAt}</span>
                      </div>
                    </div>
                  )}

                  {writeResult.success && (
                    <div className="text-[11px] text-emerald-300/90 pt-1">
                      💡 <strong>How to verify in MongoDB Atlas:</strong> Go to <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" className="underline font-semibold text-white">cloud.mongodb.com</a> &gt; Click <strong>Browse Collections</strong> on your cluster &gt; Select database <strong className="text-white">whatsapp_learning</strong> &gt; Open <strong className="text-white">verification_records</strong>. You will see document with ID <code className="bg-slate-900 px-1 py-0.5 rounded text-white">{writeResult.record?._id}</code>!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BEGINNER SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-6 text-xs text-slate-300">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white">
                  Step-by-Step Beginner Guide: Connecting MongoDB Atlas to Google AI Studio
                </h3>
                <p className="text-slate-400 mt-1">
                  Follow these 4 simple steps to connect your free MongoDB Atlas cluster.
                </p>
              </div>

              {/* Step 1 */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>Get your MongoDB Atlas Connection String</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-2">
                  <li>Log in to <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">MongoDB Atlas</a>.</li>
                  <li>Click <strong>Connect</strong> next to your cluster.</li>
                  <li>Select <strong>Drivers</strong> (Node.js).</li>
                  <li>Copy your connection URI string. It looks like:</li>
                </ol>
                <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-[11px] text-emerald-300 border border-slate-800 flex items-center justify-between">
                  <span>mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster0.abcde.mongodb.net/whatsapp_learning?retryWrites=true&w=majority</span>
                  <button
                    onClick={() => handleCopy('mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/whatsapp_learning?retryWrites=true&w=majority', 'template')}
                    className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 bg-slate-800 rounded cursor-pointer"
                  >
                    {copiedText === 'template' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-slate-400 text-[11px]">
                  <em>Note: Replace <code>&lt;username&gt;</code> and <code>&lt;password&gt;</code> with your real database user credentials created in MongoDB Atlas &gt; Database Access.</em>
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Allow Network Access in MongoDB Atlas</span>
                </div>
                <p>
                  To allow the cloud application server to connect to your database:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-2">
                  <li>In MongoDB Atlas left sidebar, click <strong>Network Access</strong> (under Security).</li>
                  <li>Click <strong>Add IP Address</strong>.</li>
                  <li>Click <strong>Allow Access From Anywhere</strong> (<code className="text-emerald-400">0.0.0.0/0</code>).</li>
                  <li>Click <strong>Confirm</strong>.</li>
                </ol>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Where to Configure the Secret in Google AI Studio</span>
                </div>
                <p>
                  In Google AI Studio build environment:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-2">
                  <li>
                    Look at the left sidebar or the top-right toolbar in Google AI Studio and find <strong>Secrets</strong> (or click the <strong>Lock / Key 🔑 icon</strong>).
                  </li>
                  <li>
                    Click <strong>Add Secret</strong> (or <strong>New Environment Variable</strong>).
                  </li>
                  <li>
                    Secret Name: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono font-bold">MONGODB_URI</code>
                  </li>
                  <li>
                    Secret Value: Paste your complete Atlas connection string from Step 1.
                  </li>
                  <li>
                    Save the secret. The server automatically reads it on restart!
                  </li>
                </ol>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                    4
                  </span>
                  <span>Verify That Real Records Are Saved</span>
                </div>
                <p>
                  Once configured:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                  <li>
                    Click <strong>Test Connection</strong> above to confirm a green live status.
                  </li>
                  <li>
                    Click <strong>Verify Live Write</strong> and hit <strong>Write Test Record Now</strong>.
                  </li>
                  <li>
                    Check the <strong>Saved Records Explorer</strong> tab to see all your live transcripts, quiz scores, and student profiles stored in MongoDB Atlas!
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>MongoDB Atlas Driver v6 • NodeJS Server Proxy</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
