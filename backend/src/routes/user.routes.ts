import { Router} from 'express';
import * as UserController from '../controllers/user.controller';

export const userRouter = Router();

userRouter.post('/', UserController.CreateEmployeeController);
userRouter.put('/edit-employee/:id', UserController.UpdateEmployeeController);
userRouter.delete('/delete/:id', UserController.DeleteUserController);


