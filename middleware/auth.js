const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "chat_app_jwt_secret_key";

function authMiddleware(req, res, next) {
  // Check for token in Authorization header or cookies
  const authHeader = req.headers.authorization;
  const token =
    (authHeader && authHeader.startsWith("Bearer ") && authHeader.split(" ")[1]) ||
    req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = authMiddleware;
