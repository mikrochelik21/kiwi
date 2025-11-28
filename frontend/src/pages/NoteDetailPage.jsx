import { useEffect } from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { ArrowLeftIcon, LoaderIcon, Trash2Icon, Save } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageContainer, { ContentCard } from "../components/PageContainer";

const NoteDetailPage = () => {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const { id } = useParams();

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await api.get(`/notes/${id}`);
        setNote(res.data);
      } catch (error) {
        console.log("Error in fetching note", error);
        toast.error("Failed to fetch the note");
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      await api.delete(`/notes/${id}`);
      toast.success("Note deleted");
      navigate("/");
    } catch (error) {
      console.log("Error deleting the note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleSave = async () => {
    if (!note.title.trim() || !note.content.trim()) {
      toast.error("Please add a title or content");
      return;
    }

    setSaving(true);

    try {
      await api.put(`/notes/${id}`, note);
      toast.success("Note updated successfully");
      navigate("/");
    } catch (error) {
      console.log("Error saving the note:", error);
      toast.error("Failed to update note");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <LoaderIcon className="animate-spin size-10 text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer variant="default" maxWidth="xl">
          <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-base-300 transition-all duration-300 group">
            <ArrowLeftIcon className="size-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span>Back to Notes</span>
          </Link>
          <button 
            onClick={handleDelete} 
            className="px-4 py-2 rounded-lg bg-error/10 text-error hover:bg-error hover:text-error-content border border-error/20 hover:border-error transition-all duration-300 flex items-center gap-2"
          >
            <Trash2Icon className="size-5" />
            <span>Delete Note</span>
          </button>
        </div>

        <ContentCard>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-base-content/80">
                Title
              </label>
              <input
                type="text"
                placeholder="Note title"
                className="w-full px-4 py-3 rounded-xl bg-base-200 border border-primary/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                value={note.title}
                onChange={(e) => setNote({ ...note, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-base-content/80">
                Content
              </label>
              <textarea
                placeholder="Write your note here..."
                className="w-full px-4 py-3 rounded-xl bg-base-200 border border-primary/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300 min-h-[300px] resize-y"
                value={note.content}
                onChange={(e) => setNote({ ...note, content: e.target.value })}
              />
            </div>

              <div className="flex justify-end">
                <button 
                  className="px-6 py-3 rounded-xl bg-primary text-primary-content font-semibold hover:opacity-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" 
                  disabled={saving} 
                  onClick={handleSave}
                >
                  <Save className="size-5" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
          </div>
        </ContentCard>
      </PageContainer>
      <Footer />
    </>
  );
};
export default NoteDetailPage;
