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
      {/* Colored accent bar at top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 3, background: color, borderRadius: "16px 16px 0 0",
      }} />

      {/* Icon — white so it's visible on the dark gradient */}
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
















// // components/KPICard.js – upgraded version
// import React from 'react';
// import { motion } from "framer-motion";
// import { useNavigate } from "react-router-dom";

// const KPICard = ({ title, value, IconComponent, color = "#fbbf24", linkTo }) => {
//   const navigate = useNavigate();

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 30 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.6, ease: "easeOut" }}
//       whileHover={{ scale: 1.04, y: -8, transition: { duration: 0.3 } }}
//       whileTap={{ scale: 0.97 }}
//       onClick={() => linkTo && navigate(linkTo)}
//       style={{
//         cursor: linkTo ? "pointer" : "default",
//         background: "linear-gradient(135deg, rgba(30,64,175,0.7) 0%, rgba(30,58,138,0.9) 100%)",
//         borderRadius: 16,
//         padding: "1.5rem 1.75rem",
//         border: "1px solid rgba(251,191,36,0.18)",
//         boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
//         backdropFilter: "blur(8px)",
//         color: "white",
//         minWidth: 220,
//         flex: 1,
//       }}
//     >
//       {IconComponent && <IconComponent size={32} color="#1e40af" style={{ marginBottom: '0.5rem' }} />}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
//         <div style={{ fontSize: "1.1rem", fontWeight: 500, opacity: 0.9 }}>{title}</div>
//       </div>

//       <div style={{ fontSize: "2.6rem", fontWeight: 800, color: "#fff" }}>
//         {value}
//       </div>
//     </motion.div>
//   );
// };

// export default KPICard;
