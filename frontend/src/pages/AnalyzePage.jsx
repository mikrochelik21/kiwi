import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Globe, Sparkles, Loader, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";

const AnalyzePage = () => {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [validUrl, setValidUrl] = useState(null);
  const navigate = useNavigate();

  const validateUrl = (input) => {
    try {
      // Add protocol if missing
      let testUrl = input.trim();
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = 'https://' + testUrl;
      }
      new URL(testUrl);
      setValidUrl(true);
      return testUrl;
    } catch {
      setValidUrl(false);
      return null;
    }
  };

  const handleUrlChange = (e) => {
    const input = e.target.value;
    setUrl(input);
    if (input.length > 3) {
      validateUrl(input);
    } else {
      setValidUrl(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && validUrl && !analyzing) {
      handleAnalyze();
    }
  };

  const handleAnalyze = async () => {
    const validatedUrl = validateUrl(url);
    
    if (!validatedUrl) {
      toast.error("Please enter a valid blog URL");
      return;
    }

    setAnalyzing(true);
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      const res = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: validatedUrl }),
        mode: 'cors',
        credentials: 'omit'
      });

      if (!res.ok) {
        // Try to get error details from response
        let errorMessage = 'Analysis failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      // Check if we got a valid score
      if (data?.final_score != null && data.final_score > 0) {
        setAnalyzing(false);
        toast.success("Analysis complete!");
        // Navigate to results page with the data
        navigate(`/results?url=${encodeURIComponent(validatedUrl)}`, { state: { analysisData: data } });
      } else {
        // If score is 0 or null, still navigate but ResultsPage will poll
        setAnalyzing(false);
        navigate(`/results?url=${encodeURIComponent(validatedUrl)}`);
      }
    } catch (error) {
      setAnalyzing(false);
      toast.error(error.message || "Failed to analyze blog");
    }
  };

  const exampleSites = [
    { name: "Food Blog", url: "minimalistbaker.com" },
    { name: "Portfolio", url: "brittanychiang.com" },
    { name: "Tech Blog", url: "joshwcomeau.com" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-yellow-50 relative overflow-hidden">
      {/* Navigation */}
      <Navbar />
      
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient blobs with morph animation */}
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-gradient-to-br from-green-400/40 to-emerald-500/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-gradient-to-bl from-lime-400/30 to-green-400/40 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-emerald-300/20 to-lime-300/20 rounded-full blur-3xl animate-pulse-slow" />
        
        {/* Falling kiwis instead of particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl animate-fall"
            style={{
              left: Math.random() * 100 + '%',
              top: '-100px',
              animationDelay: (Math.random() * 8 - 2) + 's',
              animationDuration: (Math.random() * 4 + 6) + 's',
              opacity: Math.random() * 0.4 + 0.3,
            }}
          >
            🥝
          </div>
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-3xl w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-xl rounded-full border border-green-200/60 mb-6 shadow-sm">
              <span className="text-lg">🥝</span>
              <span className="text-sm font-semibold text-green-900">Free Blog Analysis</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-700 via-emerald-600 to-lime-600 bg-clip-text text-transparent leading-relaxed pb-3">
              Analyze Your Blog
            </h1>
            
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Get instant insights on content quality, UX, and performance
            </p>
          </div>

          {/* Main Input Card with 3D effect */}
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl border border-green-200/50 p-8 md:p-12 shadow-2xl mb-8 relative overflow-hidden group hover:shadow-green-200/50 transition-all duration-500 hover:scale-[1.02]">
            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
            
            {/* Glow border effect */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-green-400 via-emerald-400 to-lime-400 rounded-3xl opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500" />
            <div className="space-y-6">
              {/* URL Input */}
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Blog URL
                </label>
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  
                  <input
                    type="text"
                    value={url}
                    onChange={handleUrlChange}
                    onKeyPress={handleKeyPress}
                    placeholder="example.com or https://example.com"
                    className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-green-200 focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-100 transition-all duration-300 text-lg hover:border-green-300 hover:shadow-lg hover:shadow-green-100/50"
                    disabled={analyzing}
                  />
                  
                  {validUrl !== null && !analyzing && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {validUrl ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                
                {validUrl === false && (
                  <p className="text-sm text-red-500 mt-2">Please enter a valid URL</p>
                )}
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={!validUrl || analyzing}
                className="group w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-3">
                    <Loader className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Search className="w-5 h-5" />
                    Analyze Blog
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-lime-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{backgroundSize: '200% 100%', animation: 'gradient 3s ease infinite'}} />
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-green-400 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition-opacity duration-300" />
                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000" />
                </div>
              </button>
            </div>
          </div>

          {/* Example Sites */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Try an example:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {exampleSites.map((site, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setUrl(site.url);
                    validateUrl(site.url);
                  }}
                  className="px-4 py-2 bg-white/70 backdrop-blur-xl border border-green-200 rounded-xl text-sm font-medium text-gray-700 hover:border-green-500 hover:bg-white transition-all duration-300 hover:scale-105"
                >
                  {site.name}
                </button>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-16 grid md:grid-cols-3 gap-4">
            {[
              { title: "200+ Metrics", desc: "Comprehensive analysis" },
              { title: "Instant Results", desc: "Under 60 seconds" },
              { title: "Actionable Tips", desc: "Prioritized recommendations" }
            ].map((item, i) => (
              <div key={i} className="group p-6 bg-white/70 backdrop-blur-xl rounded-2xl border border-green-200/40 text-center shadow-sm hover:shadow-lg hover:shadow-green-100/50 hover:scale-105 transition-all duration-300 hover:bg-white/90 relative overflow-hidden">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-green-600 mb-2 group-hover:scale-110 transition-transform duration-300">{item.title}</div>
                  <div className="text-sm text-gray-600">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Overlay */}
      {analyzing && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
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
            
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Analyzing Your Blog</h3>
            <p className="text-gray-600 mb-6">This may take a moment...</p>
            
            <div className="space-y-3">
              {["Content Quality", "User Experience", "Performance", "Accessibility"].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyzePage;
