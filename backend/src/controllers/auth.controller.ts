import {Request, Response } from 'express';
import * as HTTPUtil from '../utils/http.util';
import * as authService from '../services/auth.service';
import { getErrorMessage } from '../utils/error.util';
import * as userService from '../services/user.service';


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

export const reqResetPasswordToken = async (req: Request, res: Response)=>{
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

export const revokeAccessTokenController = async (req: Request, res: Response)=>{
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