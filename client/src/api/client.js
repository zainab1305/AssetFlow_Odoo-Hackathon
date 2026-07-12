const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const request = async (path, options = {}) => {
  const token = localStorage.getItem('assetflow_token');
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    error.field = data.field;
    throw error;
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
  deleteAsset: (id) => request(`/assets/${id}`, { method: 'DELETE' }),
  assetHistory: (id, payload) => request(`/assets/${id}/history`, { method: 'POST', body: JSON.stringify(payload) }),
  assetAllocations: (id) => request(`/assets/${id}/allocations`),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/upload', { method: 'POST', body: formData });
  },
  allocations: () => request('/allocations'),
  createAllocation: (payload) => request('/allocations', { method: 'POST', body: JSON.stringify(payload) }),
  returnAllocation: (id, payload = {}) => request(`/allocations/${id}/return`, { method: 'PATCH', body: JSON.stringify(payload) }),
  transferRequests: () => request('/allocations/transfer-requests'),
  createTransferRequest: (payload) => request('/allocations/transfer-request', { method: 'POST', body: JSON.stringify(payload) }),
  approveTransferRequest: (id) => request(`/allocations/transfer-requests/${id}/approve`, { method: 'PATCH' }),
  rejectTransferRequest: (id) => request(`/allocations/transfer-requests/${id}/reject`, { method: 'PATCH' }),
  bookings: () => request('/bookings'),
  createBooking: (payload) => request('/bookings', { method: 'POST', body: JSON.stringify(payload) }),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, { method: 'PATCH' }),
  rescheduleBooking: (id, payload) => request(`/bookings/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify(payload) }),
  maintenance: (query = '') => request(`/maintenance${query}`),
  maintenanceById: (id) => request(`/maintenance/${id}`),
  createMaintenance: (payload) => request('/maintenance', { method: 'POST', body: JSON.stringify(payload) }),
  approveMaintenance: (id) => request(`/maintenance/${id}/approve`, { method: 'PATCH' }),
  rejectMaintenance: (id) => request(`/maintenance/${id}/reject`, { method: 'PATCH' }),
  assignTechnician: (id, payload) => request(`/maintenance/${id}/assign-technician`, { method: 'PATCH', body: JSON.stringify(payload) }),
  startMaintenance: (id) => request(`/maintenance/${id}/start`, { method: 'PATCH' }),
  resolveMaintenance: (id, payload = {}) => request(`/maintenance/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(payload) }),
  audits: () => request('/audits'),
  createAudit: (payload) => request('/audits', { method: 'POST', body: JSON.stringify(payload) }),
  getAuditCycle: (id) => request(`/audits/${id}`),
  verifyAuditItem: (itemId, payload) => request(`/audits/verify/${itemId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getAuditDiscrepancies: (cycleId) => request(`/audits/${cycleId}/discrepancies`),
  getAuditProgress: () => request('/audits/progress/summary'),
  closeAuditCycle: (cycleId) => request(`/audits/${cycleId}/close`, { method: 'PATCH' }),
  reports: () => request('/reports/summary'),
  notifications: () => request('/notifications'),
  readNotification: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () => request('/notifications/read-all', { method: 'PATCH' }),
};

export { BASE_URL };