import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynHandler.js";
import  Jwt  from "jsonwebtoken";

export const verifyJWT = asyncHandler( async(req, res, next)=>{
   try {
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
 
     if(!token){
         throw new ApiError(401, "Unauthorized request")
     }
 
     const decodediInfo =  Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
 
     const user = await User.findById(decodediInfo?._id).select("-password -refreshtoken")
     
     if(!user) {
         throw  new  ApiError(401, " Invalid Access Token")
     }
 
     req.user = user;
     next()
   } catch (error) {
        throw new ApiError(401, error?.message || "Inavlid Access Token")
   }
})