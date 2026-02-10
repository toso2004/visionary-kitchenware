import { PoolClient } from "pg";
import * as DBUtil from '../utils/db.util';
import crypto from 'crypto'
import * as TokenUtil from "../utils/token.util";
import * as userInterface from '../models/interface/user.interface'
import { getErrorMessage } from "../utils/error.util";
import { TokenTable } from "../models/interface/auth.interface";
import { sendForgotPasswordEmail } from "../utils/email.util";


export const refreshAccessToken = async (refreshToken: string) =>{
    const checkToken = await DBUtil.query("SELECT * from auth_token WHERE token = $1 AND is_active = TRUE AND expires_at > NOW()", 
        [refreshToken]);

    const token = checkToken[0];
    if(!token){
        throw new Error("Invalid or expired token");
    }

    const newAccessToken = await TokenUtil.generateAccessToken(checkToken[0].userId);

    return newAccessToken;      
}

export const revokeRefreshToken = async (refreshToken: string) => {
    const checkToken = await DBUtil.query("SELECT * from auth_token WHERE token = $1 AND is_active = TRUE AND expires_at > NOW()",
        [refreshToken]
    );

    const token = checkToken[0];
    if(!token){
        throw new Error("Invalid or expired token");
    }

    await DBUtil.query(
        `UPDATE auth_token
            SET is_active = false
        WHERE token = $1`,
    [refreshToken])

}

export const storeRefreshToken = async ({
  user,
  client,
}: {
  user: userInterface.User;
  client?: PoolClient;
}) => {
  const clientInner = client ?? (await DBUtil.startTransaction());

  try {
    // Generate tokens
    const accessToken = await TokenUtil.generateAccessToken({
      userId: user.id!,
      client: clientInner,
    });
    const refreshToken = TokenUtil.generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days to expire

    // Store refresh token in DB
    await DBUtil.query(
      `INSERT INTO auth_token (user_id, token, is_active,expire_date) VALUES ($1, $2, $3, $4)`,
      [user.id, refreshToken, true, expiresAt],
      clientInner
    );

    await DBUtil.commitTransaction(clientInner);
    return { accessToken, refreshToken };
  } catch (error) {
    await DBUtil.rollbackTransaction(clientInner);
    throw new Error(getErrorMessage(error));
  }
}

export const generateTokenTable = async (
  tokenTable: TokenTable
): Promise<string> => {
  const token = crypto.randomBytes(32).toString("hex");
  const duration = tokenTable.durationMs ?? 24 * 60 * 60 * 1000; // 24 hours
  const expiresAt = new Date(Date.now() + duration);

  const result = await DBUtil.query(
    `INSERT INTO ${tokenTable.tableName} (user_id, token, is_active, expires_at) VALUES ($1, $2, $3, $4) RETURNING *;`,
    [tokenTable.userId, token, true, expiresAt],
    tokenTable.client
  );

  return result[0].token;
};

export const verifyEmailToken = async (token: string) =>{
    const client = await DBUtil.startTransaction();
    try{
        const checkToken = await DBUtil.query("SELECT * FROM email_verification_token WHERE token = $1 AND is_active = TRUE AND expires_at > NOW()", 
        [token], client
    );

    const emailToken = checkToken[0];
    if(!emailToken){
        return null;
    }

    await DBUtil.query(`
        UPDATE email_verification_token
            SET is_verified = true 
        WHERE user_id = $1`,
        [emailToken[0].user_id]
    );

    await DBUtil.query("DELETE FROM email_verification_token WHERE user_id = $1", [emailToken[0].user_id]);
    await DBUtil.commitTransaction(client);
    }catch(error){
        await DBUtil.rollbackTransaction(client);

        throw new Error(getErrorMessage(error));
    }
    
}

export const verifyForgotPasswordToken = async (token: string) =>{
    const client = await DBUtil.startTransaction();
    try{
        const checkToken = await DBUtil.query("SELECT * FROM reset_password_token WHERE token = $1 AND is_active = TRUE AND expires_at > NOW()", 
        [token], client
    );

    const passwordToken = checkToken[0];
    if(!passwordToken){
        return null;
    }

    await DBUtil.query(`
        UPDATE reset_password_token
            SET is_verified = true 
        WHERE user_id = $1`,
        [passwordToken[0].user_id]
    );

    await DBUtil.query("DELETE FROM reset_password_token WHERE user_id = $1", 
        [passwordToken[0].user_id]);
    await DBUtil.commitTransaction(client);
    }catch(error){
        await DBUtil.rollbackTransaction(client);

        throw new Error(getErrorMessage(error));
    }
    
}

export const verifyEmailAndResetPassword = async (email: string) =>{
    const client = await DBUtil.startTransaction();

    try{
        const existingUser = await DBUtil.query("SELECT * FROM users WHERE email = $1", [email]);
        if(!existingUser){
            return null;
        }

        const resetPasswordToken = crypto.randomBytes(64).toString('hex');
        sendForgotPasswordEmail({
            email: email,
            token: resetPasswordToken
        })

        await DBUtil.commitTransaction(client);

    }catch(error){
        await DBUtil.rollbackTransaction(client);
        throw new Error(getErrorMessage(error))
    }
}