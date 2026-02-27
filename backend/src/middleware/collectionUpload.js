const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Points to the new collection_rec folder
        const dir = path.join(__dirname, '../uploads/collection_rec');
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Fallback to .jpg if the mobile app doesn't send an extension
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `evidence-${uniqueSuffix}${ext}`);
    }
});

module.exports = multer({ storage: storage });