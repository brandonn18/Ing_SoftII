import api from './api';

export const ticketService = {
  // getAll devuelve el envelope completo { data, meta } porque useTickets lo necesita
  getAll: (params) => api.get('/tickets', { params }).then((r) => r.data),
  getById: (id) => api.get(`/tickets/${id}`).then((r) => r.data.data),
  create: (data) => api.post('/tickets', data).then((r) => r.data.data),
  update: (id, data) => api.put(`/tickets/${id}`, data).then((r) => r.data.data),
  updateStatus: (id, estado, comentario) =>
    api.patch(`/tickets/${id}/status`, { estado, comentario }).then((r) => r.data.data),
  assign: (id, tecnicoId) => api.post(`/tickets/${id}/assign`, { tecnicoId }).then((r) => r.data.data),
  reopen: (id, motivo_reapertura) => api.post(`/tickets/${id}/reopen`, { motivo_reapertura }).then((r) => r.data.data),
  delete: (id) => api.delete(`/tickets/${id}`).then((r) => r.data),
};
