import {asyncHandler} from '../utils/asynHandler.js'
import {ApiError} from "../utils/ApiError.js";
import { User } from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler ( async (req,res)=>{
    const {fullname , email, username } = req.body
    console.log("Email" , email);
    if(
        [fullname , email, username , password ].some((field)=>field?.trim()=== "")
    ){
        throw new ApiError(400, "All Fields Are Required")
    }
    const existedUser = User.findOne({
        $or:[{ username  },{ email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exist")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImagerLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, " Avatar File is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImagerLocalPath)

    if(!avatar){
        throw new ApiError(400, " Avatar File is required")
    }

    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage: coverImage.url || "",
        email,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshtoken ")

    if(!createdUser){
        throw new ApiError(500, " Something went wrong while register a user")
    }

    return res.status(201).json(
       new ApiResponse(200,createdUser, "User register successfully")
    )
})

export { registerUser }