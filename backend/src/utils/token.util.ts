import crypto from 'crypto';
import { JWTPayload } from "../models/interface/auth.interface";
import { PoolClient } from 'pg';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '../utils/db.util';

export const generateAccessToken = async ({
    userId,
    expiresIn = "1h",
    client
}:{
    userId: number,
    expiresIn?: string,
    client: PoolClient
}): Promise<string> =>{

    const secret = process.env.JWT_SECRET;
    if(!secret){
        throw new Error("JWT_SECRET is not defined");
    }

    const options: SignOptions = {
        expiresIn: expiresIn as SignOptions["expiresIn"]
    };

    const payload = await getJWTPayloadFromDb({
        userId: userId,
        client: client
    });

    return jwt.sign(payload, secret, options);
}

export const verifyAccessToken = (token: string): jwt.JwtPayload | null =>{
    const secret = process.env.JWT_SECRET;
    if(!secret){
        throw new Error("JWT_SECRET is invalid");
    }
    try{
        return jwt.verify(token, secret) as jwt.JwtPayload
    }catch {
        return null;
    }    
}

export const generateRefreshToken = (): string =>{
    return crypto.randomBytes(64).toString('hex');
}

const getJWTPayloadFromDb = async ({
    userId,
    client
}:{
    userId: number,
    client: PoolClient
}): Promise<JWTPayload>=>{

    const result = await query(`
        SELECT u.id, u.email, r.id as role_id, r.name as role
            FROM users u
            INNER JOIN role r
            ON u.role_id = r.id
        WHERE u.id = $1
        `,[userId],client);

    if(result.length === 0){
        throw new Error("User credentials don't exist");
    }

    const payload: JWTPayload ={
        userID: result[0].userID,
        email: result[0].email,
        role_id: result[0].role_id,
        role: result[0].role,
    }

    return payload;
}