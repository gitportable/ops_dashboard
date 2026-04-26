import api from "./axios";
export const getUsers = () => api.get("/users").then((r) => r.data);
export const getUserById = (id) => api.get(`/users/${id}`).then((r) => r.data);
export const createUser = (data) => api.post("/users", data).then((r) => r.data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);
export const getUsersByRole = (role) => api.get("/users", { params: { role } }).then((r) => r.data);
export default api;











// import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/users'; // Adjust this to your actual backend port

// // Add the token to every request if it exists in localStorage
// const api = axios.create({
//     baseURL: 'http://localhost:5000/api'
// });

// api.interceptors.request.use((config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
// });

// export const getUsers = () => api.get('/users');
// export default api;