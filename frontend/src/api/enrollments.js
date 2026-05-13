import client from './client';

export const enroll = (courseId) =>
  client.post('/api/enrollments', { courseId }).then((r) => r.data.enrollment);
export const myEnrollments = () =>
  client.get('/api/enrollments/me').then((r) => r.data.courses);
