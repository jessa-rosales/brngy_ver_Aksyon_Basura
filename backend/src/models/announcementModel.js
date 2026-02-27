const pool = require("../db");

const announcementModel = {
  create: async (data) => {
    const { title, content, ann_photo, category, priority, status, author_id } = data;
    const query = `
      INSERT INTO announcements (title, content, ann_photo, category, priority, status, author_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *;
    `;
    const values = [title, content, ann_photo, category, priority, status, author_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  getAll: async () => {
    const query = `
      SELECT a.*, 
             u1.first_name as author_first, u1.last_name as author_last, u1.user_id as original_author_id,
             u2.first_name as editor_first, u2.last_name as editor_last, u2.user_id as latest_editor_id
      FROM announcements a
      LEFT JOIN users u1 ON a.author_id = u1.user_id
      LEFT JOIN users u2 ON a.last_edited_by = u2.user_id
      WHERE a.is_archived = false -- ✅ FILTER OUT ARCHIVED
      ORDER BY a.date_published DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  update: async (id, data) => {
    const { title, content, ann_photo, category, priority, status, last_edited_by } = data;
    const query = `
      UPDATE announcements 
      SET title = $1, 
          content = $2, 
          ann_photo = COALESCE($3, ann_photo), 
          category = $4, 
          priority = $5, 
          status = $6, 
          last_edited_by = $7, 
          date_updated = NOW() 
      WHERE announcement_id = $8
      RETURNING *;
    `;
    const values = [title, content, ann_photo, category, priority, status, last_edited_by, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  archive: async (id) => {
    const result = await pool.query(
      "UPDATE announcements SET is_archived = true WHERE announcement_id = $1 RETURNING *", 
      [id]
    );
    return result.rowCount > 0;
  },

  delete: async (id) => {
    const result = await pool.query("DELETE FROM announcements WHERE announcement_id = $1", [id]);
    return result.rowCount > 0;
  }
};

module.exports = announcementModel;