import {Router} from 'express';
import { loginHandler, registerController, verifyEmail } from '../controllers/auth.controller';

export const authRoute = Router();

authRoute.post('/register', registerController);
authRoute.post('/login', loginHandler);
authRoute.get('/verify-email', verifyEmail);