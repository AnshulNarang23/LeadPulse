import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LeadModal } from '../components/LeadModal';
import { CreateLeadModal } from '../components/CreateLeadModal';
import { Filter, Plus, ChevronLeft, ChevronRight, User, Layers, RefreshCw } from 'lucide-react';

export const DashboardPage = () => {
  const { user, isAdmin } = useAuth();

  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
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

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Lead Pipeline Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Logged in as <strong style={{ color: 'var(--text-main)' }}>{user?.name}</strong> ({user?.role})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchLeads} title="Refresh">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>Create Internal Lead</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
          <Filter size={16} />
          <span>FILTERS:</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1 }}>
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '160px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
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
            style={{ width: 'auto', minWidth: '180px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
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

      {/* Lead Data Table */}
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

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', padding: '0 0.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages || 1}</strong> ({pagination.total} total leads)
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <button 
            className="btn btn-secondary btn-sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            <span>Next</span>
            <ChevronRight size={16} />
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
