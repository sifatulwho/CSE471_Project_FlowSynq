const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getProfile,
    updateProfile,
    initiateRegistration,
    verifyOTP,
    resendOTP,
    googleLogin,
    approveRegistration
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/initiate-registration', initiateRegistration);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/approve-request', approveRegistration);
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, upload.single('profilePicture'), updateProfile);
router.put('/profile', authenticate, upload.single('profilePicture'), updateProfile);

module.exports = router;
