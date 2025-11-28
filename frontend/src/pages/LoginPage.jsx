import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, User, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios";
import useAuthStore from "../store/authStore";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageContainer, { ContentCard } from "../components/PageContainer";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      setAuth(res.data, res.data.token);
      toast.success("Welcome back!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <PageContainer variant="default" maxWidth="sm">
        <ContentCard>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-base-200">
              <Sparkles className="size-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-base-content">Welcome Back</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-base-content/80 flex items-center gap-2">
                <Mail className="size-4" />
                Email
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl bg-base-200 border border-primary/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-base-content/80 flex items-center gap-2">
                <Lock className="size-4" />
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-base-200 border border-primary/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-content font-semibold hover:opacity-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-base-content/70">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </ContentCard>
      </PageContainer>
      <Footer />
    </>
  );
};

export default LoginPage;
