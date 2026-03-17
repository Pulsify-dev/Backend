import Track from '../models/track.model.js';

const findById=function(id,extraFields=''){
    return Track.findById(id).select(extraFields);
};

const updateTrackById = function(id, updatedPatch){
    return Track.findByIdAndUpdate(id, updatedPatch, { new: true, runValidators: true });
};

const deleteById = function(id){
    return Track.findByIdAndDelete(id);
}

const findByPermalink = function(permalink, extraFields=''){
    return Track.findOne({permalink}).select(extraFields);
}

const searchTracks = async (q, page, limit) => {
    const filter = { is_hidden: false };
    
    if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i');
        filter.$or = [{ title: regex }, { description: regex }];
    }

    const tracks = await Track.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
    const total = await Track.countDocuments(filter);

    return { tracks, total };
};

const findByArtistId = function(artistId, extraFields=''){
    return Track.find({ artist_id: artistId }).select(extraFields).lean();
};

const countByArtistId = function(artistId){
    return Track.countDocuments({ artist_id: artistId });
};

 export default {
    findById,
    updateTrackById,
    deleteById,
    findByPermalink,
    searchTracks,
    findByArtistId,
    countByArtistId,
};