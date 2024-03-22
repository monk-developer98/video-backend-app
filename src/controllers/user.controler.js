import {asyncHandler} from '../utils/asynHandler.js'
import {ApiError} from "../utils/ApiError.js";
import { User } from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js';
import  jwt  from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateAccessAndRefereshTokens =  async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refershToken =  user.generateRefreshToken()

        user.refreshtoken = refershToken
        await user.save({validateBeforeSave: false})

        return { accessToken , refershToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while genrating refresh and access token")
    }
}

const registerUser = asyncHandler ( async (req,res)=>{
    const {fullname , email, username , password } = req.body
    console.log("Email" , email);
    if(
        [fullname , email, username , password ].some((field)=>field?.trim()=== "")
    ){
        throw new ApiError(400, "All Fields Are Required")
    }
    const existedUser = await User.findOne({
        $or:[{ username  },{ email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exist")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImagerLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImagerLocalPath = req.files?.coverImage[0]?.path;
    }

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar File is required")
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
        password,
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

const loginUser = asyncHandler( async (req,res) => {
    // get data from  frontEnd
    // check email is valid or not
    // Find the user
    // check password
    // access & refresh token
    // cookie

    const {email , password , username }  = req.body

    if(!(email || username)){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or:[{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid =  await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credntials ")
    }

    const { accessToken , refershToken}  = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshtoken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken,options)
        .cookie("refreshtoken", refershToken , options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser,accessToken,refershToken
            }, "User logged in Successfully")
        )

})

const logoutUser = asyncHandler( async (req, res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $unset:{ refreshtoken: 1}
    },{ new: true})

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshtoken", options)
    .json(new ApiResponse(200 , {} , "User Loged Out"))
})

const refreshAccessToken = asyncHandler (async (req , res)=>{
    const inComingrefreshToken = req.cookies.refreshtoken || req.body.refreshtoken

    if (!inComingrefreshToken){
        throw new ApiError(401, 'unauthorized request')
    }
    try {
        const decodedToken =  jwt.verify( inComingrefreshToken , process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user){
            throw new ApiError(401, 'Invalid refresh token')
        }
    
        if(inComingrefreshToken !== user?.refreshtoken) {
            throw new ApiError(401, 'Refresh token is expired or used')
            
        }
        const options = {
            httpOnly:true,
            secureL:true
        }
    
        const {accessToken , newrefershToken }  = await generateAccessAndRefereshTokens(user?._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("accesstoken", newrefershToken , options)
        .json(200, {accessToken,refreshtoken:newrefershToken}, "Access token refreshed")
    } catch (error) {
        throw new ApiError(401, error?.message || "InValid refresh token")
    }
})

const changeUserPassword = asyncHandler ( async (req , res) => {
    const {oldPassword , newPassword} = req.body
    
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json(new ApiResponse(200,{}, "Password changed successfully"))
})

const getUser =  asyncHandler( async (req, res) =>{
    return res
    .status(200)
    .json(200, req.user, " Current User Fetched Successfully")
})

const upDateAccountDetails = asyncHandler ( async (req , res) => {
    const { fullname , email} = req.body
    if(!fullname || !email) {
        throw new ApiError(400 , "All fields Are required")
    }

    const user =  User.findByIdAndUpdate(
        req.user?._id,
        { 
            $set:{
                fullname,
                email,

            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json( new ApiResponse(200, user, "Account details updated"))
})

const updateUserAvatar = asyncHandler (async (req , res) => {
    const avatarLocalPath =  req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error While Uploading ")
    }

    const user =  await User.findByIdAndUpdate(req.user?._id , {
        $set:{ avatar:avatar.url }
    },{new:true})

    return res
    .status(200)
    .json( new ApiResponse(200, user, "Avatar updated"))
})
const updateUserCoverImage = asyncHandler (async (req , res) => {
    const coverImageLocalPath =  req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error While Uploading ")
    }

    const user =  await User.findByIdAndUpdate(req.user?._id , {
        $set:{ coverImage:coverImage.url }
    },{new:true})

    return res
    .status(200)
    .json( new ApiResponse(200, user, "coverImage updated"))
})

const getUserChannelProfile = asyncHandler (async (req, res) => {
    const { username } = req.params
    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscibers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscibers",
                as: "subscibedTo"
            }
        },{
            $addFields:{
                subscribersCount: {
                    $size: "$subscibers"
                },
                channelsSubscribeToCount: {
                    $size:"$subscibedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id, "$subscibers.subsciber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribeToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1
            }
        }
    ])

    console.log("channel Aggregate" , channel);

    if(!channel?.length){
        throw new ApiError(404, "channel does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200 , " channel user fetched"))
})

const getWatchHistory= asyncHandler (async (req,res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "wawatchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField:'owner',
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project: {
                                        fullname: 1,
                                        avatar: 1,
                                        username: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].getWatchHistory,
            "watch history fetched successfully"
        )
    )
})

export { registerUser , loginUser , logoutUser , refreshAccessToken , changeUserPassword  , getUser , upDateAccountDetails , updateUserAvatar , updateUserCoverImage , getUserChannelProfile , getWatchHistory}