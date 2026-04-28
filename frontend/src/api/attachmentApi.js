import api from "./axios";

export const getAttachments = (issueId) => api.get(`/attachments/issue/${issueId}`);

export const deleteAttachment = (id) => api.delete(`/attachments/${id}`);

export const uploadAttachment = (issueId, file) => {
  const formData = new FormData();
  formData.append("image", file);
  return api.post(`/attachments/issue/${issueId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
