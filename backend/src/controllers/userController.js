const UserModel = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');
require('dotenv').config();

// ✅ NEW: In-Memory tracker for failed login attempts
const loginTracker = new Map();

exports.loginUser = async (req, res) => {
    const { email, password, loginType } = req.body;
    
    try {
        // 1. Check if user is currently locked out
        let tracker = loginTracker.get(email) || { attempts: 0, lockoutUntil: null };

        if (tracker.lockoutUntil && tracker.lockoutUntil > Date.now()) {
            const remainingMinutes = Math.ceil((tracker.lockoutUntil - Date.now()) / 60000);
            return res.status(429).json({ 
                message: `Too many failed attempts. Account locked for ${remainingMinutes} more minute(s).` 
            });
        }

        // 2. Fetch User from DB
        const user = await UserModel.findByEmail(email);
        
        // 3. If user doesn't exist, treat as a failed attempt to prevent email guessing
        if (!user) {
            return handleFailedAttempt(email, tracker, res);
        }

        // 4. Check if account is Inactive
        if (user.status === 'Inactive') {
            return res.status(403).json({ message: "Your account is inactive. Contact the administrator." });
        }

        // 5. Compare Password
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            // Check Role Restriction for Website
            if (loginType === 'website' && user.role !== 'Admin') {
                return res.status(403).json({ message: "Access Denied: Administrators only." });
            }

            // ✅ SUCCESS: Clear their record from the tracker
            loginTracker.delete(email);

            const payload = { user: { id: user.user_id, role: user.role } };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

            const { password: _, ...userProfile } = user; 
            res.json({ message: "Login success", token, user: userProfile });
        } else {
            // ❌ FAILED PASSWORD: Track the attempt
            return handleFailedAttempt(email, tracker, res);
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await UserModel.getAll();
        res.json(users);
    } catch (err) {
        // ✅ FIXED: Changed .send() to .json()
        res.status(500).json({ message: "Server Error" });
    }
};

