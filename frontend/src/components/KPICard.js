// components/KPICard.js – upgraded version
import React from 'react';
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const KPICard = ({ title, value, IconComponent, color = "#fbbf24", linkTo }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{ scale: 1.04, y: -8, transition: { duration: 0.3 } }}
      whileTap={{ scale: 0.97 }}
      onClick={() => linkTo && navigate(linkTo)}
      style={{
        cursor: linkTo ? "pointer" : "default",
        background: "linear-gradient(135deg, rgba(30,64,175,0.7) 0%, rgba(30,58,138,0.9) 100%)",
        borderRadius: 16,
        padding: "1.5rem 1.75rem",
        border: "1px solid rgba(251,191,36,0.18)",
        boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
        backdropFilter: "blur(8px)",
        color: "white",
        minWidth: 220,
        flex: 1,
      }}
    >
      {IconComponent && <IconComponent size={32} color="#1e40af" style={{ marginBottom: '0.5rem' }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 500, opacity: 0.9 }}>{title}</div>
      </div>

      <div style={{ fontSize: "2.6rem", fontWeight: 800, color: "#fff" }}>
        {value}
      </div>
    </motion.div>
  );
};

export default KPICard;
