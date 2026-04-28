// import React from 'react';
// import { useState } from 'react';
// import { Box, Typography, Tab, Tabs, Paper } from '@mui/material';
// import { motion } from 'framer-motion';
// import Login from './Login';
// import Register from './Register';  // New component below

// const Landing = () => {
//   const [tab, setTab] = useState(0);

//   return (
//     <motion.div initial={ { opacity: 0 } } animate={ { opacity: 1 } } transition={ { duration: 1 } }>
//       <Box sx={ { backgroundImage: 'url(/space-background.jpg)', backgroundSize: 'cover', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' } }>
//         <Paper sx={ { p: 4, borderRadius: 2, maxWidth: 400 } } elevation={10}>
//           <Typography variant="h4" align="center" sx={ { mb: 2 } }>Ops Dashboard</Typography>
//           <Tabs value={tab} onChange={ (e, v) => setTab(v) } centered>
//             <Tab label="Login" />
//             <Tab label="Register" />
//           </Tabs>
//           {tab === 0 && <Login />}
//           {tab === 1 && <Register />}
//         </Paper>
//       </Box>
//     </motion.div>
//   );
// };

// export default Landing;

import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../auth/AuthContext';
import { FiMail, FiLock, FiUser, FiArrowRight, FiZap } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../api/axios';

const Landing = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    requestedRole: 'developer'
  });
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const response = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        
        login(response.data.token, response.data.role);
        toast.success('Welcome back! 🎉');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 100);
      } else {
        await api.post('/auth/register', formData);
        toast.success('Registration submitted! Awaiting admin approval. 📋');
        setIsLogin(true);
        setFormData({ email: '', password: '', requestedRole: 'developer' });
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
        filter: 'blur(100px)',
        top: '-250px',
        left: '-250px',
        animation: 'float 20s infinite ease-in-out',
      }} />
      
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
        filter: 'blur(90px)',
        bottom: '-200px',
        right: '-200px',
        animation: 'float 25s infinite ease-in-out',
        animationDelay: '-10s',
      }} />

      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, transparent 70%)',
        filter: 'blur(80px)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'float 30s infinite ease-in-out',
        animationDelay: '-5s',
      }} />

      <motion.div
        className="landing-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '480px',
        }}
      >
        <div style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          boxShadow: '0 25px 60px rgba(30, 64, 175, 0.35), 0 0 80px rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}>
          {/* Header */}
          <motion.div
            style={{ textAlign: 'center', marginBottom: '2.5rem' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem',
              display: 'inline-block',
              animation: 'float 3s infinite ease-in-out',
            }}>
              <FiZap style={{ 
                color: '#fbbf24',
                filter: 'drop-shadow(0 4px 8px rgba(251, 191, 36, 0.4))',
              }} />
            </div>
            
            <h1 style={{
              fontSize: '2.75rem',
              fontWeight: '900',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.02em',
            }}>
              OpsDash
            </h1>
            
            <p style={{ 
              color: '#64748b', 
              margin: 0,
              fontSize: '1rem',
              fontWeight: '500',
            }}>
              Operations Management Platform
            </p>
          </motion.div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '2rem',
            background: '#f1f5f9',
            padding: '0.375rem',
            borderRadius: '14px',
          }}>
            <button
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1,
                padding: '0.875rem',
                border: 'none',
                background: isLogin 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' 
                  : 'transparent',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                color: isLogin ? 'white' : '#64748b',
                boxShadow: isLogin ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1,
                padding: '0.875rem',
                border: 'none',
                background: !isLogin 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' 
                  : 'transparent',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                color: !isLogin ? 'white' : '#64748b',
                boxShadow: !isLogin ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '700',
                color: '#1e3a8a',
                fontSize: '0.875rem',
                marginBottom: '0.625rem',
              }}>
                <FiMail size={16} />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                required
                style={{
                  width: '100%',
                  padding: '1rem 1.125rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  fontWeight: '500',
                  background: 'white',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '700',
                color: '#1e3a8a',
                fontSize: '0.875rem',
                marginBottom: '0.625rem',
              }}>
                <FiLock size={16} />
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '1rem 1.125rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  fontWeight: '500',
                  background: 'white',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {!isLogin && (
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '700',
                  color: '#1e3a8a',
                  fontSize: '0.875rem',
                  marginBottom: '0.625rem',
                }}>
                  <FiUser size={16} />
                  Requested Role
                </label>
                <select
                  value={formData.requestedRole}
                  onChange={(e) => setFormData({ ...formData, requestedRole: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '1rem 1.125rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    fontWeight: '500',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <option value="developer">Developer</option>
                  <option value="tester">Tester</option>
                  <option value="general">General User</option>
                </select>
              </div>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '1.125rem',
                background: loading 
                  ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                  : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                color: '#1e3a8a',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '0.5rem',
                boxShadow: loading 
                  ? 'none'
                  : '0 4px 16px rgba(251, 191, 36, 0.4)',
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid rgba(30, 58, 138, 0.3)',
                      borderTopColor: '#1e3a8a',
                      borderRadius: '50%',
                    }}
                  />
                  Processing...
                </span>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <FiArrowRight size={20} />
                </>
              )}
            </motion.button>
          </form>


        </div>
      </motion.div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
};

export default Landing;