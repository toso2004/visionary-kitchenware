import { Request, Response, NextFunction } from "express";
import { unauthorized, forbidden } from "../utils/http.util";
import { JWTPayload } from "../models/interface/auth.interface";
import dotenv from 'dotenv';
import { verifyAccessToken } from "../utils/token.util";

dotenv.config();

export interface AuthenticatedRequest extends Request {
    user?: JWTPayload
}

export const authenticateToken = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    let token: string | undefined;
    const authHeader = req.headers["authorization"];

    if(authHeader &&
        typeof authHeader === "string" &&
        authHeader.startsWith("Bearer ")
    ){
        // Take the token out of the authorization header
        token = authHeader.split(" ")[1];
    }

    if(!token){
        unauthorized(res, "Access token needed");
    }

    try{
        if(token){
            const decoded = verifyAccessToken(token);
            if(!decoded) throw new Error("Missing or incorrect token");

            req.user = decoded as JWTPayload;// Tells typescript that the payload(contained in decoded) matches the shape of JWTPayload
            next(); 
        }
    }catch(error){
        forbidden(res, "Invalid or expired access token")
    }
}

// Check for a specific role
export const requireRole = (requireRole: string) =>{
    return(req: AuthenticatedRequest, res: Response, next: NextFunction)=> {
        if(!req.user) unauthorized(res, "User not authorized");

        if(req.user?.role !== requireRole){
            forbidden(res, "User has no permission");
        };
        next();
    };
}

// Grant access to multiple roles
export const requireAnyRole = (requireAnyRole: string[])=> {
    return(req: AuthenticatedRequest, res: Response, next: NextFunction)=>{
        if(!req.user) unauthorized(res, "User not authorized");
        if(!requireAnyRole.includes(req.user?.role || ""))
            forbidden(res, "User has no permission");
        next();
    }
}