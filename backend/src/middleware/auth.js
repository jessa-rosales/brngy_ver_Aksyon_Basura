const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = (req, res, next) => {
  // 1. Get token from the standard Authorization header
  const authHeader = req.header("Authorization");

  // 2. Check if header exists and starts with Bearer
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ msg: "Authorization denied. No valid token found." });
  }

  // 3. Extract the actual token (remove 'Bearer ')
  const token = authHeader.split(" ")[1];

  try {
    const verify = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verify.user; 
    next(); 
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};