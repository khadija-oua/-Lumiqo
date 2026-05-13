import client from './client';

export const listMaterials = (courseId) =>
  client.get(`/api/courses/${courseId}/materials`).then((r) => r.data.materials);

export const uploadMaterial = (courseId, file, title, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  form.append('title', title);
  return client
    .post(`/api/courses/${courseId}/materials`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    })
    .then((r) => r.data.material);
};

export const deleteMaterial = (id) =>
  client.delete(`/api/materials/${id}`).then((r) => r.data);

export const downloadMaterial = (id) =>
  client.get(`/api/materials/${id}/download`, { responseType: 'blob' }).then((r) => r.data);

export const generateQuizFromMaterial = (id, body) =>
  client.post(`/api/materials/${id}/generate-quiz`, body).then((r) => r.data.quiz);
