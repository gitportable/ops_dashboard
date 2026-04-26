import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./app";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ColorModeProvider } from "./components/ThemeContext";
 
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
});
 
const root = ReactDOM.createRoot(document.getElementById("root"));
 
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ColorModeProvider>
            <App />
          </ColorModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
 



// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import './index.css';
// import App from './app';
// import { BrowserRouter } from 'react-router-dom';
// import { AuthProvider } from './auth/AuthContext';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// const queryClient = new QueryClient();

// const root = ReactDOM.createRoot(document.getElementById('root'));

// root.render(
//   <React.StrictMode>
//     <QueryClientProvider client={queryClient}>
//       <BrowserRouter>
//         <AuthProvider>
//           <App />
//         </AuthProvider>
//       </BrowserRouter>
//     </QueryClientProvider>
//   </React.StrictMode>
// );





































































































// import React from 'react';
// import ReactDOM from 'react-dom/client';   // ← important: not 'react-dom' in React 18+
// import './index.css';                      // if you have global styles, keep or remove
// import App from './app';
// import { AuthProvider } from './auth/AuthContext';
// import { BrowserRouter } from 'react-router-dom';
// import { ThemeProvider, createTheme } from '@mui/material/styles';
// import CssBaseline from '@mui/material/CssBaseline';
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// // Theme with space aesthetic
// const theme = createTheme({
//   palette: {
//     mode: 'dark',  // Default dark
//     background: {
//       default: '#0a0a2a',  // Cosmic dark
//       paper: '#1a1a4a'     // Neon accents
//     },
//     primary: { main: '#ff6f00' },  // Orange neon
//     secondary: { main: '#ff4081' } // Pink neon
//   },
//   typography: { fontFamily: 'Roboto, sans-serif' },
// });

// // Toggle function (add state in AuthContext or separate provider)
// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(
//   <React.StrictMode>
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <BrowserRouter>
//         <AuthProvider>
//           <QueryClientProvider client={queryClient}>
//             <App />
//           </QueryClientProvider>
//           <App />
//         </AuthProvider>
//       </BrowserRouter>
//       <ToastContainer position="top-center" autoClose={3000} />
//     </ThemeProvider>
//   </React.StrictMode>
// );

          // import React from 'react';
          // import ReactDOM from 'react-dom/client';
          // import './index.css';
          // import App from './app'; 
          // import { BrowserRouter } from 'react-router-dom';
          // import { ThemeProvider, createTheme } from '@mui/material/styles';
          // import CssBaseline from '@mui/material/CssBaseline';
          // import { ToastContainer } from 'react-toastify';
          // import 'react-toastify/dist/ReactToastify.css';
          // import { AuthProvider } from './auth/AuthContext'; 
          // import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

          // // Create TanStack Query client
          // const queryClient = new QueryClient();

          // // MUI Theme (dark + space aesthetic)
          // const theme = createTheme({
          //   palette: {
          //     mode: 'dark',
          //     background: {
          //       default: '#0a0a2a',
          //       paper: '#1a1a4a',
          //     },
          //     primary: {
          //       main: '#ff6f00',
          //     },
          //     secondary: {
          //       main: '#ff4081',
          //     },
          //   },
          //   typography: {
          //     fontFamily: 'Roboto, sans-serif',
          //   },
          // });

          // const root = ReactDOM.createRoot(document.getElementById('root'));

          // root.render(
          //   <React.StrictMode>
          //     <ThemeProvider theme={theme}>
          //       <CssBaseline />
          //       <QueryClientProvider client={queryClient}>
          //         <BrowserRouter>
          //           <AuthProvider>
          //             <App />
          //           </AuthProvider>
          //         </BrowserRouter>
          //       </QueryClientProvider>
          //       <ToastContainer
          //         position="top-center"
          //         autoClose={3000}
          //         hideProgressBar={false}
          //         newestOnTop
          //         closeOnClick
          //         rtl={false}
          //         pauseOnFocusLoss
          //         draggable
          //         pauseOnHover
          //         theme="dark"
          //       />
          //     </ThemeProvider>
          //   </React.StrictMode>
          // );












// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import './index.css';
// import App from './app'; 
// import { BrowserRouter } from 'react-router-dom';
// import { ThemeProvider, createTheme } from '@mui/material/styles';
// import CssBaseline from '@mui/material/CssBaseline';
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import { AuthProvider } from './auth/AuthContext'; 
// // Optional: TanStack Query (react-query) - only if you use it in Dashboard
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// // Create a client (only if using react-query)
// const queryClient = new QueryClient();

// // MUI Theme (dark + space aesthetic)
// const theme = createTheme({
//   palette: {
//     mode: 'dark',
//     background: {
//       default: '#0a0a2a', // cosmic dark
//       paper: '#1a1a4a',   // card background
//     },
//     primary: {
//       main: '#ff6f00', // neon orange
//     },
//     secondary: {
//       main: '#ff4081', // neon pink
//     },
//   },
//   typography: {
//     fontFamily: 'Roboto, sans-serif',
//   },
// });

// const root = ReactDOM.createRoot(document.getElementById('root'));

// root.render(
//   <React.StrictMode>
//     <ThemeProvider theme={theme}>
//       <CssBaseline /> {/* Normalizes styles */}
      
//       <QueryClientProvider client={queryClient}> {/* Optional - remove if not using react-query */}
//         <BrowserRouter>
//           <AuthProvider>
//             <App />
//           </AuthProvider>
//         </BrowserRouter>
//       </QueryClientProvider>
      
//       <ToastContainer
//         position="top-center"
//         autoClose={3000}
//         hideProgressBar={false}
//         newestOnTop
//         closeOnClick
//         rtl={false}
//         pauseOnFocusLoss
//         draggable
//         pauseOnHover
//         theme="dark"
//       />
//     </ThemeProvider>
//   </React.StrictMode>
// );