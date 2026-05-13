import client from './client';

export const login = (email, password) =>
  client.post('/api/auth/login', { email, password }).then((r) => r.data);

export const register = (payload) =>
  client.post('/api/auth/register', payload).then((r) => r.data);

export const me = () => client.get('/api/auth/me').then((r) => r.data.user);
