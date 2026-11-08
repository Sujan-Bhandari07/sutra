
import { IsDefined, IsString } from "class-validator"
export class LoginDto{
@IsString({message:"Token must be string"})
@IsDefined({message:"Token is required."})
    token!:string
}