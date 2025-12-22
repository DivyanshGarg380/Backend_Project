import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists
    // check for images, check for avatar
    // upload avatar to cloudinary
    // create user object - create entry in db
    // remove password and refresh token fields from response
    // check for user creation success
    // return response


    const { fullName, email, username, password }  = req.body;
    console.log(fullName, email, username, password);
    if([fullName, email, username, password].some((field) => field ?.trim() === "")){
        throw new apiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new apiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log("Avatar local path:", avatarLocalPath);
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    console.log("Cover image local path:", coverImageLocalPath);

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar image is required");
    }
    if(!coverImageLocalPath){
        throw new apiError(400, "Cover image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    const newUser = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })

    const createdUser = await User.findByIdAndUpdate(newUser._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new apiError(500, "User registration failed, please try again");
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered successfully")
    )

});

export { registerUser }