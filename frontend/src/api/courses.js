import client from './client';

export const listCourses = () => client.get('/api/courses').then((r) => r.data.courses);
export const getCourse = (id) => client.get(`/api/courses/${id}`).then((r) => r.data.course);
export const createCourse = (body) => client.post('/api/courses', body).then((r) => r.data.course);
export const updateCourse = (id, body) =>
  client.put(`/api/courses/${id}`, body).then((r) => r.data.course);
export const deleteCourse = (id) => client.delete(`/api/courses/${id}`).then((r) => r.data);
export const listCourseStudents = (id) =>
  client.get(`/api/courses/${id}/students`).then((r) => r.data.students);
