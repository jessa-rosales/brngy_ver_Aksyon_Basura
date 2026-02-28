const pool = require('../db');
const bcrypt = require('bcrypt');

const UserModel = {
  findByEmail: async (email) => {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0];
  },

  getAll: async () => {
    const result = await pool.query("SELECT * FROM users WHERE is_archived = false ORDER BY user_id ASC");
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query(
      // ✅ MUST include contact_number here
      "SELECT user_id, first_name, last_name, email, contact_number, role, status, gender, birthday, address, profile_picture FROM users WHERE user_id = $1", 
      [id]
    );
    return result.rows[0];
  },

  checkExisting: async (email, phone, firstName, lastName, excludeId = null) => {
    const emailCheck = await pool.query(
      "SELECT user_id FROM users WHERE email = $1 AND user_id != COALESCE($2, -1)", 
      [email, excludeId]
    );
    if (emailCheck.rows.length > 0) return "Email already in use";

    const phoneCheck = await pool.query(
      "SELECT user_id FROM users WHERE contact_number = $1 AND user_id != COALESCE($2, -1)", 
      [phone, excludeId]
    );
    if (phoneCheck.rows.length > 0) return "Phone number already in use";

    const nameCheck = await pool.query(
      "SELECT user_id FROM users WHERE first_name = $1 AND last_name = $2 AND user_id != COALESCE($3, -1)", 
      [firstName, lastName, excludeId]
    );
    if (nameCheck.rows.length > 0) return "This full name already exists.";

    return null;
  },

  create: async (data) => {
    const { first_name, last_name, email, password, contact_number, role, status, gender, birthday, address, profile_picture } = data;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, contact_number, role, status, gender, birthday, address, profile_picture) 
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [first_name, last_name, email, hashedPassword, contact_number, role, status || 'Active', gender, birthday, address, profile_picture]
    );
    return result.rows[0];
  },

  update: async (id, data) => {
    // ✅ Extract Frontend names and map them to local variables
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phone, 
      role, 
      status, 
      gender, 
      birthday, 
      address, 
      profile_picture 
    } = data;

    // Safety fallback: If frontend sends 'phone', use it. If not, don't overwrite with null if you have existing data.
    const first_name = firstName;
    const last_name = lastName;
    const contact_number = phone;

    // Fix for the Birthday decreasing/glitch issue
    const formattedBirthday = (birthday === "" || birthday === null) ? null : birthday;

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = `
        UPDATE users 
        SET first_name=$1, last_name=$2, email=$3, password=$4, contact_number=$5, 
            role=$6, status=$7, gender=$8, birthday=$9, address=$10, profile_picture=$11
        WHERE user_id=$12 RETURNING *`;
      const values = [first_name, last_name, email, hashedPassword, contact_number, role, status, gender, formattedBirthday, address, profile_picture, id];
      const result = await pool.query(query, values);
      return result.rows[0];
    } else {
      const query = `
        UPDATE users 
        SET first_name=$1, last_name=$2, email=$3, contact_number=$4, 
            role=$5, status=$6, gender=$7, birthday=$8, address=$9, profile_picture=$10
        WHERE user_id=$11 RETURNING *`;
      const values = [first_name, last_name, email, contact_number, role, status, gender, formattedBirthday, address, profile_picture, id];
      const result = await pool.query(query, values);
      return result.rows[0];
    }
  },

  archive: async (id) => {
    const result = await pool.query(
      "UPDATE users SET is_archived = true WHERE user_id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }

};

module.exports = UserModel;