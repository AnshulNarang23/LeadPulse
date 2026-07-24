const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const api = {
  // Auth
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Public Lead Capture
  captureLead: async (leadData) => {
    const res = await fetch(`${API_BASE}/leads/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData)
    });
    return handleResponse(res);
  },

  // Leads
  getLeads: async ({ page = 1, limit = 10, status = '', assignedTo = '' } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    if (assignedTo) params.append('assignedTo', assignedTo);

    const res = await fetch(`${API_BASE}/leads?${params.toString()}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getLeadById: async (id) => {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  createLead: async (leadData) => {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(leadData)
    });
    return handleResponse(res);
  },

  updateLead: async (id, updateData) => {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  deleteLead: async (id) => {
    const res = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Notes & Activity
  getNotes: async (leadId) => {
    const res = await fetch(`${API_BASE}/leads/${leadId}/notes`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  addNote: async (leadId, text) => {
    const res = await fetch(`${API_BASE}/leads/${leadId}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
    return handleResponse(res);
  },

  getActivity: async (leadId) => {
    const res = await fetch(`${API_BASE}/leads/${leadId}/activity`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Users (Admin only)
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  createUser: async (userData) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  }
};
