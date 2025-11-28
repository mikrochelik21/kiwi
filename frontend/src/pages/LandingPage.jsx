import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ArrowDown, Sparkles, PlusIcon, BookOpen, Lock, Zap, Heart } from "lucide-react";
import useAuthStore from "../store/authStore";

const LandingPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    
    // Trigger content reveal after logo animation
    const timer = setTimeout(() => setShowContent(true), 2000);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Hero Section - Full screen */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="text-center z-10 px-4">
          {/* Animated Logo Reveal */}
          <div className="mb-8 animate-fade-in-scale">
            <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-xl rounded-3xl px-8 py-6 border border-white/10 shadow-2xl">
              <Sparkles className="w-12 h-12 text-cyan-400 animate-spin-slow" />
              <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                Simar is Gay
              </h1>
            </div>
          </div>

          {/* Tagline with stagger animation */}
          <p className={`text-2xl md:text-4xl font-light mb-12 transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            We all know, <span className="text-cyan-400 font-semibold">just dont care</span>
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {user ? (
              <Link
                to="/"
                className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-cyan-500/50"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  My Notes
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-cyan-500/50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Get Started Free
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm rounded-full font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                >
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Scroll Indicator */}
          <div className={`mt-20 animate-bounce transition-all duration-1000 delay-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
            <ArrowDown className="w-8 h-8 mx-auto text-cyan-400" />
            <p className="text-sm text-cyan-400/70 mt-2">Scroll to explore</p>
          </div>
        </div>

        {/* Parallax grid background */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            transform: `translateY(${scrollY * 0.5}px)`
          }}
        />
      </section>

      {/* Features Section - Scroll-triggered reveals */}
      <section className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 
            className="text-5xl md:text-6xl font-bold text-center mb-20 bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent"
            style={{
              opacity: Math.min(1, (scrollY - 300) / 300),
              transform: `translateY(${Math.max(0, 100 - (scrollY - 300) / 3)}px)`
            }}
          >
            Why ThinkBoard?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-12 h-12" />,
                title: "Lightning Fast",
                description: "Create and access your notes instantly. No delays, no friction.",
                color: "from-yellow-400 to-orange-400",
                delay: 0
              },
              {
                icon: <Lock className="w-12 h-12" />,
                title: "Secure & Private",
                description: "Your thoughts are encrypted and protected. Only you have access.",
                color: "from-green-400 to-emerald-400",
                delay: 50
              },
              {
                icon: <PlusIcon className="w-12 h-12" />,
                title: "Beautifully Simple",
                description: "Clean interface that gets out of your way. Focus on what matters.",
                color: "from-cyan-400 to-blue-400",
                delay: 100
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative transform transition-all duration-700"
                style={{
                  opacity: Math.min(1, (scrollY - 400 - feature.delay) / 200),
                  transform: `translateY(${Math.max(0, 50 - (scrollY - 400 - feature.delay) / 4)}px) scale(${Math.min(1, 0.9 + (scrollY - 400 - feature.delay) / 2000)})`
                }}
              >
                <div className="relative h-full p-8 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-500 hover:scale-105 hover:bg-white/10 hover:shadow-2xl">
                  {/* Gradient glow on hover */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`} />
                  
                  <div className={`relative mb-4 inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    {feature.icon}
                  </div>
                  
                  <h3 className="relative text-2xl font-bold mb-4 group-hover:text-cyan-300 transition-colors duration-300">{feature.title}</h3>
                  <p className="relative text-white/70 group-hover:text-white/90 transition-colors duration-300">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div
            style={{
              opacity: Math.min(1, (scrollY - 1000) / 300),
              transform: `translateY(${Math.max(0, 100 - (scrollY - 1000) / 3)}px)`
            }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Start Your Journey
            </h2>
            <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">
              Join thousands who've transformed the way they capture and organize their thoughts
            </p>
            
            <div className="relative inline-block">
              {/* Animated card preview */}
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 hover:border-cyan-400/50 transition-all duration-500 hover:scale-105">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl animate-pulse-slow" />
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl animate-pulse-slow" />
                
                <div className="relative space-y-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500" />
                    <div>
                      <div className="h-3 w-32 bg-white/20 rounded-full" />
                      <div className="h-2 w-20 bg-white/10 rounded-full mt-2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-white/20 rounded-full" />
                    <div className="h-4 bg-white/15 rounded-full w-4/5" />
                    <div className="h-4 bg-white/10 rounded-full w-3/5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div
            style={{
              opacity: Math.min(1, (scrollY - 1500) / 300),
            }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              Ready to get started?
            </h2>
            {!user && (
              <Link
                to="/register"
                className="inline-flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full font-bold text-xl hover:scale-110 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/50"
              >
                <Sparkles className="w-6 h-6" />
                Create Free Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <span className="text-xl font-bold">ThinkBoard</span>
          </div>
          <p className="text-white/50 text-sm mb-2">
            © 2025 ThinkBoard. Organize your thoughts beautifully.
          </p>
          <p className="text-white/50 text-sm flex items-center justify-center gap-2">
            Made with <Heart className="size-4 text-red-500 animate-heartbeat" fill="currentColor" /> by developers for TOMfoolery hackathon
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
