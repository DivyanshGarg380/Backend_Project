import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if(!name?.trim()  || !description?.trim()){
        throw new apiError(400, "Name and Description are required");
    }

    const playList = await Playlist.create({
        name,
        description,
        owner: req.user._id
    })
    
    return res.status(201).json(new apiResponse(201, playList, "Playlist created Successfully "));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new apiError(400, "Invalid user id")
    }

    const playlists = await Playlist.find({ owner: userId })

    return res.status(200).json(new apiResponse(200, playlists, "User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId).populate("videos")

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    return res.status(200).json(new apiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid playlist or video id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new apiError(403, "Not authorized to modify this playlist")
    }

    if (playlist.videos.includes(videoId)) {
        throw new apiError(400, "Video already in playlist")
    }

    playlist.videos.push(videoId)
    await playlist.save()

    return res.status(200).json(new apiResponse(200, playlist, "Video added to playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid playlist or video id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new apiError(403, "Not authorized to modify this playlist")
    }

    playlist.videos = playlist.videos.filter(
        (vid) => vid.toString() !== videoId
    )

    await playlist.save()

    return res.status(200).json(new apiResponse(200, playlist, "Video removed from playlist"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new apiError(403, "Not authorized to delete this playlist")
    }

    await playlist.deleteOne()

    return res.status(200).json(new apiResponse(200, {}, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new apiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new apiError(403, "Not authorized to update this playlist")
    }

    if (name) playlist.name = name
    if (description) playlist.description = description

    await playlist.save()

    return res.status(200).json(new apiResponse(200, playlist, "Playlist updated successfully"))
})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}