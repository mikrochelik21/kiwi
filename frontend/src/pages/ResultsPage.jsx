import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation, Link } from "react-router";
import { ArrowLeft, Download, Share2, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

const resolveApiBase = () => {
  const envBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (envBase) return envBase;
  if (typeof window !== 'undefined') {
    return `${window.location.origin.replace(/\/$/, "")}/api`;
  }
  return "http://localhost:5001/api";
};

const ResultsPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const url = searchParams.get('url');
  const [activeTab, setActiveTab] = useState('overview');
  const [results, setResults] = useState(null);
  const [latestData, setLatestData] = useState(null); // temporary store for interim responses
  const [loading, setLoading] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const MAX_POLL_ATTEMPTS = 8; // total attempts including first
  const INITIAL_POLL_DELAY_MS = 1000; // Start with 1 second
  const MAX_POLL_DELAY_MS = 5000;     // Max 5 seconds between polls
  const BACKOFF_FACTOR = 1.5;         // Exponential backoff multiplier
  const API_BASE = useMemo(() => resolveApiBase(), []);
  
  const handleExportPDF = () => {
    // Use browser's print functionality with PDF-optimized styling
    window.print();
  };

  const handleShare = async () => {
    if (!results) return;
    
    const shareUrl = window.location.href;
    const shareTitle = `Content Analysis Results - ${results.url || url}`;
    const shareText = `Check out this content analysis! Score: ${results.final_score}/100`;
    
    // Check if Web Share API is supported (mobile devices, some modern browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or error occurred
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
          fallbackShare(shareUrl, shareText);
        }
      }
    } else {
      // Fallback: show share options
      fallbackShare(shareUrl, shareText);
    }
  };

  const fallbackShare = (shareUrl, shareText) => {
    // Create WhatsApp share link
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    
    // Create modal with share options
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
        <h3 class="text-lg font-bold text-slate-900 mb-4">Share Results</h3>
        <div class="space-y-3">
          <a href="${whatsappUrl}" target="_blank" class="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 border border-slate-200 transition-colors">
            <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span class="font-medium text-slate-700">WhatsApp</span>
          </a>
          <button onclick="navigator.clipboard.writeText('${shareUrl.replace(/'/g, "\\'")}');this.innerHTML='✓ Copied!';setTimeout(()=>this.innerHTML='Copy Link',2000)" class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 border border-slate-200 transition-colors text-left">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            <span class="font-medium text-slate-700">Copy Link</span>
          </button>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium hover:bg-slate-200 transition-colors">
          Close
        </button>
      </div>
    `;
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    document.body.appendChild(modal);
  };

  // Fetch analysis from backend when `url` query param is present
  useEffect(() => {
    let cancelled = false;
    if (!url) return;
    
    // Check if we already have data passed from AnalyzePage
    if (location.state?.analysisData) {
      setResults(location.state.analysisData);
      setLoading(false);
      return;
    }
    
    setPollAttempts(0);
    setLoading(true);
    setResults(null);

    const doFetch = async (attempt = 1, currentDelay = INITIAL_POLL_DELAY_MS) => {
      try {
        const res = await fetch(`${API_BASE}/analyze`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ url }),
          mode: 'cors',
          credentials: 'include'
        });
        
        if (!res.ok) {
          // Try to parse JSON error response first
          try {
            const errorData = await res.json();
            // If it's an insufficient content error, show it nicely
            if (errorData.error === "Insufficient content for analysis") {
              setResults({
                error: errorData.error,
                message: errorData.message,
                wordCount: errorData.wordCount,
                minimumRequired: errorData.minimumRequired,
                suggestions: errorData.suggestions
              });
              setLoading(false);
              return;
            }
            throw new Error(errorData.message || errorData.error || 'Failed to analyze');
          } catch (parseErr) {
            // If JSON parsing fails, fall back to text
            const txt = await res.text();
            throw new Error(txt || 'Failed to analyze');
          }
        }

        const data = await res.json();
        if (cancelled) return;

        // Keep latestData for debug/inspection, but do not render main results until
        // we have a final state (non-zero score, error, or we've exhausted attempts).
        setLatestData(data);

        const score = typeof data?.final_score === 'number' ? data.final_score : null;

        // If still waiting on LLM (score 0 or null) and we have attempts left, schedule retry with exponential backoff
        if ((score === 0 || score === null) && !data?.error && attempt < MAX_POLL_ATTEMPTS) {
          setPollAttempts(attempt);
          const nextDelay = Math.min(currentDelay * BACKOFF_FACTOR, MAX_POLL_DELAY_MS);
          setTimeout(() => {
            if (!cancelled) doFetch(attempt + 1, nextDelay);
          }, nextDelay);
          return; // do not set results yet — keep overlay visible and avoid flashing 0
        }

        // Final: either we have a real score, an error, or we've reached max attempts.
        // Set results immediately (no artificial delay).
        setResults(data);
        setLoading(false);
      } catch (err) {
        console.error('Analysis fetch error', err);
        if (!cancelled) {
          const apiOrigin = API_BASE.replace(/\/api$/, '') || API_BASE;
          const errorMessage = err.name === 'TypeError' && err.message.includes('fetch')
            ? `Cannot connect to analysis server. Please ensure the backend is running on ${apiOrigin}`
            : (err.message || 'Analysis failed');
          setResults({ 
            error: 'Connection Failed',
            message: errorMessage,
            suggestions: [
              'Verify the backend server is running (npm run dev in backend folder)',
              `Check that the backend is accessible at ${apiOrigin}`,
              'Ensure no firewall is blocking the connection',
              'Try refreshing the page and analyzing again'
            ]
          });
          setLoading(false);
        }
      }
    };

    // initial attempt with initial delay
    doFetch(1, INITIAL_POLL_DELAY_MS);

    return () => {
      cancelled = true;
    };
  }, [url, location.state]);

  const reportDate = useMemo(() => new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }), []);
  const printableUrl = results?.url || url || '—';
  const totalRecommendations = results?.recommendations?.length || 0;

  const priorityColors = {
    high: "from-red-500 to-orange-500",
    medium: "from-yellow-500 to-orange-500",
    low: "from-blue-500 to-cyan-500"
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 60) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const CircularProgress = ({ score, size = 120 }) => {
    // If no score yet (0 or null), show a spinner to avoid flashing 0
    if (score == null || score === 0) {
      return (
        <div className="relative" style={{ width: size, height: size }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
          </div>
        </div>
      );
    }

    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;
    
    // Dynamic gradient based on score - kiwi theme
    const gradientColors = score >= 80 
      ? ['#10b981', '#059669'] // emerald green
      : score >= 60 
      ? ['#84cc16', '#65a30d'] // lime green
      : ['#f59e0b', '#ef4444']; // orange to red

    return (
      <div className="relative group" style={{ width: size, height: size }}>
        {/* Static glow effect - no animation */}
        <div className="absolute -inset-4 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
        
        <svg className="transform -rotate-90 relative z-10" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-slate-200"
          />
          {/* Animated progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="45"
            stroke="url(#scoreGradient)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              animation: 'fadeIn 0.5s ease-out'
            }}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Score number with animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent animate-scale-in">
            {score}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-green-50 relative overflow-hidden print:bg-white print:text-slate-900 print:min-h-0 print:overflow-visible print-root">
      {/* Subtle background gradient blobs - no distracting particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40 print-hidden">
        {/* Large gradient blobs */}
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-gradient-to-br from-green-300/40 to-emerald-400/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-gradient-to-bl from-lime-300/30 to-green-400/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-emerald-200/25 to-lime-200/25 rounded-full blur-3xl" />
      </div>
      {/* Header with glassmorphism */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-40 shadow-lg shadow-slate-200/50 print-hidden">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/analyze"
                className="group p-2 hover:bg-slate-100 rounded-lg transition-all duration-300 hover:scale-110"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 group-hover:-translate-x-1 transition-transform" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Analysis Results</h1>
                <p className="text-sm text-slate-600">{results?.url || url || '—'}</p>
                {/* Accurate/Fast mode badges removed */}
              </div>
            </div>
            
            <div className="flex items-center gap-3 print-hidden">
              <button 
                onClick={handleShare}
                disabled={!results}
                className="group px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all duration-300 flex items-center gap-2 hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Share
              </button>
              <button 
                onClick={handleExportPDF}
                disabled={!results}
                className="group relative px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-xl transition-all duration-300 flex items-center gap-2 overflow-hidden hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Download className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
                <span className="relative z-10">Export PDF</span>
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg blur opacity-30 group-hover:opacity-60 transition-opacity" />
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000" />
              </button>
            </div>
          </div>
        </div>
      </div>

        <div className="hidden print:block bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-6 print:max-w-full print:px-0">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Culinary Compass</p>
                  <h1 className="text-3xl font-semibold text-slate-900 mt-1">Content Quality Audit</h1>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-800">Generated:</span> {reportDate}</p>
                  <p><span className="font-semibold text-slate-800">Score:</span> {results?.final_score ?? '—'}/100</p>
                </div>
              </div>
              <div className="text-sm text-slate-700">
                <p><span className="font-semibold text-slate-900">URL:</span> {printableUrl}</p>
                {totalRecommendations > 0 && (
                  <p><span className="font-semibold text-slate-900">Recommendations:</span> {totalRecommendations} prioritized actions</p>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-12 relative z-10 print:max-w-full print:px-0 print:py-6">
        
        {/* Error State - Connection Failed */}
        {results?.error === "Connection Failed" && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-red-200/50 p-8 shadow-2xl">
            <div className="text-center max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Cannot Connect to Analysis Server</h2>
              <p className="text-lg text-slate-700 mb-6">{results.message}</p>
              
              <div className="text-left bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Troubleshooting Steps:
                </h3>
                <ul className="space-y-2">
                  {results.suggestions?.map((suggestion, i) => (
                    <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5" />
                Try Again
              </Link>
            </div>
          </div>
        )}
        
        {/* Error State - Insufficient Content */}
        {results?.error === "Insufficient content for analysis" && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-orange-200/50 p-8 shadow-2xl">
            <div className="text-center max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-orange-600" />
              </div>
              
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Cannot Analyze This Page</h2>
              <p className="text-lg text-slate-700 mb-6">{results.message}</p>
              
              <div className="bg-orange-50 rounded-2xl p-6 mb-6 border border-orange-100">
                <div className="flex items-center justify-center gap-8 text-sm">
                  <div>
                    <div className="text-slate-600 mb-1">Detected Words</div>
                    <div className="text-2xl font-bold text-orange-600">{results.wordCount}</div>
                  </div>
                  <div className="text-3xl text-orange-300">→</div>
                  <div>
                    <div className="text-slate-600 mb-1">Required Minimum</div>
                    <div className="text-2xl font-bold text-green-600">{results.minimumRequired}</div>
                  </div>
                </div>
              </div>
              
              <div className="text-left bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Try These Instead:
                </h3>
                <ul className="space-y-2">
                  {results.suggestions?.map((suggestion, i) => (
                    <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5" />
                Try Another URL
              </Link>
            </div>
          </div>
        )}
        
        {/* Normal Results */}
        {!results?.error && results?.final_score !== undefined && (
        <>
        {/* Overall Score Card with celebration effect */}
        <div className="group bg-white/85 backdrop-blur-xl rounded-3xl border border-slate-200/50 p-8 mb-8 shadow-2xl hover:shadow-blue-200/30 transition-all duration-500 hover:scale-[1.01] relative overflow-hidden print-section print:shadow-none print:border-slate-300 print:bg-white print:scale-100 print:hover:scale-100 print:p-6">
          {/* Shimmer effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-900">Overall Score</span>
              </div>
              
              <div className="flex flex-col items-center print:items-start">
                <div className="print-hidden">
                  <CircularProgress score={results?.final_score} size={150} />
                </div>
                <div className="hidden print:block">
                  <p className="text-5xl font-bold text-slate-900 leading-none">{results?.final_score ?? '—'}</p>
                  <p className="text-sm text-slate-600 mt-1">Overall score (out of 100)</p>
                </div>
                
                <p className="mt-4 text-slate-600 text-center">
                  Your blog scores <span className="font-bold text-green-600">{results?.final_score ? `${results.final_score}/100` : 'Calculating...'}</span>
                </p>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {(results?.modules ? Object.entries(results.modules).map(([key, {score}]) => ({name: key.charAt(0).toUpperCase() + key.slice(1), score})) : []).map((cat, i) => (
                <div key={i} className="group p-4 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/50 hover:border-green-300/50 hover:shadow-lg hover:shadow-green-100/50 transition-all duration-300 hover:scale-105 relative overflow-hidden print:bg-white print:shadow-none print:border-slate-300 print:scale-100">
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">{cat.score}</span>
                      {cat.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 animate-bounce-slow" />}
                      {cat.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full bg-gradient-to-r ${getScoreColor(cat.score)} transition-all duration-1000 ease-out`}
                        style={{ width: `${cat.score}%`, animation: 'slideIn 1s ease-out' }}
                      />
                    </div>
                    <p className="text-xs font-medium text-slate-600">{cat.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs with enhanced hover effects */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 print-hidden">
          {['Overview', 'Recommendations', 'Module Details'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
              className={`group relative px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap overflow-hidden ${
                activeTab === tab.toLowerCase().replace(' ', '-')
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-300/50 scale-105'
                  : 'bg-white/80 backdrop-blur-xl border border-slate-200 text-slate-700 hover:bg-white hover:scale-105 hover:shadow-md'
              }`}
            >
              <span className="relative z-10">{tab}</span>
              {/* Shimmer on hover for inactive tabs */}
              {activeTab !== tab.toLowerCase().replace(' ', '-') && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-100/50 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab - Quick Summary */}
        <div className={`${activeTab === 'overview' ? 'block' : 'hidden'} print:block space-y-6`}>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Performance Summary
            </h2>
            
            {/* Quick Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results?.modules && Object.entries(results.modules).map(([moduleName, moduleData], i) => {
                const topMetrics = Object.entries(moduleData.metrics || {})
                  .filter(([key, val]) => typeof val === 'number' && !key.includes('count') && !key.includes('total'))
                  .slice(0, 3);
                
                return (
                  <div
                    key={i}
                    className="group bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 p-6 hover:border-green-300 hover:shadow-xl hover:shadow-green-200/20 transition-all duration-300 hover:scale-[1.02] print-section print:bg-white print:shadow-none print:border-slate-300"
                    style={{
                      animation: `fadeIn 0.5s ease-out ${i * 0.1}s backwards`
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-900 capitalize">
                        {moduleName.replace(/_/g, ' ')}
                      </h3>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getScoreColor(moduleData.score)} flex items-center justify-center shadow-lg`}>
                        <span className="text-white font-bold text-lg">{moduleData.score}</span>
                      </div>
                    </div>
                    
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
                      <div 
                        className={`h-full bg-gradient-to-r ${getScoreColor(moduleData.score)} transition-all duration-1000 ease-out`}
                        style={{ width: `${moduleData.score}%` }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      {topMetrics.map(([key, val], j) => (
                        <div key={j} className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-slate-900">
                            {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Key Highlights */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200/50 p-6 print-section print:bg-white print:border-slate-300">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-600" />
                Key Highlights
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-900">Overall Performance</div>
                    <div className="text-sm text-slate-600">
                      Your blog scored {results?.final_score}/100 across {Object.keys(results?.modules || {}).length} modules
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-900">Recommendations Available</div>
                    <div className="text-sm text-slate-600">
                      {totalRecommendations} actionable improvements identified
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Recommendations Tab */}
        <div className={`${activeTab === 'recommendations' ? 'block' : 'hidden'} print:block space-y-4`}>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Actionable Recommendations
            </h2>
            
            {(results?.recommendations || []).map((rec, i) => {
              const priority = rec.impact > 7 ? 'high' : rec.impact > 4 ? 'medium' : 'low';
              return (
              <div
                key={i}
                className="group bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 p-6 hover:border-green-300 hover:shadow-2xl hover:shadow-green-200/30 transition-all duration-300 hover:scale-[1.02] relative overflow-hidden print-section print:bg-white print:shadow-none print:border-slate-300"
                style={{
                  animation: `fadeIn 0.5s ease-out ${i * 0.1}s backwards`
                }}
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-100/30 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                
                {/* Subtle glow border */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-green-300 to-emerald-300 rounded-2xl opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-500" />
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${priorityColors[priority]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {priority === 'high' ? (
                      <AlertTriangle className="w-6 h-6 text-white" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2 text-xs">
                      <span className="px-3 py-1 rounded-full font-semibold bg-slate-100 text-slate-700">
                        #{String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${priorityColors[priority]}`}>
                        {priority.toUpperCase()} PRIORITY
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        General
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {rec.effort} Effort
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {rec.summary}
                    </h3>
                    
                    <p className="text-slate-600 mb-3">
                      {rec.summary}
                    </p>
                    
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                      <TrendingUp className="w-4 h-4" />
                      Impact: {rec.impact}/10
                    </div>
                    {rec.example_code && (
                      <pre className="mt-2 p-2 bg-slate-100 rounded text-xs overflow-x-auto">
                        {rec.example_code}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
        </div>

        {/* Detailed Metrics */}
        <div className={`${activeTab === 'module-details' ? 'grid' : 'hidden'} print:grid md:grid-cols-2 gap-6`}>
            {(results?.modules ? Object.entries(results.modules) : []).map(([key, {score, metrics}], i) => {
              // For content module, promote core sub-scores first
              const orderedEntries = (() => {
                if (key === 'content' && metrics) {
                  const priorityKeys = [
                    'depth_score','readability_score','structure_score','media_score','engagement_score','originality_score','relevance_score'
                  ];
                  const primary = priorityKeys
                    .filter(k => k in metrics)
                    .map(k => [k, metrics[k]]);
                  const rest = Object.entries(metrics)
                    .filter(([k]) => !priorityKeys.includes(k));
                  return [...primary, ...rest];
                }
                return Object.entries(metrics || {});
              })();
              return (
              <div key={i} className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 p-6 print-section print:bg-white print:border-slate-300">
                <h3 className="text-xl font-bold text-slate-900 mb-4">{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-blue-600">{score}/100</div>
                  {orderedEntries
                    .filter(([_, v]) => v !== null && v !== undefined)
                    .map(([mkey, mval], j) => {
                      // Special rendering for uniqueness metrics - side by side
                      if (mkey === 'web_uniqueness' && typeof mval === 'object' && mval.score !== undefined) {
                        // Find database_uniqueness from the same metrics object
                        const dbUniqueness = metrics?.database_uniqueness;
                        
                        return (
                          <div key={j} className="border-t pt-3 mt-3 -mx-6 px-6">
                            <div className="font-semibold text-slate-800 mb-3">✨ Uniqueness Analysis</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Web Uniqueness - Left Side */}
                              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="font-semibold text-slate-800">Web Uniqueness</div>
                                </div>
                                <div className="text-xs text-slate-600 mb-3">Compared to general web (Datamuse API)</div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium text-slate-700">Score</span>
                                  <span className="text-2xl font-bold text-blue-600">{mval.score}/100</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm text-slate-600">Level</span>
                                  <span className="text-sm font-semibold text-slate-800 capitalize">{mval.level?.replace(/-/g, ' ')}</span>
                                </div>
                                {mval.reasoning && (
                                  <p className="text-xs text-slate-600 italic mt-2 p-2 bg-white/50 rounded">{mval.reasoning}</p>
                                )}
                                {mval.details && mval.details.veryRareWords && mval.details.veryRareWords.length > 0 && (
                                  <div className="mt-3 p-2 bg-white/60 rounded">
                                    <span className="font-medium text-xs">Rare terms: </span>
                                    <span className="text-blue-600 font-medium text-xs">{mval.details.veryRareWords.join(', ')}</span>
                                  </div>
                                )}
                              </div>

                              {/* Database Uniqueness - Right Side */}
                              {dbUniqueness && typeof dbUniqueness === 'object' && dbUniqueness.score !== undefined && (
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="font-semibold text-slate-800">Industry Uniqueness</div>
                                  </div>
                                  <div className="text-xs text-slate-600 mb-3">Compared to food blogs (Database)</div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-700">Score</span>
                                    <span className="text-2xl font-bold text-purple-600">{dbUniqueness.score}/100</span>
                                  </div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-slate-600">Level</span>
                                    <span className="text-sm font-semibold text-slate-800 capitalize">{dbUniqueness.level?.replace(/-/g, ' ')}</span>
                                  </div>
                                  {dbUniqueness.reasoning && (
                                    <p className="text-xs text-slate-600 italic mt-2 p-2 bg-white/50 rounded">{dbUniqueness.reasoning}</p>
                                  )}
                                  {dbUniqueness.details && dbUniqueness.details.veryRareWords && dbUniqueness.details.veryRareWords.length > 0 && (
                                    <div className="mt-3 p-2 bg-white/60 rounded">
                                      <span className="font-medium text-xs">Rare terms: </span>
                                      <span className="text-purple-600 font-medium text-xs">{dbUniqueness.details.veryRareWords.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      // Skip database_uniqueness as it's already rendered with web_uniqueness
                      if (mkey === 'database_uniqueness') {
                        return null;
                      }
                      // Skip keyword_rarity_data object rendering
                      if (mkey === 'keyword_rarity_data' && typeof mval === 'object') {
                        return null;
                      }
                      // Default rendering for other metrics
                      return (
                        <div key={j}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700">{mkey.replace(/_/g, ' ')}</span>
                            <span className="font-semibold text-slate-900">{typeof mval === 'boolean' ? (mval ? 'Yes' : 'No') : (typeof mval === 'number' && !Number.isInteger(mval) ? mval.toFixed(2) : String(mval))}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              );
            })}
        </div>
        </>
        )}
      </div>

      {/* Loading Overlay - Only show while actually analyzing */}
      {(loading || !results) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 print-hidden">
          <div className="bg-white rounded-3xl p-12 max-w-md mx-4 text-center shadow-2xl">
            <div className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center">
              {/* Rotating circle */}
              <svg className="absolute inset-0 w-24 h-24 animate-spin" style={{ animationDuration: '1.5s' }}>
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  stroke="#16a34a"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray="70 210"
                  strokeLinecap="round"
                />
              </svg>
              {/* Static kiwi emoji */}
              <span className="text-5xl relative z-10">🥝</span>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Analyzing Your Blog</h3>
            <p className="text-slate-600 mb-6">Please wait while we analyze all metrics...</p>
            
            <div className="space-y-3">
              {["Performance", "Content Quality", "User Experience", "SEO & Accessibility"].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-slate-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
