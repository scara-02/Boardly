const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { signupSchema, loginSchema, refreshSchema, logoutSchema } = require('../validators/authSchemas');

// Public routes
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(logoutSchema), authController.logout);

module.exports = router;
