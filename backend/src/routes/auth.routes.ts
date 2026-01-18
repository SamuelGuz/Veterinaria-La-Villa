import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema, updateUserSchema } from '../validators';

const router = Router();

// Rutas públicas
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/register', validateBody(registerSchema), authController.register);
router.get('/verify', authController.verifyToken);

// Rutas protegidas
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, validateBody(updateUserSchema), authController.updateMe);

export default router;
