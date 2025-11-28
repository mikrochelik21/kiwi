import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router';

/**
 * Floating Action Button (FAB) with ripple effect
 * Provides quick access to analysis from anywhere
 */
const FloatingAnalyzeButton = () => {
  const [ripples, setRipples] = useState([]);

  const createRipple = (e) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = {
      x,
      y,
      size,
      id: Date.now()
    };

    setRipples([...ripples, newRipple]);

    setTimeout(() => {
      setRipples(ripples => ripples.filter(r => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <Link
      to="/analyze"
      onClick={createRipple}
      className="fixed bottom-8 right-8 z-50 group"
      style={{ animation: 'fadeIn 1s ease-out 2s backwards' }}
    >
      {/* Glow effect */}
      <div className="absolute -inset-3 bg-gradient-to-r from-green-400 via-emerald-400 to-lime-400 rounded-full blur-lg opacity-40 group-hover:opacity-70 animate-pulse-slow transition-opacity" />
      
      {/* Main button */}
      <div className="relative w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full shadow-2xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-all duration-300 cursor-pointer">
        {/* Ripple effects */}
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute bg-white/30 rounded-full animate-ping"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
        
        {/* Icon */}
        <Sparkles className="w-7 h-7 text-white relative z-10 group-hover:rotate-12 transition-transform" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </div>
      
      {/* Tooltip */}
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
        Analyze Blog
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-8 border-transparent border-l-gray-900" />
      </div>
    </Link>
  );
};

export default FloatingAnalyzeButton;
