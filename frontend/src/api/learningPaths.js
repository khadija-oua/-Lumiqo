import client from './client';

export const generate = (courseId) =>
  client.post('/api/learning-paths/generate', { courseId }).then((r) => r.data.path);

export const refresh = (courseId) =>
  client.post('/api/learning-paths/refresh', { courseId }).then((r) => r.data.path);

export const myPath = (courseId) =>
  client
    .get('/api/learning-paths/me', { params: { courseId } })
    .then((r) => r.data.path);
