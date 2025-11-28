import { Link, useLocation } from "react-router";
import { Menu, X, LogOut, LogIn, Search } from "lucide-react";
import { useState, useEffect } from "react";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-green-100' 
        : 'bg-white/80 backdrop-blur-md border-b border-green-100/50'
    }`}>
      {/* Decorative gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-600 via-emerald-500 to-lime-500" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <Link 
            to="/" 
            className="flex items-center gap-2 group"
          >
            <div className="relative">
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
              <div className="relative text-2xl transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                🥝
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-lime-600 bg-clip-text text-transparent font-sans tracking-tight group-hover:tracking-wide transition-all duration-300">
              Kiwi
            </h1>
            {/* Underline animation */}
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-green-600 to-emerald-600 group-hover:w-full transition-all duration-300" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              to="/analyze"
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 overflow-hidden group ${
                isActive("/analyze")
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30 scale-105"
                  : "hover:bg-green-50 hover:scale-105"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-emerald-600 to-lime-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive("/analyze") ? "hidden" : ""}`} />
              <Search className={`size-4 relative z-10 ${isActive("/analyze") ? "" : "group-hover:text-white"}`} />
              <span className={`font-semibold relative z-10 ${isActive("/analyze") ? "" : "group-hover:text-white"}`}>Analyze</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-3 ml-2">
                <div className="px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
                  <span className="text-sm font-medium text-green-700">👋 Hi, {user.name}!</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-all duration-300 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  <LogOut className="size-4 text-red-600 relative z-10 group-hover:rotate-12 transition-transform" />
                  <span className="font-medium text-red-600 relative z-10">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 ml-2 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-lime-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <LogIn className="size-4 relative z-10" />
                <span className="font-semibold relative z-10">Login</span>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-green-50 transition-all duration-300 group"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="size-6 text-green-600 group-hover:rotate-90 transition-transform duration-300" />
            ) : (
              <Menu className="size-6 text-green-600 group-hover:scale-110 transition-transform duration-300" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? "max-h-64 opacity-100 mb-4" : "max-h-0 opacity-0"
          }`}
        >
          <nav className="flex flex-col gap-2 py-2">
            <Link
              to="/analyze"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 overflow-hidden group ${
                isActive("/analyze")
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30"
                  : "hover:bg-green-50"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-emerald-600 to-lime-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive("/analyze") ? "hidden" : ""}`} />
              <Search className={`size-5 relative z-10 ${isActive("/analyze") ? "" : "group-hover:text-white"}`} />
              <span className={`font-semibold relative z-10 ${isActive("/analyze") ? "" : "group-hover:text-white"}`}>Analyze</span>
            </Link>

            {user ? (
              <>
                <div className="px-4 py-2.5 bg-green-50 rounded-xl border border-green-200">
                  <span className="text-sm font-medium text-green-700">👋 Logged in as {user.name}</span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="relative flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-all duration-300 group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  <LogOut className="size-5 text-red-600 relative z-10" />
                  <span className="font-medium text-red-600 relative z-10">Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30 transition-all duration-300 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-lime-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <LogIn className="size-5 relative z-10" />
                <span className="font-semibold relative z-10">Login</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
