import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Clock, MessageSquare, ShieldAlert, Trash2, CheckCircle2, UserCheck } from 'lucide-react';

export const LeadModal = ({ lead, users, onClose, onUpdate, onDelete }) => {
  const { user, isAdmin } = useAuth();

  const isAssignedToCurrentUser = lead.assignedTo && (
    typeof lead.assignedTo === 'object' 
      ? lead.assignedTo._id === user?.id 
      : lead.assignedTo === user?.id
  );

  const canModifyLead = isAdmin || isAssignedToCurrentUser;

  const [status, setStatus] = useState(lead.status);
  const [assignedTo, setAssignedTo] = useState(
    lead.assignedTo ? (typeof lead.assignedTo === 'object' ? lead.assignedTo._id : lead.assignedTo) : ''
  );
  
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'activity'
  
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchNotesAndActivity();
  }, [lead._id]);

  const fetchNotesAndActivity = async () => {
    setLoadingNotes(true);
    try {
      const [notesRes, activityRes] = await Promise.all([
        api.getNotes(lead._id),
        api.getActivity(lead._id)
      ]);
      setNotes(notesRes.notes || []);
      setActivity(activityRes.activity || []);
    } catch (err) {
      console.error('Error fetching lead notes or activity:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setError('');
    setSuccess('');
    setSavingStatus(true);

    try {
      const updated = await api.updateLead(lead._id, { status: newStatus });
      setSuccess('Lead status updated!');
      onUpdate(updated.lead);
      fetchNotesAndActivity();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
      setStatus(lead.status); // revert
    } finally {
      setSavingStatus(false);
    }
  };

  const handleReassign = async (e) => {
    const newAssignedTo = e.target.value;
    setAssignedTo(newAssignedTo);
    setError('');
    setSuccess('');

    try {
      const updated = await api.updateLead(lead._id, { assignedTo: newAssignedTo });
      setSuccess('Lead reassigned successfully!');
      onUpdate(updated.lead);
      fetchNotesAndActivity();
    } catch (err) {
      setError(err.message || 'Failed to reassign lead.');
      setAssignedTo(lead.assignedTo ? (typeof lead.assignedTo === 'object' ? lead.assignedTo._id : lead.assignedTo) : '');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setError('');
    setSuccess('');
    setSavingNote(true);

    try {
      const noteRes = await api.addNote(lead._id, newNote);
      setNotes([noteRes.note, ...notes]);
      setNewNote('');
      setSuccess('Note added!');
      fetchNotesAndActivity();
    } catch (err) {
      setError(err.message || 'Failed to add note.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.deleteLead(lead._id);
      onDelete(lead._id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete lead.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{lead.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {lead.company ? `${lead.company} • ` : ''}{lead.email}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Permission Warning Banner for Members */}
        {!canModifyLead && (
          <div className="alert alert-error" style={{ marginBottom: '1.2rem', fontSize: '0.85rem' }}>
            <ShieldAlert size={16} />
            <span>Read-Only: You can only update status and add notes to leads assigned to you.</span>
          </div>
        )}

        {/* Lead Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Lead Status</label>
            <select 
              className="form-select"
              value={status}
              onChange={handleStatusChange}
              disabled={!canModifyLead || savingStatus}
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {isAdmin && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assignee (Admin Only)</label>
              <select 
                className="form-select"
                value={assignedTo}
                onChange={handleReassign}
              >
                <option value="">-- Unassigned --</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tabs: Notes & Activity */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.2rem' }}>
          <button 
            className={`btn btn-sm ${activeTab === 'notes' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('notes')}
          >
            <MessageSquare size={14} />
            <span>Notes ({notes.length})</span>
          </button>

          <button 
            className={`btn btn-sm ${activeTab === 'activity' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('activity')}
          >
            <Clock size={14} />
            <span>Activity Trail ({activity.length})</span>
          </button>
        </div>

        {/* Tab Content: Notes */}
        {activeTab === 'notes' && (
          <div>
            {canModifyLead ? (
              <form onSubmit={handleAddNote} style={{ marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <textarea
                    className="form-textarea"
                    placeholder="Type internal note here..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingNote}>
                  {savingNote ? 'Adding...' : 'Add Note'}
                </button>
              </form>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', fontStyle: 'italic' }}>
                Adding notes disabled (lead not assigned to you).
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {notes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No notes recorded yet.
                </p>
              ) : (
                notes.map(n => (
                  <div key={n._id} style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
                      <strong style={{ color: 'var(--primary)' }}>{n.authorId?.name || 'Unknown Staff'}</strong>
                      <span style={{ color: 'var(--text-dim)' }}>{new Date(n.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', whitespace: 'pre-wrap' }}>{n.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Activity */}
        {activeTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activity.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                No activity logged.
              </p>
            ) : (
              activity.map(act => (
                <div key={act._id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                  <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.35rem', borderRadius: 'var(--radius-full)' }}>
                    <Clock size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ textTransform: 'capitalize' }}>
                        {act.action.replace('_', ' ')}
                      </strong>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Actor: {act.actorId ? act.actorId.name : 'Public Form System'}
                      {act.details ? ` (${JSON.stringify(act.details)})` : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Admin Delete Action */}
        {isAdmin && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleDelete} className="btn btn-danger btn-sm">
              <Trash2 size={14} />
              <span>Delete Lead (Admin Only)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
