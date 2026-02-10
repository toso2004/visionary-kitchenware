import { Router} from 'express';
import * as UserController from '../controllers/user.controller';

export const userRouter = Router();

userRouter.post('/create', UserController.CreateUserController);
userRouter.put('/edit', UserController.UpdateUserController);
userRouter.delete('/delete', UserController.DeleteUserController);


