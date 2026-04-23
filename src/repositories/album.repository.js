import Album from "../models/album.model.js";

class AlbumRepository {
  async create(albumData) {
    return await Album.create(albumData);
  }

  async findById(id) {
    return await Album.findById(id).populate("tracks.track_id");
  }

  async findByPermalink(artistId, permalink) {
    return await Album.findOne({ artist_id: artistId, permalink })
      .populate("tracks.track_id");
  }

  async update(id, updateData) {
    return await Album.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await Album.findByIdAndDelete(id);
  }

  async findByArtist(artistId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const albums = await Album.find({ artist_id: artistId, visibility: "public" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Album.countDocuments({ artist_id: artistId, visibility: "public" });
    
    return { albums, total };
  }

  async addTracks(albumId, trackIds) {
    const album = await Album.findById(albumId);
    if (!album) throw new Error("Album not found");

    const startPosition = album.tracks.length;
    const newTracks = trackIds.map((id, index) => ({
      track_id: id,
      position: startPosition + index,
    }));

    album.tracks.push(...newTracks);
    album.track_count = album.tracks.length;
    
    // We would ideally calculate total_duration here by fetching track info
    return await album.save();
  }

  async reorderTracks(albumId, orderedIds) {
    const album = await Album.findById(albumId);
    if (!album) throw new Error("Album not found");

    album.tracks = orderedIds.map((id, index) => ({
      track_id: id,
      position: index,
    }));

    return await album.save();
  }

  async removeTrack(albumId, trackId) {
    const album = await Album.findById(albumId);
    if (!album) throw new Error("Album not found");

    album.tracks = album.tracks.filter(
      (t) => t.track_id.toString() !== trackId.toString()
    );

    // Re-index positions
    album.tracks.forEach((t, i) => (t.position = i));
    album.track_count = album.tracks.length;

    return await album.save();
  }

  async countByArtist(artistId) {
    return await Album.countDocuments({ artist_id: artistId });
  }
}

export default new AlbumRepository();
