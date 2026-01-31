import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Booking } from "../models/booking.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

let generateAccessAndRefreshTokens=async(userId)=>{
    try{
        let user=await User.findById(userId)
        let accessToken=user.generateAccessToken()
        let refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    
    }catch(error){
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

let registerUser=asyncHandler(async(req, res)=>{
    let {fullName, email, phoneNumber, password, verifyPassword}=req.body

    if(!fullName){
        throw new ApiError(400, "FullName is required")
    }

      if(!email){
        throw new ApiError(400, "Email is required")
    }

      if(!phoneNumber){
        throw new ApiError(400, "Please enter your phone number")
    }

      if(!password){
        throw new ApiError(400, "Password is required")
    }

      if(!verifyPassword){
        throw new ApiError(400, "Passwords should match")
    }

     if(password!==verifyPassword){
        throw new ApiError(409, "Passwords should be same")
    }

    let emailRegex=/^[\w.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/

    if(!emailRegex.test(email)){
        throw new ApiError(400, "Please enter email in a valid format")
    }

    let passwordRegex=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

    if(!passwordRegex.test(password)){
        throw new ApiError(400, "Password must be atleast 8 characters long, including 1 lowercase, 1 uppercase, 1 number and 1 special character")
    }

    let phoneNumberRegex=/^[0-9]{10}$/
   
    if(!phoneNumberRegex.test(phoneNumber)){
        throw new ApiError(400, "Phone number should be of 10 digits")
    }

    let existedUser=await User.findOne({email})

    if(existedUser){
        throw new ApiError(408, "User with email already exists")
    }

    let existingphoneNumber = await User.findOne({phoneNumber})
   
    if (existingphoneNumber) {
    throw new ApiError(409, "User with phone number already exists")
    }

    let user=await User.create({
        fullName,
        password,
        email,
        phoneNumber
    })

    let createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

let loginUser=asyncHandler(async(req, res)=>{
    let {email, phoneNumber, password}=req.body

    if(!phoneNumber && !email){
        throw new ApiError(400, "Email or phone number is required")
    }

    let user=await User.findOne({
        $or: [{phoneNumber}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    let isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Incorrect password")
    }

    let {accessToken, refreshToken}=await generateAccessAndRefreshTokens(user._id)
    let loggedInUser=await User.findById(user._id).select("-password -refreshToken")

   let options={
     httpOnly: true,
     secure: true,
     sameSite: "none"
   }

   return res.status(200).cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(new ApiResponse(200, {
    user: loggedInUser, accessToken, refreshToken
   },
   "User logged in Successfully"
))
})

let logoutUser = asyncHandler(async (req, res) => {
   
    let token=req.cookies?.accessToken

    if(!token){
        throw new ApiError(401, "No token provided")
    }

    let decodedToken
    try{
        decodedToken=jwt.decode(token)
        if(!decodedToken?._id){
            throw new ApiError(401, "Invalid token")
    }}catch(error){
        throw new ApiError(401, "Invalid token")
    }

    let user=await User.findById(decodedToken._id)
    if(!user){
        throw new ApiError(404, "User not found")
    }

        await User.findByIdAndUpdate(
       user._id,
        {
            $unset:{
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )   

    let options={
         httpOnly: true,
         secure: true,
         sameSite: "none"
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out Successfully"))
   
})

let refreshAccessToken=asyncHandler(async(req, res)=>{
    let incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try{
        let decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        let user=await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }

        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }

        let options={
            httpOnly: true,
            secure: true
        }

        let {accessToken, newRefreshToken}=await generateAccessAndRefreshTokens(user._id)

        return res.status(200).cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access token refreshed")
        )
    }catch(error){
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

let changeCurrentPassword=asyncHandler(async(req, res)=>{
     let {oldPassword, newPassword}=req.body

    if (!oldPassword || typeof oldPassword !== 'string' || oldPassword.trim() === '') {
    throw new ApiError(400, 'Old password is required and must be a non-empty string');
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim() === '') {
    throw new ApiError(400, 'New password is required and must be a non-empty string');
  }

  if(oldPassword===newPassword){
    throw new ApiError(404, "old password and new password cannot be same")
  }

     let user=await User.findById(req.user?._id)
     if (!user) {
    throw new ApiError(404, 'User not found')
  }

  if (!user.password || typeof user.password !== 'string') {
    throw new ApiError(500, 'User password is missing or invalid in database')
  }
     let isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
 
     if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
     }

     let passwordRegex=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

     if(!passwordRegex.test(newPassword)){
        throw new ApiError(400, "New password must be atleast 8 characters long, including 1 lowercase, 1 uppercase, 1 number and 1 special character")
     }

     user.password=newPassword
     await user.save({validateBeforeSave: false})

     return res.status(200).json(new ApiResponse(200, {}, "Password updated successfully"))
})

let forgotPassword=asyncHandler(async(req, res)=>{
     let {email, phoneNumber, newPassword}=req.body

     if (!phoneNumber) {
     throw new ApiError(400, "Phone number is required");
  }

    if (!email) {
    throw new ApiError(400, "Email is required");
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim() === '') {
    throw new ApiError(401, 'New password is required and must be a non-empty string');
  }

     let user=await User.findOne({phoneNumber, email}) 
     if (!user) {
    throw new ApiError(404, 'User not found')
  }

     let passwordRegex=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

     if(!passwordRegex.test(newPassword)){
        throw new ApiError(400, "New password must be atleast 8 characters long, including 1 lowercase, 1 uppercase, 1 number and 1 special character")
     }

     user.password=newPassword
     await user.save({validateBeforeSave: false})

     return res.status(200).json(new ApiResponse(200, {}, "Password updated successfully"))
})

let getCurrentUser=asyncHandler(async(req, res)=>{
   let userId=req.user._id

    let user=await User.findOne(userId)
    .select("-password -refreshToken")
    .lean()

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

   let bookings=await Booking.find({user: userId}).sort({createdAt: -1})

   let totalBookings=bookings.length

   return res.status(200).json(
    new ApiResponse(200, { totalBookings, bookings, user}, "Fetched user bookings successfully"))
})

export {registerUser, loginUser, logoutUser, getCurrentUser, changeCurrentPassword, forgotPassword, refreshAccessToken}