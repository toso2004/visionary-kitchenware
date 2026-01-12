import * as UserInterface from '../models/interface/user.interface';
import * as DBUtil from '../utils/db.util';
import { PoolClient } from 'pg';
import { getErrorMessage } from '../utils/error.util';
import bcrypt from 'bcrypt'
import { sendEmailVerification } from '../utils/email.util';
import { RoleName, TokenTableName } from '../models/enums/auth.enum';
import { generateTokenTable, storeRefreshToken } from './auth.service';
import { CreateUser } from '../models/types/omit.type';



export const createUser = async ({
  user,
  assignRole
}: {
  user: CreateUser,
  assignRole: RoleName;
}) => {

  const client = await DBUtil.startTransaction();
  
  try{
    const existingUser = await getUserByEmail(user.email);
    if(existingUser){
      throw new Error("User with that account already exists");
    }

    const role = await getRoleByName(assignRole);

    const result = await create_user({user, role, client});

    const { accessToken, refreshToken } = await storeRefreshToken({
      user: result,
      client
    });

    await DBUtil.commitTransaction(client);

    return{
      userId: result.id,
      email: result.email,
      accessToken,
      refreshToken
    }
    
  }catch(error){
    await DBUtil.rollbackTransaction(client);
    throw error;
  }
}

export const create_user = async ({
  user,
  role,
  client
}: {
  user: CreateUser;
  role: UserInterface.Role;
  client: PoolClient
})=> {
  // Hash password
  const hashedPassword = await bcrypt.hash(user.password, 10);

  // Insert new user
  const userQuery = `
    INSERT INTO user 
      (role_id, name, email, password, dob, address, is_active, is_verified, last_updated_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *;
  `;

  const params = [
    role.id,
    user.name,
    user.email,
    hashedPassword,
    user.dob,
    user.address,
    true,
    false,
  ];

  const rows = await DBUtil.query(userQuery, params, client);

  const verificationToken = await generateTokenTable({
    userId: rows[0].id,
    client,
    tableName: TokenTableName.EMAIL
  });

  await sendEmailVerification({
    email: user.email,
    token: verificationToken
  })

  return rows[0] as UserInterface.User;
};

/**
 * Update user information
 * @param param0 
 * @returns 
 */
export const updateUser = async ({
    user
}:{
    user: UserInterface.User
}) =>{
    
    const hashedPassword = await bcrypt.hash(user.password, 10);

    //If the user exists update the user
    const SqlQuery = `UPDATE user 
    SET
        name = $2,
        email = $3,
        password = $4,
        dob = $5,
        address = $6,
        is_active = $7,
        is_verified = $8,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `;

    const params = [
        user.id,
        user.name,
        user.email,
        hashedPassword,
        user.dob,
        user.address,
        user.is_active,
        user.is_verified,
        user.updated_at
    ]

    let updatedUser = await DBUtil.query(SqlQuery, params);

    //If user doesn't exist or there is some sort of issue with their account and rowCount for that user in the db is 0
    // insert the user instead of returning an error message indicating that the user doesn't exist
    if(updatedUser.length === 0){
        const insertQuery = `INSERT INTO 
        user(id, role_id, name, email, password, dob, address, is_active, is_verified, updated_at)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id`;

        updatedUser = await DBUtil.query(insertQuery, params);
    }

    return updatedUser[0];

}

/**
 * Soft delete a user
 * @param param0 
 * @returns 
 */
export const deleteUserById = async (user_id: Number )=> {
    
    try{
        const deleteQuery = `UPDATE user 
        SET is_active = False 
        WHERE id = $1 AND is_active = True
        RETURNING id`;

        const params = [user_id];

        const result = await DBUtil.query(deleteQuery, params);

        if(result.length === 0){
            return null
        }

        return {
            user_id: user_id,
            message: 'User deleted successfully'
        }
    }catch(error){
        throw new Error(getErrorMessage(error));
    }  
}

/**
 * Gets the name of the role as a string to be applied when assigning a new/promoted user a role
 * @param roleName 
 * @returns 
 */
export const getRoleByName = async (
    roleName: string
): Promise<UserInterface.Role> =>{
    const findRole = 'SELECT * from role WHERE name ILIKE = $1';

    const value = `%${roleName}%`;

    const result = (await DBUtil.query(findRole, [value])) as unknown as [
        UserInterface.Role
    ]

    return result[0];
}

const getUserByEmail = async (email: string)=> {
  const sqlQuery = `SELECT * FROM user WHERE email ILIKE $1`;

  const result = (
    await DBUtil.query(sqlQuery, [email])
  )[0] as unknown as UserInterface.User;

  return result;
};


