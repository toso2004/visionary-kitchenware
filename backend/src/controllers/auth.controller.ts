import {Request, Response } from 'express';
import * as HTTPUtil from '../utils/http.util';
import * as authService from '../services/auth.service';
import { getErrorMessage } from '../utils/error.util';
import * as userService from '../services/user.service';
import { RoleName } from '../models/enums/auth.enum';
//import { CreateUser } from '../models/types/omit.type';
import * as userInterface from '../models/interface/user.interface';


export const CreateUserController = async (req: Request, res: Response)=> {

    /*
    const {name, email, password, dob, address} = req.body;

    if(!name || !email || !password || !dob || !address){
        HTTPUtil.badRequest(res, 'User credentials are missing');
        return;
    }

    const user: CreateUser = {
        name,
        email,
        password,
        dob,
        address
    }*/

   const user: userInterface.User = req.body;
   if(user === null){
    HTTPUtil.badRequest(res, "User credentials are required");
   }

    try{
        const createUser = await userService.createUser({
            user,
            assignRole: RoleName.CUSTOMER
        })

        HTTPUtil.sendSuccess(res, createUser);

    }catch(error: any){
        HTTPUtil.sendInternalError(res, error.message);
    }
};

export const UpdateUserController = async (req: Request, res: Response)=>{
    
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

    try{
        const updateUser = await userService.updateUser({user});

        HTTPUtil.sendSuccess(res, updateUser);

    }catch(error){
        HTTPUtil.sendInternalError(res, getErrorMessage(error))
    }
};

export const verifyEmailController = async (req: Request,res: Response) =>{
    const {token} = req.body;

    if(!token) return HTTPUtil.badRequest(res, "Token is required");

    try{
        const user = await authService.verifyEmailToken(token as string)
        if(!user){
            return HTTPUtil.unauthorized(res, "Invalid or expired token");
        }

        HTTPUtil.sendSuccess(res, {message: "Email verification sent successfully"});
    }catch(error){
        HTTPUtil.sendInternalError(res, getErrorMessage(error));
    }
}

export const requestResetPasswordToken = async (req: Request, res: Response)=>{
    const {email} = req.body;

    if(!email) return HTTPUtil.badRequest(res, "Email is required");

    try{
        const user = await authService.verifyEmailAndResetPassword(email as string);

        if(user === null){
            return HTTPUtil.notFound(res, `User with ${email} not found.`);
        }

        HTTPUtil.sendSuccess(res, {message: "Successful reset password request."});
    }catch(error){
        HTTPUtil.sendInternalError(res, getErrorMessage(error));
    }
}

export const verifyResetPasswordToken = async (req: Request, res: Response)=>{
    const {token} = req.body;

    if(!token){
        return HTTPUtil.badRequest(res, "Password reset token is required");
    }

    try{
        const user = await authService.verifyForgotPasswordToken(token);

        if(!user){
            return HTTPUtil.unauthorized(res, "Invalid or expired token");
        }

        HTTPUtil.sendSuccess(res, user);
    }catch(error){
        HTTPUtil.sendInternalError(res, getErrorMessage(error));
    }
}

export const refreshAccessTokenController = async (req: Request, res: Response)=>{
    const [refresh_token] = req.body;

    if(!refresh_token) return HTTPUtil.badRequest(res, "Refresh token is required");

    try{
        const response = await authService.refreshAccessToken(refresh_token);

        HTTPUtil.sendSuccess(res, response);
    }catch(error){
        HTTPUtil.sendInternalError(res, getErrorMessage(error));
    }
}

export const revokeRefreshTokenController = async (req: Request, res: Response)=>{
    const {refresh_token} = req.body;

    if(!refresh_token) return HTTPUtil.badRequest(res, "Refresh token is required");

    try{
        const response = await authService.revokeRefreshToken(refresh_token);

        HTTPUtil.sendSuccess(res, response);
    }catch(error){
        HTTPUtil.sendInternalError(res, getErrorMessage(error));
    }
}

export const getUserByIdController = async (req: Request, res: Response)=>{
    const {id} = req.params;
    const userId = Number(id);

    if(userId === null || isNaN(userId)){
        HTTPUtil.badRequest(res, "Invalid ID");
        return;
    }

    try{
        const user = await userService.getUserById(userId);

        if(user === null){
            return HTTPUtil.notFound(res, `User with ${userId} not found.`)
        }

        HTTPUtil.sendSuccess(res, user);
    }catch(error){
        HTTPUtil.sendInternalError(res, getErrorMessage(error));
    }
}

export const Login = async (req: Request, res: Response) =>{
    const {email, password} = req.body;

    if(email === null || password === null){
        return HTTPUtil.badRequest(res, "User credentials are required.");
    }

    try{
        const response = await userService.validateUser(email, password);

        HTTPUtil.sendSuccess(res, response);
    }catch(error){
        if(error instanceof Error && 
            (error.message == "Incorrect user credentials" || 
                error.message == "User not found")){
            return HTTPUtil.unauthorized(res, "Invalid user credentials")
        }
        HTTPUtil.sendInternalError(res, getErrorMessage(error));
    }
}