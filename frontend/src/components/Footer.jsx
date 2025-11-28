import { Github, Twitter, Linkedin, Mail, Heart, Sparkles } from "lucide-react";
import { Link } from "react-router";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Github, href: "https://github.com", label: "GitHub", color: "hover:text-purple-400" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter", color: "hover:text-blue-400" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn", color: "hover:text-blue-500" },
    { icon: Mail, href: "mailto:hello@thinkboard.com", label: "Email", color: "hover:text-red-400" }
  ];

  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "Create Note", href: "/create" },
    { label: "About", href: "#about" },
    { label: "Privacy", href: "#privacy" }
  ];

  return (
    <footer className="relative mt-20 border-t border-base-200 bg-base-100">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-8 text-primary" />
              <h2 className="text-2xl font-bold text-accent">Simar is gay</h2>
            </div>
            <p className="text-base-content/70 leading-relaxed max-w-sm">
              Capture your thoughts, organize your ideas, and bring your vision to life with our intuitive note-taking platform.
            </p>
            {/* Social Links */}
            <div className="flex gap-3 pt-2">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`p-2.5 rounded-lg bg-base-200 border border-primary/20 hover:border-primary hover:scale-110 hover:-translate-y-1 transition-all duration-300 ${social.color}`}
                  >
                    <Icon className="size-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-base-content">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-base-content/70 hover:text-primary hover:translate-x-2 inline-flex items-center gap-2 transition-all duration-300 group"
                  >
                    <span className="w-0 h-0.5 bg-primary group-hover:w-4 transition-all duration-300" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Section */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-base-content">Stay Updated</h3>
            <p className="text-base-content/70 text-sm mb-4">
              Get the latest updates and features delivered to your inbox.
            </p>
            <form className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="px-4 py-2.5 rounded-lg bg-base-200 border border-primary/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 placeholder:text-base-content/40"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-content font-semibold hover:opacity-95 transition-all duration-150"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-base-200 mb-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-base-content/60">
            © {currentYear} ????????. All rights reserved.
          </p>
          <p className="text-sm text-base-content/60 flex items-center gap-2">
            Made with <Heart className="size-4 text-red-500 animate-heartbeat" fill="currentColor" /> by developers for TOMfoolery hackathon
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
