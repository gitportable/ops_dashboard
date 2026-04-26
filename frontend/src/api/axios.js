// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://localhost:5000/api",
// });

// api.interceptors.request.use((req) => {
//   const token = localStorage.getItem("token");
//   console.log("[Axios] Sending request to:", req.url);
//   console.log("[Axios] Token present?", !!token);
  
//   if (token) {
//     req.headers.Authorization = `Bearer ${token}`;
//   } else {
//     console.warn("[Axios] No token found in localStorage!");
//   }
//   return req;
// }, (error) => Promise.reject(error));

// export default api;

// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
});

// Add token to every request
api.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("[Axios] No token found in localStorage!");
  }
  return req;
}, (error) => Promise.reject(error));

// Handle 401 (unauthorized) globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("Unauthorized! Clearing token and redirecting to login...");
      localStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;



// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://localhost:5001/api",
// });

// // REQUEST: Sends the token to the server
// api.interceptors.request.use((req) => {
//   const token = localStorage.getItem("token");
//   if (token) {
//     req.headers.Authorization = `Bearer ${token}`;
//   }
//   return req;
// }, (error) => Promise.reject(error));

// // RESPONSE: Handles the 401 redirect only if the token is actually dead
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response && error.response.status === 401) {
//       console.error("Unauthorized! Redirecting to login...");
//       localStorage.clear();
//       window.location.href = "/"; 
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;