exports.addUser = async (req, res) => {
    const { email, phone, firstName, lastName, role, password, status, gender, birthday, address, profile_picture } = req.body;
    try {
        const error = await UserModel.checkExisting(email, phone, firstName, lastName);
        if (error) return res.status(400).json({ message: error });

        const newUser = await UserModel.create({
            first_name: firstName, last_name: lastName, email, password,
            contact_number: phone, role, status, gender, birthday, address, profile_picture
        });
        res.json(newUser); 
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { email, phone, firstName, lastName, role, password, status, gender, birthday, address, profile_picture } = req.body;
    
    try {
        const error = await UserModel.checkExisting(email, phone, firstName, lastName, id);
        if (error) return res.status(400).json({ message: error });

        const updatedUser = await UserModel.update(id, {
            firstName, lastName, email, phone, role, password, status,
            gender, birthday, address, profile_picture
        });

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        const { password: _, ...userProfile } = updatedUser;
        res.json(userProfile); 
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
};

exports.registerUser = async (req, res) => {
    const { email, phone, firstName, lastName, password } = req.body;
    try {
        const error = await UserModel.checkExisting(email, phone, firstName, lastName);
        if (error) return res.status(400).json({ message: error });

        const newUser = await UserModel.create({
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            contact_number: phone,
            role: 'Citizen', 
            status: 'Active'
        });

        res.json({ message: "Registration successful", user: newUser }); 
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.uploadProfilePic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const filePath = `/uploads/profiles/${req.file.filename}`;
        const userId = req.user.id; 

        const query = "UPDATE users SET profile_picture = $1 WHERE user_id = $2 RETURNING *";
        const result = await pool.query(query, [filePath, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const { password: _, ...userProfile } = result.rows[0];

        res.json({
            message: "Profile picture updated successfully",
            profile_picture: filePath,
            user: userProfile 
        });
    } catch (err) {
        console.error("Upload Error:", err.message);
        res.status(500).json({ message: "Server Error during upload" });
    }
};

exports.updateMobileProfile = async (req, res) => {
    const { id } = req.params;
    const { contact_number, gender, birthday, address } = req.body;

    try {
        const query = `
            UPDATE users 
            SET contact_number = $1, gender = $2, birthday = $3, address = $4 
            WHERE user_id = $5 
            RETURNING user_id, first_name, last_name, email, contact_number, gender, birthday, address, profile_picture`;

        const result = await pool.query(query, [contact_number, gender, birthday, address, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(result.rows[0]); 
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.verifyToken = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id);
        // ✅ FIXED: Changed string to object
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user); 
    } catch (err) {
        // ✅ FIXED: Changed .send() to .json()
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ NEW: Helper function to manage failed attempts
function handleFailedAttempt(email, tracker, res) {
    tracker.attempts += 1;

    if (tracker.attempts >= 5) {
        // Lockout for 5 minutes (5 * 60 * 1000 milliseconds)
        tracker.lockoutUntil = Date.now() + (5 * 60 * 1000); 
        loginTracker.set(email, tracker); 
        
        return res.status(429).json({ 
            message: "Too many failed attempts. Account locked for 5 minutes." 
        });
    } else {
        loginTracker.set(email, tracker); 
        
        return res.status(401).json({ 
            message: "Invalid credentials." 
        });
    }
};



/*const UserModel = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');
require('dotenv').config();

exports.loginUser = async (req, res) => {
    const { email, password, loginType } = req.body;
    try {
        const user = await UserModel.findByEmail(email);
        if (!user) return res.status(401).json("Invalid credentials");

        if (user.status === 'Inactive') {
            return res.status(403).json("Your account is inactive. Contact the administrator.");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            if (loginType === 'website' && user.role !== 'Admin') {
                return res.status(403).json("Access Denied: Administrators only.");
            }

            const payload = { user: { id: user.user_id, role: user.role } };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

            const { password: _, ...userProfile } = user; 
            res.json({ message: "Login success", token, user: userProfile });
        } else {
            res.status(401).json("Invalid credentials");
        }
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await UserModel.getAll();
        res.json(users);
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

// ✅ Corrected addUser with Status mapping
exports.addUser = async (req, res) => {
    const { email, phone, firstName, lastName, role, password, status, gender, birthday, address, profile_picture } = req.body;
    try {
        const error = await UserModel.checkExisting(email, phone, firstName, lastName);
        if (error) return res.status(400).json({ message: error });

        const newUser = await UserModel.create({
            first_name: firstName, last_name: lastName, email, password,
            contact_number: phone, role, status, gender, birthday, address, profile_picture
        });
        res.json(newUser); 
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
};

// ✅ Corrected updateUser with Status mapping
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { email, phone, firstName, lastName, role, password, status, gender, birthday, address, profile_picture } = req.body;
    
    try {
        const error = await UserModel.checkExisting(email, phone, firstName, lastName, id);
        if (error) return res.status(400).json({ message: error });

        const updatedUser = await UserModel.update(id, {
            firstName, lastName, email, phone, role, password, status,
            gender, birthday, address, profile_picture
        });

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        // ✅ IMPORTANT: Return the updatedUser object
        const { password: _, ...userProfile } = updatedUser;
        res.json(userProfile); 
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
};


exports.uploadProfilePic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const filePath = `/uploads/profiles/${req.file.filename}`;
        const userId = req.user.id; 

        const query = "UPDATE users SET profile_picture = $1 WHERE user_id = $2 RETURNING *";
        const result = await pool.query(query, [filePath, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const { password, ...userProfile } = result.rows[0];
        res.json({
            message: "Success",
            profile_picture: filePath,
            user: userProfile 
        });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
};

// Add this function at the bottom of your file
exports.registerUser = async (req, res) => {
    const { email, phone, firstName, lastName, password } = req.body;
    try {
        // 1. Check if email/phone already exists
        const error = await UserModel.checkExisting(email, phone, firstName, lastName);
        if (error) return res.status(400).json({ message: error });

        // 2. Create the user as a 'Citizen'
        const newUser = await UserModel.create({
            first_name: firstName,
            last_name: lastName,
            email,
            password, // Password hashing should happen in your UserModel.create logic
            contact_number: phone,
            role: 'Citizen', 
            status: 'Active'
        });

        res.json({ message: "Registration successful", user: newUser }); 
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.uploadProfilePic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // The path we save to the DB (matches your static route logic)
        const filePath = `/uploads/profiles/${req.file.filename}`;
        const userId = req.user.id; 

        // ✅ Using the 'pool' we imported above
        const query = "UPDATE users SET profile_picture = $1 WHERE user_id = $2 RETURNING *";
        const result = await pool.query(query, [filePath, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const { password: _, ...userProfile } = result.rows[0];

        res.json({
            message: "Profile picture updated successfully",
            profile_picture: filePath,
            user: userProfile // Returning full user helps frontend sync immediately
        });
    } catch (err) {
        console.error("Upload Error:", err.message);
        res.status(500).json({ message: "Server Error during upload" });
    }
};


// New function specifically for Mobile Profile Updates
// New function specifically for Mobile Profile Updates
// userController.js
// backend/src/controllers/userController.js

exports.updateMobileProfile = async (req, res) => {
    const { id } = req.params;
    const { contact_number, gender, birthday, address } = req.body;

    try {
        const query = `
            UPDATE users 
            SET contact_number = $1, gender = $2, birthday = $3, address = $4 
            WHERE user_id = $5 
            RETURNING user_id, first_name, last_name, email, contact_number, gender, birthday, address, profile_picture`;

        const result = await pool.query(query, [contact_number, gender, birthday, address, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(result.rows[0]); // Returns JSON, prevents the '<' error
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.verifyToken = async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) return res.status(404).json("User not found");
        res.json(user); 
    } catch (err) {
        res.status(500).send("Server Error");
    }
};*/