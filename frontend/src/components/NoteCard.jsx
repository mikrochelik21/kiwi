import { PenSquareIcon, Trash2Icon } from "lucide-react";
import { Link } from "react-router";
import { formatDate } from "../lib/utils";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { useState } from "react";

const NoteCard = ({ note, setNotes }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = async (e, id) => {
    // prevent Link navigation and stop the click from bubbling
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      await api.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((note) => note._id !== id));
      toast.success("Note deleted successfully");
    } catch (error) {
      console.log("Error in handleDelete", error);
      toast.error("Failed to delete note");
    }
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <Link
      to={`/note/${note._id}`}
      className="group relative block p-6 rounded-2xl bg-gradient-to-br from-base-100 to-base-200/50 border border-base-200 hover:border-primary/30 transition-all duration-300 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered 
          ? `perspective(1000px) rotateX(${-mousePosition.y / 2}deg) rotateY(${mousePosition.x / 2}deg) translateY(-8px)` 
          : 'none',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out'
      }}
    >
      {/* Animated gradient border glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(30, 41, 59, 0.2))', filter: 'blur(10px)' }} />

      {/* Accent line */}
      <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to right, #2563EB, #06B6D4)' }} />

      <div className="relative space-y-4">
        <h3 className="text-xl font-semibold text-base-content group-hover:text-primary transition-colors duration-300 line-clamp-2">
          {note.title}
        </h3>
        <p className="text-base text-base-content/70 line-clamp-3 leading-relaxed">
          {note.content}
        </p>
        
        <div className="flex justify-between items-center pt-4 border-t border-base-200/50">
          <span className="text-xs text-base-content/50 flex items-center gap-2 font-medium">
            {formatDate(new Date(note.createdAt))}
          </span>
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-lg bg-base-200/70 text-base-content/60 hover:bg-primary/20 hover:text-primary hover:scale-110 transition-all duration-200" title="Edit">
              <PenSquareIcon className="size-4" />
            </button>
            <button type="button" className="p-2.5 rounded-lg bg-base-200/70 text-base-content/60 hover:bg-rose-100 hover:text-rose-600 hover:scale-110 transition-all duration-200" onClick={(e) => handleDelete(e, note._id)} title="Delete">
              <Trash2Icon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default NoteCard;
