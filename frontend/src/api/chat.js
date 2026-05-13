import client from './client';

export const sendMessage = (payload) =>
  client.post('/api/chat/message', payload).then((r) => r.data);

export const listSessions = () =>
  client.get('/api/chat/sessions').then((r) => r.data.sessions);

export const getSession = (id) =>
  client.get(`/api/chat/sessions/${id}`).then((r) => r.data.session);

export const deleteSession = (id) =>
  client.delete(`/api/chat/sessions/${id}`).then((r) => r.data);
