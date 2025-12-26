import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel id")
    }

    if (channelId.toString() === req.user._id.toString()) {
        throw new apiError(400, "You cannot subscribe to yourself")
    }

    const channel = await User.findById(channelId);
    if(!channel){
        throw new apiError(404, "Channel not found");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    })

    if (existingSubscription) {
        await existingSubscription.deleteOne()
        return res.status(200).json(new apiResponse(200, {}, "Unsubscribed successfully"))
    }

    await Subscription.create({
        subscriber: req.user._id,
        channel: channelId
    })

    return res.status(201).json(new apiResponse(201, {}, "Subscribed successfully"))
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new apiError(400, "Invalid channel id")
    }

    const subscribers = await Subscription.find({
        channel: channelId
    }).populate("subscriber")

    return res.status(200).json(new apiResponse(200, subscribers, "Channel subscribers fetched successfully"))
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new apiError(400, "Invalid subscriber id")
    }

    const subscribedChannels = await Subscription.find({
        subscriber: subscriberId
    }).populate("channel")

    return res.status(200).json(new apiResponse(200, subscribedChannels, "Subscribed channels fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}