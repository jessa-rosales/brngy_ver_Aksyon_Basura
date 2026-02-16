const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Change this path to 'uploads/reports'
        const dir = path.join(__dirname, '../uploads/reports');
        
        // This line automatically creates the 'reports' folder if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Use a unique prefix like 'evidence-' to distinguish these from profiles
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `evidence-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

module.exports = multer({ storage: storage });