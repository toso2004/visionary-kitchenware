import { User } from '../interface/user.interface';

type OmitUserFields = 
 | 'id'
 | 'role_id'
 | 'created_at'
 | 'updated_at'

 export type CreateUser = Omit<User, OmitUserFields>;