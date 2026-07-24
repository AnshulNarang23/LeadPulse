import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LeadModal } from '../components/LeadModal';
import { CreateLeadModal } from '../components/CreateLeadModal';
import { Filter, Plus, ChevronLeft, ChevronRight, LayoutGrid, Table, RefreshCw, User } from 'lucide-react';

export const DashboardPage = () => {
  const { user, isAdmin } = useAuth();

  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedLead, setSelectedLead] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchLeads();
    if (isAdmin) {
      fetchUsers();
    }
  }, [pagination.page, statusFilter, assignedFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getLeads({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter,
        assignedTo: assignedFilter
      });
      setLeads(res.leads);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch lead pipeline.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err) {
      console.error('Error fetching users for admin:', err);
    }
  };

  const handleLeadUpdated = (updatedLead) => {
    setLeads(leads.map(l => l._id === updatedLead._id ? updatedLead : l));
    setSelectedLead(updatedLead);
  };

  const handleLeadDeleted = (deletedId) => {
    setLeads(leads.filter(l => l._id !== deletedId));
    setSelectedLead(null);
  };

  const handleLeadCreated = (newLead) => {
    setLeads([newLead, ...leads]);
  };

  // Group leads for Kanban view
  const stages = [
    { key: 'new', label: 'New Lead' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' }
  ];

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>Lead Pipeline Workspace</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Logged in as <strong style={{ color: 'var(--text-main)' }}>{user?.name}</strong> ({user?.role})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
            <button 
              className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setViewMode('kanban')}
              title="Kanban Board View"
            >
              <LayoutGrid size={14} />
              <span>Kanban</span>
            </button>
            <button 
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setViewMode('table')}
              title="Data Table View"
            >
              <Table size={14} />
              <span>Table</span>
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchLeads} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>
          <Filter size={14} />
          <span>FILTER:</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1 }}>
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '150px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '170px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
            value={assignedFilter}
            onChange={(e) => {
              setAssignedFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <option value="">All Assignments</option>
            <option value={user?.id}>Assigned to Me</option>
            <option value="unassigned">Unassigned Leads</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Kanban Board View (Signature Bigin.com element) */}
      {viewMode === 'kanban' && (
        <div className="kanban-board">
          {stages.map(stage => {
            const stageLeads = leads.filter(l => l.status === stage.key);
            return (
              <div key={stage.key} className="kanban-column">
                <div className="kanban-column-header">
                  <span className="kanban-column-title">
                    <span className={`status-badge ${stage.key}`} style={{ fontSize: '0.7rem' }}>
                      {stage.label}
                    </span>
                  </span>
                  <span className="kanban-count">{stageLeads.length}</span>
                </div>

                <div className="kanban-cards">
                  {stageLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--text-dim)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      No leads
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <div key={lead._id} className="kanban-card" onClick={() => setSelectedLead(lead)}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                          {lead.name}
                        </div>
                        {lead.company && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                            {lead.company}
                          </div>
                        )}
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                          {lead.email}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                          {lead.assignedTo ? (
                            <span style={{ fontWeight: 600, color: lead.assignedTo._id === user?.id ? 'var(--primary)' : 'var(--text-muted)' }}>
                              {lead.assignedTo.name}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                          <span style={{ color: 'var(--text-dim)' }}>
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Data Table View */}
      {viewMode === 'table' && (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead Name</th>
                <th>Company</th>
                <th>Status</th>
                <th>Assigned Staff</th>
                <th>Source</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading pipeline data...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLead(lead)}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{lead.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.email}</div>
                    </td>
                    <td>{lead.company || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                    <td>
                      <span className={`status-badge ${lead.status}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      {lead.assignedTo ? (
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: lead.assignedTo._id === user?.id ? 'var(--primary)' : 'var(--text-main)' }}>
                          {lead.assignedTo.name} {lead.assignedTo._id === user?.id ? '(You)' : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                        {lead.source.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.25rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages || 1}</strong> ({pagination.total} total leads)
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button 
            className="btn btn-secondary btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          <button 
            className="btn btn-secondary btn-sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Modals */}
      {selectedLead && (
        <LeadModal 
          lead={selectedLead} 
          users={users}
          onClose={() => setSelectedLead(null)} 
          onUpdate={handleLeadUpdated}
          onDelete={handleLeadDeleted}
        />
      )}

      {showCreateModal && (
        <CreateLeadModal 
          users={users}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleLeadCreated}
        />
      )}
    </div>
  );
};
