import { Router } from "express";
import { changeUserPassword, getUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, upDateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controler.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post( 
        upload.fields([
            {
                name: "avatar",
                maxCount: 1
            },
            {
                name: "coverImage",
                maxCount: 1
            }
        ]),
        registerUser
    )

router.route("/login").post(loginUser)

// secured rutes
router.route("/logout").post(verifyJWT , logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT , changeUserPassword)
router.route("/current-user").get(verifyJWT, getUser)
router.route("/update-account").patch(verifyJWT, upDateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch( verifyJWT , upload.single("coverImage"), updateUserCoverImage)

// get params data
router.route("/c/:username").get(verifyJWT , getUserChannelProfile)
router.route("/watch-history").get(verifyJWT , getWatchHistory)

export default router