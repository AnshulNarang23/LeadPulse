const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');

exports.addNote = async (req, res) => {
  try {
    const leadId = req.params.id;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Note text cannot be empty.' });
    }

    const note = new Note({
      leadId,
      authorId: req.user.id,
      text: text.trim()
    });

    await note.save();

    await ActivityLog.create({
      leadId,
      action: 'note_added',
      actorId: req.user.id,
      details: { noteSnippet: text.length > 50 ? text.substring(0, 50) + '...' : text },
      timestamp: new Date()
    });

    const populatedNote = await Note.findById(note._id).populate('authorId', 'name email role');

    return res.status(201).json({
      message: 'Note added successfully',
      note: populatedNote
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error adding note.', error: err.message });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const leadId = req.params.id;
    const notes = await Note.find({ leadId })
      .populate('authorId', 'name email role')
      .sort({ timestamp: -1 });

    return res.status(200).json({ notes });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching notes.', error: err.message });
  }
};
