import client from './client';

export const answer = (attemptId, questionId, selectedAnswerId) =>
  client
    .post(`/api/attempts/${attemptId}/answer`, { questionId, selectedAnswerId })
    .then((r) => r.data);

export const result = (attemptId) =>
  client.get(`/api/attempts/${attemptId}/result`).then((r) => r.data);
