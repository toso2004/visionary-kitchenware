import {  Router} from 'express';
import * as UserController from '../controllers/user.controller';

export const router = Router();

router.post('/create', UserController.CreateUserController);
router.put('/edit', UserController.UpdateUserController);
router.delete('/delete', UserController.DeleteUserController);


