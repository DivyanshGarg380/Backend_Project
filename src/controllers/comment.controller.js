import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import {apiError, ApiError} from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const{ page = 1, limit = 10} = req.query;

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video ID");
    }

    const options = {
        page: Number(page),
        limit: Number(limit)
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])

    const comments = await Comment.aggregatePaginate(commentsAggregate, options);

    return res.status(200).json(new apiResponse(200, comments, "Comments fetched Successfully"));
})

const addComment = asyncHandler(async (req, res)=> {
    const { videoId } = req.params;
    const { content } = req.body;
    if(!content?.trim()){
        throw new apiError(400, "Comment content is required");
    }
    if(!mongoose.isValidObjectId(videoId)){
        throw new apiError(400, "Invalid video ID");
    }


    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })

    return res.status(200).json(new apiResponse(200, comment, "Comment added successfully"));
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if(!mongoose.isValidObjectId(commentId)){
        throw new apiError(400, "Invalid comment ID");
    }

    if(!content?.trim()){
        throw new apiError(400, "Updated Content is required");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new apiError(404, "Comment not found");
    }

    if(comment.owner.toString() !== req.user?._id.toString()){
        throw new apiError(403, "You are not allowed to update this comment" );
    }

    comment.content = content;
    await comment.save();

    return res.status(200).json(new apiResponse(200, comment, "Comment updated successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if(!mongoose.isValidObjectId(commentId)){
        throw new apiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new apiError(404, "Comment not found");
    }

    if(comment.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You are not allowed to delete this comment")
    }

    await comment.deleteOne();

    return res.status(200).json(new apiResponse(200, {}, "Comment deleted Successfully"));
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}