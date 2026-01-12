import * as userInterface from '../models/interface/user.interface';
import { Request, Response } from 'express';
import * as UserService from '../services/user.service';
import * as HttpUtil from '../utils/http.util';
import { RoleName } from '../models/enums/auth.enum';
import { CreateUser } from '../models/types/omit.type';


export const CreateUserController = async (req: Request, res: Response): Promise<void> => {

    try{
        const {name, email, password, dob, address} = req.body;

        if(!name || !email || !password || !dob || !address){
            HttpUtil.badRequest(res, 'User credientials are missing');
            return;
        }

        const user: CreateUser = {
            name,
            email,
            password,
            dob,
            address
        }

        const createUser = await UserService.createUser({
            user,
            assignRole: RoleName.CUSTOMER
        })

        HttpUtil.sendCreated(res, createUser);

    }catch(error: any){
        HttpUtil.sendInternalError(res, error.message);
    }
};

export const UpdateUserController = async (req: Request, res: Response): Promise<void> =>{
    try{
        const {role_id, name, email, password, dob, address, is_active, is_verified} = req.body;
        const id = req.params.id;

        const user: userInterface.User = {
            id: Number(id),// Convert URL parameter to a number
            role_id: role_id || 3,
            name,
            email,
            password,
            dob,
            address,
            is_active: is_active || true,
            is_verified: is_verified || false,
            created_at: '',
            updated_at: ''
        }

        const updateUser = await UserService.updateUser({user});

        HttpUtil.sendSuccess(res, updateUser);

    }catch(error: any){
        HttpUtil.sendInternalError(res, error.message)
    }
};

export const DeleteUserController = async (req: Request, res: Response): Promise<void> =>{
    try{
        const user_id = Number(req.params.user_id);// Convert URL parameter to a number

        if(isNaN(user_id) || user_id <= 0){
            HttpUtil.badRequest(res, 'Invalid user ID');
            return;
        }

        const deleteUser = await UserService.deleteUserById(user_id);

        if(!deleteUser){
            HttpUtil.badRequest(res, `User with ID: ${user_id} not found`);
            return;
        }

        HttpUtil.sendSuccess(res, {
            user_id: deleteUser.user_id,
            message: 'User deleted successfully'
        })

    }catch(error: any){
        HttpUtil.sendInternalError(res, error.message)
    }
}
