import client from './client';

export const getQuiz = (id) => client.get(`/api/quizzes/${id}`).then((r) => r.data.quiz);
export const listCourseQuizzes = (courseId) =>
  client.get(`/api/courses/${courseId}/quizzes`).then((r) => r.data.quizzes);
export const startAttempt = (quizId) =>
  client.post(`/api/quizzes/${quizId}/start`).then((r) => r.data);
