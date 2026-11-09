
import { IsDefined, IsString } from "class-validator"
export class LoginDto{
@IsString({message:"Token must be string"})
@IsDefined({message:"Token is required."})
    token!:string
}

export class GetProfileDto{
@IsString({message:"Id must be string"})
@IsDefined({message:"Id is required."})
    id!:string
}


