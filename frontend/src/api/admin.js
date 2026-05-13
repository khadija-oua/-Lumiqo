import client from './client';

export const listUsers = () => client.get('/api/admin/users').then((r) => r.data.users);

export const setRole = (id, role) =>
  client.patch(`/api/admin/users/${id}/role`, { role }).then((r) => r.data.user);

export const deleteUser = (id) =>
  client.delete(`/api/admin/users/${id}`).then((r) => r.data);
