import Note from "../models/Note.js";

// helper to check ownership
const checkOwnership = (note, userId) => {
  if (!note.user) return false;
  return note.user.toString() === userId.toString();
};

export async function getAllNotes(req, res) {
  try {
    // only return notes that belong to the authenticated user
    const notes = await Note.find({ user: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    console.error("Error in getAllNotes controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getNoteById(req, res) {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found!" });

    // check ownership
    if (!checkOwnership(note, req.userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(note);
  } catch (error) {
    console.error("Error in getNoteById controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createNote(req, res) {
  try {
    const { title, content } = req.body;
    // create note owned by the authenticated user
    const note = new Note({ title, content, user: req.userId });

    const savedNote = await note.save();
    res.status(201).json(savedNote);
  } catch (error) {
    console.error("Error in createNote controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateNote(req, res) {
  try {
    const { title, content } = req.body;
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (!checkOwnership(note, req.userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    note.title = title;
    note.content = content;
    const updatedNote = await note.save();

    res.status(200).json(updatedNote);
  } catch (error) {
    console.error("Error in updateNote controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteNote(req, res) {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (!checkOwnership(note, req.userId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Use findOneAndDelete to ensure deletion happens via model method
    const deleted = await Note.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) {
      // determine whether the note existed (but belonged to another user) or didn't exist at all
      const exists = await Note.findById(req.params.id);
      if (!exists) return res.status(404).json({ message: "Note not found" });
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ message: "Note deleted successfully!" });
  } catch (error) {
    console.error("Error in deleteNote controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
