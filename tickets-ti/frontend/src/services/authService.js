import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  register: (data) => api.post('/auth/register', data).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data),
  changePassword: (data) => api.put('/auth/change-password', data).then((r) => r.data),
};
