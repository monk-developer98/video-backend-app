import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

const useSchema = new mongoose.Schema(
    {
        username:{
            type: String,
            required : true,
            unique: true,
            lowercase: true,
            trim: true,
            index : true
        },
        email:{
            type: String,
            required : true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname:{
            type: String,
            required : true,
            trim: true,
            index: true
        },
        avatar:{
            type: String, // Cloudinary url
            required : true,
        },
        coverImage:{
            type: String, // Cloudinary url
            required : true,
        },
        watchHistory:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type : String,
            required : [true , 'Password is required']
        },
        refreshtoken: {
            type: 
            String
        }
    },{
        timestamps:true
    }
)

useSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next();
    this.password = bcrypt.hash(this.password, 10)
    next();
})

useSchema.methods.isPasswordCorrect = async function (password) {
   return await bcrypt.compare(password, this.password)
}

useSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

useSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", useSchema)