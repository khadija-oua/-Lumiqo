import client from './client';

export const getQuestions = () =>
  client.get('/api/vark/questions').then((r) => r.data.questions);

export const submit = (responses) =>
  client.post('/api/vark/submit', { responses }).then((r) => r.data);

export const myProfile = () => client.get('/api/vark/me').then((r) => r.data.profile);

export const studentProfile = (studentId) =>
  client.get(`/api/vark/student/${studentId}`).then((r) => r.data);
