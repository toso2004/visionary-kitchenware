import * as userInterface from '../models/interface/user.interface';
import * as DBUtil from '../utils/db.util';
import { PoolClient } from 'pg';
import { getErrorMessage } from '../utils/error.util';
import bycrpt from 'bcrypt'
import { sendEmailVerification } from '../utils/email.util';
import { error } from 'node:console';
import { generateAccessToken } from '../utils/token.util';
import { RoleName, TokenTableName } from '../models/enums/auth.enum';
import { generateTokenTable } from './auth.service';


export const createUser = async ({
    user,
    assignRole 
}:{
    user: userInterface.User,
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

export const updateUser = async ({
    user,
    client
}:{
    user: userInterface.User,
    client: PoolClient
}) =>{
    
    const hashedPassword = await bycrpt.hash(user.password, 10);

    //If the user exists update the user
    const SqlQuery = `UPDATE "users" 
    SET
        role_id = $2
        name = $3,
        email = $4,
        password = $5,
        dob = $6,
        address = $7,
        is_active = $8,
        is_verified = $9,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `;

    const params = [
        user.id,
        user.role_id,
        user.name,
        user.email,
        hashedPassword,
        user.dob,
        user.address,
        user.is_active,
        user.is_verified,
        user.updated_at
    ]

    let updatedUser = await client.query(SqlQuery, params);

    //If user doesn't exist or there is some sort of issue with their account and rowCount for that user in the db is 0
    // insert the user instead of returning an error message indicating that the user doesn't exist
    if(updatedUser.rowCount == 0){
        const insertQuery = `INSERT INTO "users"(id, role_id, name, email, password, dob, address, is_active, is_verified, updated_at)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id`;

        updatedUser = await client.query(insertQuery, params);
    }

    return updatedUser.rows[0];

}

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

