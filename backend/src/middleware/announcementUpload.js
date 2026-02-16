const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ 1. Absolute Path Logic
// This goes from 'middleware' -> up to 'backend' -> into 'src' -> into 'uploads'
const uploadDir = path.join(__dirname, '..', 'uploads');

// ✅ 2. Self-Healing: Create the folder automatically if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    console.log("📁 Creating missing upload directory at:", uploadDir);
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // ✅ 3. Use the absolute path
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'ann-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const isExtensionValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isMimeValid = allowedTypes.test(file.mimetype);

    if (isExtensionValid && isMimeValid) {
        cb(null, true);
    } else {
        cb(new Error('Error: Only images (jpeg, jpg, png, webp) are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

module.exports = upload;