import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    
    if(!mongoose.isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video ID");
    }
    
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    })

    if(existingLike){
        await existingLike.deleteOne()
        return res.status(200).json(new apiResponse(200, {} , "Video Unliked"));
    }
    await Like.create({
        video: videoId,
        likedBy: req.user._id
    })
    return res.status(201).json(new apiResponse(201, {} , "Video Liked"));
})


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if(!mongoose.isValidObjectId(commentId)){
        throw new apiError(400,"Invalid Comment ID");
    }
    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    })
     if (existingLike) {
        await existingLike.deleteOne()
        return res.status(200).json(new apiResponse(200, {}, "Comment unliked"))
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id
    })

    return res.status(201).json(new apiResponse(201, {}, "Comment liked"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) {
        throw new apiError(400, "Invalid tweet id")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res.status(200).json(new apiResponse(200, {}, "Tweet unliked"))
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user._id
    })

    return res.status(201).json(new apiResponse(201, {}, "Tweet liked"))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.find({
        likedBy: req.user._id,
        video: { $ne: null }
    }).populate("video")

    return res.status(200).json(new apiResponse(200, likedVideos,"Liked videos fetched successfully"));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}