import * as userInterface from '../models/interface/user.interface';
import * as DBUtil from '../utils/db.util';
import { PoolClient } from 'pg';
import { getErrorMessage } from '../utils/error.util';
import bycrpt from 'bcrypt'
import { sendEmailVerification } from '../utils/email.util';
import { RoleName, TokenTableName } from '../models/enums/auth.enum';
import { generateTokenTable } from './auth.service';

/**
 * Create user
 * @param param0 
 * @returns 
 */
export const createUser = async ({
    user,
    assignRole 
}:{
    user: userInterface.CreateUserInput,
    assignRole: RoleName
}) =>{
    let client: PoolClient | undefined;
    try{
        client = await DBUtil.startTransaction()
        const existing_user = await DBUtil.query("SELECT id FROM user WHERE email = $1", [user.email], client);

        if(existing_user.length === 1){
            throw new Error("User with that account already exists");
        }

        const hashedPassword = await bycrpt.hash(user.password, 10);

        //Find the role id which will later be inserted into users table in the role_id foreign key row
        const role = await getRoleName(assignRole);

        const userQuery = 
            `INSERT INTO "user"(role_id, name, email, password, dob, address, is_active, is_verified, created_at)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id`;

        const params = [
            role.id,// Role ID acquired from role
            user.name, 
            user.email, 
            hashedPassword, 
            user.dob, 
            user.address, 
            true, 
            false
        ];

        const createUser = await DBUtil.query(userQuery, params, client);
        
        //Let controllers handle this
        const verificationToken = await generateTokenTable({
            userId: createUser[0].userId,
            client: client,
            tableName: TokenTableName.EMAIL
        })

        await sendEmailVerification({
            email: user.email,
            token: verificationToken
        }); 
        
        await DBUtil.commitTransaction(client);

        return createUser[0];

    }catch(error){
        if(client){
            await DBUtil.rollbackTransactions(client);
        }

        throw new Error(getErrorMessage(error));
    }     
};

/**
 * Update user information
 * @param param0 
 * @returns 
 */
export const updateUser = async ({
    user
}:{
    user: userInterface.User
}) =>{
    
    const hashedPassword = await bycrpt.hash(user.password, 10);

    //If the user exists update the user
    const SqlQuery = `UPDATE "users" 
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
        "users"(id, role_id, name, email, password, dob, address, is_active, is_verified, updated_at)
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
        const deleteQuery = `UPDATE "user" 
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
export const getRoleName = async (
    roleName: string
): Promise<userInterface.Role> =>{
    const findRole = 'SELECT * from role WHERE name ILIKE = $1';

    const value = `%${roleName}%`;

    const result = (await DBUtil.query(findRole, [value])) as unknown as [
        userInterface.Role
    ]

    return result[0];
}

