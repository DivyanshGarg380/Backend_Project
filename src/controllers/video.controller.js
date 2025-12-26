import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query

    const matchStage = { isPublished: true }

    if (query) {
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    if (userId && isValidObjectId(userId)) {
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const videosAggregate = Video.aggregate([
        { $match: matchStage },
        {
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        }
    ])

    const options = {
        page: Number(page),
        limit: Number(limit)
    }

    const videos = await Video.aggregatePaginate(videosAggregate, options)

    return res.status(200).json(new apiResponse(200, videos, "Videos fetched successfully"))
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title?.trim() || !description?.trim()) {
        throw new apiError(400, "Title and description are required")
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoLocalPath || !thumbnailLocalPath) {
        throw new apiError(400, "Video file and thumbnail are required")
    }

    const videoUpload = await uploadOnCloudinary(videoLocalPath)
    const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoUpload || !thumbnailUpload) {
        throw new apiError(500, "Failed to upload files")
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        duration: videoUpload.duration || 0,
        owner: req.user._id
    })

    return res.status(201).json(new apiResponse(201, video, "Video published successfully"))
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId).populate("owner")

    if (!video || !video.isPublished) {
        throw new apiError(404, "Video not found")
    }

    return res.status(200).json(new apiResponse(200, video, "Video fetched successfully"))
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new apiError(403, "Not authorized to update this video")
    }

    if (title) video.title = title
    if (description) video.description = description

    const thumbnailLocalPath = req.file?.path
    if (thumbnailLocalPath) {
        const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath)
        if (thumbnailUpload) {
            video.thumbnail = thumbnailUpload.url
        }
    }

    await video.save()

    return res.status(200).json(new apiResponse(200, video, "Video updated successfully"))
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new apiError(403, "Not authorized to delete this video")
    }

    await video.deleteOne()

    return res.status(200).json(new apiResponse(200, {}, "Video deleted successfully"))
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new apiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new apiError(403, "Not authorized")
    }

    video.isPublished = !video.isPublished
    await video.save()

    return res.status(200).json(new apiResponse(200,video,`Video ${video.isPublished ? "published" : "unpublished"}`))
})



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}