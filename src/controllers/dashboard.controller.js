import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = req.params._id;
    if(!mongoose.isValidObjectId(channelId)){
        throw new apiError(400, "Invalid Channel ID");
    }

    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum : 1},
                totalViews : { $sum: "$views"}
            }
        }
    ])

    const totalVideos = videoStats[0]?.totalVideos || 0;
    const totalViews = videoStats[0]?.totalViews || 0;

    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    })

    const channelVideoIds = await Video.find({ owener: channelId }).distinct("_id");

    const totalLikes = await Like.countDocuments({
        video: { $in: channelVideoIds }
    })

    return res.status(200).json(new apiResponse(200, {totalVideos, totalViews, totalSubscribers, totalLikes}, 
        "Channel Stats fetched Successfully"
    ))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const channelId = req.user._id;

    const videos = await Video.find({  owner: channelId }).toSorted({ createdAt: -1});
    return res.status(200).json(
        new apiResponse(200, videos, "Channel videos fetched successfully")
    )

})


export {
    getChannelStats, 
    getChannelVideos
}