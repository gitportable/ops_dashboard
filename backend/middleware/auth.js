const jwt = require('jsonwebtoken');


module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  console.log("[Auth Middleware] Request URL:", req.originalUrl);
  console.log("[Auth Middleware] Auth header received:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[Auth] No valid Bearer token");
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log("[Auth] Extracted token (first 20 chars):", token.substring(0, 20) + "...");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[Auth] Token decoded successfully:", {
      userId: decoded.id || decoded.userId,
      role: decoded.role,
      expires: new Date(decoded.exp * 1000).toISOString()
    });
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[Auth] Token verification failed:", err.name, err.message);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid token signature" });
    }
    return res.status(403).json({ message: "Invalid token" });
  }
};


