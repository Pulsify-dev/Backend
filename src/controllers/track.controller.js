import trackService from '../services/track.service.js';

// POST
const createTrack = async (req, res,next) => {
    try {
        const track = await trackService.createTrack(req.user.user_id, req.body,req.files.audio, req.files.cover);
        res.status(201).json(track);
    } catch (err) {
        next(err);
    }
}

// GET
const getTracks = async (req, res,next) => {
    try {
        const tracks = await trackService.getTracks();
        res.status(200).json(tracks);
    } catch (err) {
        next(err);
    }
}




export default {
    createTrack,
}