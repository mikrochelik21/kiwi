import { ArrowLeftIcon, Sparkles } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router";
import api from "../lib/axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageContainer, { ContentCard } from "../components/PageContainer";

const CreatePage = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/notes", {
        title,
        content,
      });

      toast.success("Note created successfully!");
      navigate("/");
    } catch (error) {
      console.log("Error creating note", error);
      if (error.response.status === 429) {
        toast.error("Slow down! You're creating notes too fast", {
          duration: 4000,
          icon: "💀",
        });
      } else {
        toast.error("Failed to create note");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <PageContainer variant="default" maxWidth="xl">
        <Link to={"/"} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-base-300 transition-all duration-300 mb-6 group">
          <ArrowLeftIcon className="size-5 group-hover:-translate-x-1 transition-transform duration-300" />
          <span>Back to Notes</span>
        </Link>

        <ContentCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-base-200">
              <Sparkles className="size-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-base-content">Create New Note</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-base-content/80">
                Title
              </label>
              <input
                type="text"
                placeholder="Enter note title..."
                className="w-full px-4 py-3 rounded-xl bg-base-200 border border-primary/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-base-content/80">
                Content
              </label>
              <textarea
                placeholder="Write your note here..."
                className="w-full px-4 py-3 rounded-xl bg-base-200 border border-primary/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 min-h-[200px] resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <button 
                type="submit" 
                className="px-6 py-3 rounded-xl bg-primary text-primary-content font-semibold hover:opacity-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Note"}
              </button>
            </div>
          </form>
        </ContentCard>
      </PageContainer>
      <Footer />
    </>
  );
};
export default CreatePage;
