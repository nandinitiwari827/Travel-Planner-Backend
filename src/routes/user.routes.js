import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { registerUser, loginUser, logoutUser, changeCurrentPassword, forgotPassword, getCurrentUser, refreshAccessToken} from "../controllers/user.controller.js";

let router=Router()

router.route("/register").post(registerUser)

router.route("/login").post(loginUser)

router.route("/logout").post(logoutUser, verifyJWT)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/forgot-password").post(verifyJWT, forgotPassword)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

export default router
