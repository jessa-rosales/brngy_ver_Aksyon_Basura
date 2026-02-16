const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authorize = require('../middleware/auth');
const upload = require('../middleware/userUpload');

// Public Route
router.post('/login', userController.loginUser);

//rotected Routes (Requires valid token in header)
router.get('/', authorize, userController.getUsers);
router.post('/', authorize, userController.addUser);
router.put('/:id', authorize, userController.updateUser);
router.put('/mobile-profile/:id', authorize, userController.updateMobileProfile);
router.post('/register', userController.registerUser); // ✅ Add this line
// 'profile_image' is the key name used in Postman or Frontend FormData

//this was use for website part
//router.post('/upload-avatar', authorize, upload.single('profile_image'), userController.uploadProfilePic);

router.post('/upload-profile-pic', authorize, upload.single('profile_image'), userController.uploadProfilePic);

router.get('/verify', authorize, userController.verifyToken);

module.exports = router;