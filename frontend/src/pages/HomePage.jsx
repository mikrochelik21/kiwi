import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RateLimitedUI from "../components/RateLimitedUI";
import { useEffect } from "react";
import api from "../lib/axios";
import toast from "react-hot-toast";
import NoteCard from "../components/NoteCard";
import NotesNotFound from "../components/NotesNotFound";
import PageContainer, { GridContainer } from "../components/PageContainer";
import useAuthStore from "../store/authStore";

const HomePage = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchNotes = async () => {
      // If there's no token (logged out), clear notes and skip fetching
      if (!token) {
        setNotes([]);
        setIsRateLimited(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await api.get("/notes");
        setNotes(res.data);
        setIsRateLimited(false);
      } catch (error) {
        if (error.response?.status === 429) {
          setIsRateLimited(true);
        } else {
          toast.error("Failed to load notes");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [token]);

  return (
    <>
      <Navbar />
      
      <PageContainer variant="default" maxWidth="7xl">
        {isRateLimited && <RateLimitedUI />}

        {loading && <div className="text-center text-primary py-10">Loading notes...</div>}

        {notes.length === 0 && !isRateLimited && !loading && <NotesNotFound />}

        {notes.length > 0 && !isRateLimited && (
          <GridContainer columns={3} gap={6}>
            {notes.map((note) => (
              <NoteCard key={note._id} note={note} setNotes={setNotes} />
            ))}
          </GridContainer>
        )}
      </PageContainer>

      <Footer />
    </>
  );
};
export default HomePage;
