import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const KPICard = ({ title, value, IconComponent, color = "#fbbf24", linkTo, subtitle }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -5, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      onClick={() => linkTo && navigate(linkTo)}
      style={{
        cursor: linkTo ? "pointer" : "default",
        background: "linear-gradient(135deg, rgba(30,64,175,0.82) 0%, rgba(30,58,138,0.95) 100%)",
        borderRadius: 16,
        padding: "1.4rem 1.6rem",
        border: `1px solid ${color}30`,
        boxShadow: `0 8px 20px rgba(0,0,0,0.25), 0 0 0 1px ${color}15`,
        color: "white",
        minWidth: 200,
        flex: 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 3, background: color, borderRadius: "16px 16px 0 0",
      }} />

      {IconComponent && (
        <IconComponent
          size={28}
          color="#ffffff"
          style={{ marginBottom: "0.75rem", opacity: 0.9 }}
        />
      )}

      <div style={{ fontSize: "0.88rem", fontWeight: 500, opacity: 0.8, marginBottom: "0.4rem" }}>
        {title}
      </div>

      <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
        {value ?? "—"}
      </div>

      {subtitle && (
        <div style={{ fontSize: "0.75rem", opacity: 0.65, marginTop: "0.4rem" }}>
          {subtitle}
        </div>
      )}
    </motion.div>
  );
};

export default KPICard;
