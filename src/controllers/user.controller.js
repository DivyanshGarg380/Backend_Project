import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const generateAccessAndRefreshToken = async(userId) => {
    try{
        const user = await User.findById(userId);
        if(!user){
            throw new apiError(404, "User not found");
        }
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();   
        
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        return { accessToken, refreshToken };

    }catch(error){
        throw new apiError(500, "Token generation failed");
    }
}

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


    const { fullname, email, username, password }  = req.body;
    console.log(fullname, email, username, password);
    if([fullname, email, username, password].some((field) => field ?.trim() === "")){
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
        fullname,
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

const loginUser = asyncHandler(async (req, res) => {
    // req body -> username, password
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookies
    const { email, username, password } = req.body;
    if(!((username || email) && password)){
        throw new apiError(400, "Username or email and password are required");
    }
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new apiError(404, "User not found");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new apiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new apiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        }, 
        "User logged in successfully")
    )
});

const logoutUser = asyncHandler(async (req, res) => {
    // clear cookies
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        {
            new: true,
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new apiResponse(200, {}, "User logged out successfully")
    )
})

export { registerUser, loginUser, logoutUser };