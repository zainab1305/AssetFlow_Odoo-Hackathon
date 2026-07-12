const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const request = async (path, options = {}) => {
  const token = localStorage.getItem('assetflow_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const api = {
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  signup: (payload) => request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  dashboard: () => request('/dashboard/summary'),
  departments: () => request('/departments'),
  saveDepartment: (payload) => request('/departments', { method: 'POST', body: JSON.stringify(payload) }),
  updateDepartment: (id, payload) => request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteDepartment: (id) => request(`/departments/${id}`, { method: 'DELETE' }),
  assignDepartmentHead: (id, payload) => request(`/departments/${id}/head`, { method: 'PATCH', body: JSON.stringify(payload) }),
  categories: () => request('/categories'),
  saveCategory: (payload) => request('/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id, payload) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  employees: () => request('/employees'),
  updateEmployeeRole: (id, payload) => request(`/employees/${id}/role`, { method: 'PATCH', body: JSON.stringify(payload) }),
  assets: (query = '') => request(`/assets${query}`),
  assetById: (id) => request(`/assets/${id}`),
  saveAsset: (payload) => request('/assets', { method: 'POST', body: JSON.stringify(payload) }),
  updateAsset: (id, payload) => request(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  assetHistory: (id, payload) => request(`/assets/${id}/history`, { method: 'POST', body: JSON.stringify(payload) }),
  assetAllocations: (id) => request(`/assets/${id}/allocations`),
  allocations: () => request('/allocations'),
  createAllocation: (payload) => request('/allocations', { method: 'POST', body: JSON.stringify(payload) }),
  returnAllocation: (id) => request(`/allocations/${id}/return`, { method: 'POST' }),
  createTransferRequest: (payload) => request('/allocations/transfer-request', { method: 'POST', body: JSON.stringify(payload) }),
  bookings: () => request('/bookings'),
  createBooking: (payload) => request('/bookings', { method: 'POST', body: JSON.stringify(payload) }),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'PATCH' }),
  maintenance: () => request('/maintenance'),
  createMaintenance: (payload) => request('/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  approveMaintenance: (id) => request(`/maintenance/${id}/approve`, { method: 'PATCH' }),
  rejectMaintenance: (id) => request(`/maintenance/${id}/reject`, { method: 'PATCH' }),
  startMaintenance: (id) => request(`/maintenance/${id}/start`, { method: 'PATCH' }),
  resolveMaintenance: (id, payload = {}) => request(`/maintenance/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(payload) }),
  audits: () => request('/audits'),
  createAudit: (payload) => request('/audits', { method: 'POST', body: JSON.stringify(payload) }),
  updateAuditItems: (id, payload) => request(`/audits/${id}/items`, { method: 'PATCH', body: JSON.stringify(payload) }),
  auditReport: (id) => request(`/audits/${id}/report`),
  latestAudit: () => request('/audits/discrepancies/latest'),
  reports: () => request('/reports/summary'),
  notifications: () => request('/notifications'),
  readNotification: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () => request('/notifications/read-all', { method: 'PATCH' }),
};