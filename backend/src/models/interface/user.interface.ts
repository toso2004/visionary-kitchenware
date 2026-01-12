import { RoleName } from '../enums/auth.enum'

export interface BaseUser {
    role_id: number,
    id: number,
    created_at: string,
    updated_at: string
}

export interface User extends BaseUser{
    name: string;
    email: string;
    password: string;
    dob: string;
    address: string;
    is_active?: boolean;
    is_verified?: boolean
}

export interface Role{
    id: number,
    name: RoleName
}

