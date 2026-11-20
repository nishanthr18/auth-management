import { Router } from 'express';
import {
    confirmResetPassword,
    forgotPassword,
    loginHandler,
    logout,
    refreshTokenHandler,
    registerController,
    verifyEmail
} from '../controllers/auth.controller';

export const authRoute = Router();

authRoute.post('/register', registerController);
authRoute.post('/login', loginHandler);
authRoute.get('/verify-email', verifyEmail);
authRoute.post('/refresh', refreshTokenHandler);
authRoute.post('/logout', logout);
authRoute.post('/forgot-password', forgotPassword);
authRoute.post('/reset-password', confirmResetPassword);