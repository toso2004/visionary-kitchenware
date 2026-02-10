import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as AuthMiddleware from '../middleware/auth.middleware'
import { RoleName } from '../models/enums/auth.enum';

export const authRouter = Router();

authRouter.post('/', authController.CreateUserController);
authRouter.post('/edit/:id',AuthMiddleware.authenticateToken, AuthMiddleware.requireAnyRole([RoleName.SYSTEMADMIN, RoleName.ADMIN,RoleName.EMPLOYEE, RoleName.CUSTOMER]), authController.UpdateUserController);
authRouter.get('/verify-email', authController.verifyEmailController),
authRouter.get('/request-reset-password-token', authController.requestResetPasswordToken);
authRouter.get('/verify-password-token', authController.verifyResetPasswordToken);
authRouter.post('/refresh-access-token', authController.refreshAccessTokenController);
authRouter.post('/revoke-refresh-token', authController.revokeRefreshTokenController);
authRouter.get('/:id',AuthMiddleware.authenticateToken, AuthMiddleware.requireAnyRole([RoleName.SYSTEMADMIN,RoleName.ADMIN,RoleName.EMPLOYEE, RoleName.CUSTOMER]), authController.getUserByIdController);
authRouter.post('/login', authController.Login);