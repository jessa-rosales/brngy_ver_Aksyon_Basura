const pool = require('../db');

// Map frontend categories to database tables and their primary keys
const tableMap = {
    'reports': { table: 'citizen_reports', id: 'report_id' },
    'tasks': { table: 'task_assignments', id: 'task_id' },
    'bins': { table: 'collection_records', id: 'record_id' },
    'zones': { table: 'zones', id: 'zone_id' },
    'announcements': { table: 'announcements', id: 'announcement_id' },
    'users': { table: 'users', id: 'user_id' }
};

exports.getArchivedItems = async (req, res) => {
    const { category } = req.params;
    const config = tableMap[category];

    if (!config) return res.status(400).json({ message: "Invalid system category" });

    try {
        const query = `SELECT * FROM ${config.table} WHERE is_archived = true`;
        const { rows } = await pool.query(query);
        
        // Ensure every item has a generic 'id' field for the React frontend
        const formattedData = rows.map(item => ({
            ...item,
            id: item[config.id]
        }));

        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.restoreItem = async (req, res) => {
    const { category, id } = req.params;
    const config = tableMap[category];

    if (!config) return res.status(400).json({ message: "Invalid system category" });

    try {
        const query = `
            UPDATE ${config.table} 
            SET is_archived = false 
            WHERE ${config.id} = $1 
            RETURNING *`;
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) return res.status(404).json({ message: "Item not found" });
        res.json({ message: "Data successfully restored", item: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};