import express from 'express';
import { login, register } from '../controllers/authController.js';
import { getProfile, getAllUsers, updateUser, deleteUser } from '../controllers/userController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/profile', authMiddleware, getProfile);
router.get('/', getAllUsers);
router.put('/profile', authMiddleware, updateUser);
router.delete('/profile', authMiddleware, deleteUser);

export default router;