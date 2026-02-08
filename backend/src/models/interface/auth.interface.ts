import { PoolClient } from "pg";
import { TokenTableName } from "../enums/auth.enum";

export interface JWTPayload{
    userID: number,
    email: string,
    role_id: number,
    role: string,
    iat?: number,
    expiresIn?: number,
}

export interface AuthenticatedRequest extends Request{
    user?: JWTPayload
}

//Describes a database table that contains authentication tokens
export interface TokenTable{
    userId: number,
    client: PoolClient,
    tableName: TokenTableName,
    durationMs?: number
}