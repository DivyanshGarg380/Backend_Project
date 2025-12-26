import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

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

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if(!incomingRefreshToken){
        throw new apiError(401, "Unauthorized: No refresh token provided");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        const user = await User.findById(decodedToken?._id)
        if(!user || user.refreshToken !== incomingRefreshToken){
            throw new apiError(401, "Unauthorized: Invalid refresh token");
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
            new apiResponse(200, {
                accessToken,    
                newRefreshToken
            }, "Access token refreshed successfully")
        )
    } catch (error) {
        throw new apiError(401, "Unauthorized: Invalid refresh token");
    }

});

const changePassword = asyncHandler(async (req, res) => {
    // get old password and new password from req body
    const { oldPassword, newPassword } = req.body;
    if(!oldPassword || !newPassword){
        throw new apiError(400, "Old password and new password are required");
    }
    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new apiError(400, "Invalid old password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(
        new apiResponse(200, {}, "Password changed successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new apiResponse(200, req.user, "Current user fetched successfully")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname,email } = req.body;
    if(!fullname || !email){
        throw new apiError(400, "Fullname and email are required");
    }
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullname,
                email: email.toLowerCase(),
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new apiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.avatar[0]?.path;
    if(!avatarLocalPath){
        throw new apiError(400, "Avatar image is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new apiResponse(200, updatedUser, "Avatar updated successfully")
    );
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.coverImage[0]?.path;
    if(!coverImageLocalPath){
        throw new apiError(400, "Cover image is required");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url,
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new apiResponse(200, updatedUser, "Cover image updated successfully")
    );
});

// Some advanced topics - aggregation, lookup, addFields for SDE-2/3 People :(

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if(!username?.trim()){
        throw new apiError(400, "Username is required");
    }
    const channel = await User.aggregate([
        {
            $match: { username: username.toLowerCase() }
        },
        { $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },{
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },{
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [ req.user._id, "$subscribers.subscriber" ] },
                        then: true,
                        else: false
                    }
                }
            }
        },{
            $project: {
                fullname: 1,
                username: 1,
                subscribedToCount: 1,
                subscribersCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ]);

    if(!channel || channel.length === 0){
        throw new apiError(404, "Channel not found");
    }
    return res.status(200).json(
        new apiResponse(200, channel[0], "Channel profile fetched successfully")
    );
});



export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateCoverImage, getUserChannelProfile };