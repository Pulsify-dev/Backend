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

  async findByArtist(artistId, page = 1, limit = 20, includeHidden = false) {
    const skip = (page - 1) * limit;
    const filter = { artist_id: artistId, visibility: "public" };
    if (!includeHidden) filter.is_hidden = false;

    const albums = await Album.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Album.countDocuments(filter);
    
    return { albums, total };
  }

  async addTracks(albumId, trackIds, totalDuration) {
    const album = await Album.findById(albumId);
    if (!album) throw new Error("Album not found");

    const startPosition = album.tracks.length;
    const newTracks = trackIds.map((id, index) => ({
      track_id: id,
      position: startPosition + index,
    }));

    album.tracks.push(...newTracks);
    album.track_count = album.tracks.length;
    
    if (totalDuration !== undefined) {
      album.total_duration = totalDuration;
    }

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

  async removeTrack(albumId, trackId, totalDuration) {
    const album = await Album.findById(albumId);
    if (!album) throw new Error("Album not found");

    album.tracks = album.tracks.filter(
      (t) => t.track_id.toString() !== trackId.toString()
    );

    // Re-index positions
    album.tracks.forEach((t, i) => (t.position = i));
    album.track_count = album.tracks.length;

    if (totalDuration !== undefined) {
      album.total_duration = totalDuration;
    }

    return await album.save();
  }

  async countByArtist(artistId) {
    return await Album.countDocuments({ artist_id: artistId });
  }

  async hideOldestAlbums(artistId, keepCount) {
    const albumsToHide = await Album.find({ artist_id: artistId, is_hidden: false })
      .sort({ createdAt: -1 })
      .skip(keepCount)
      .select("_id")
      .lean();

    if (albumsToHide.length === 0) return 0;

    const albumIds = albumsToHide.map((a) => a._id);
    const result = await Album.updateMany(
      { _id: { $in: albumIds } },
      { $set: { is_hidden: true } }
    );

    return result.modifiedCount;
  }

  async getVisibleAlbumTrackIds(artistId) {
    const visibleAlbums = await Album.find({ artist_id: artistId, is_hidden: false })
      .select("tracks.track_id")
      .lean();

    const trackIds = new Set();
    for (const album of visibleAlbums) {
      for (const track of album.tracks) {
        if (track.track_id) {
          trackIds.add(track.track_id.toString());
        }
      }
    }
    return Array.from(trackIds);
  }

  async unhideAllAlbums(artistId) {
    const result = await Album.updateMany(
      { artist_id: artistId, is_hidden: true },
      { $set: { is_hidden: false } }
    );
    return result.modifiedCount;
  }

  async getAlbumModerationStats() {
    const total_hidden = await Album.countDocuments({ is_hidden: true });
    return { total_hidden };
  }

  async findPaginatedAlbums(filter, page, limit) {
    const skip = (page - 1) * limit;
    const [albums, total] = await Promise.all([
      Album.find(filter)
        .select("title artist_id is_hidden visibility track_count release_date createdAt")
        .populate("artist_id", "username email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Album.countDocuments(filter),
    ]);
    return { albums, total };
  }
}

export default new AlbumRepository();
