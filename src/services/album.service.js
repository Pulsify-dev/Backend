import albumRepository from "../repositories/album.repository.js";
import trackRepository from "../repositories/track.repository.js";
import trackService from "./track.service.js";
import S3Utils from "../utils/s3.utils.js";
import photoUtils from "../utils/photo.utils.js";
import subscriptionService from "./subscription.service.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../utils/errors.utils.js";

const MAX_COVER_BYTES = 10 * 1024 * 1024; // 10 MB

const normalizeTrackIds = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      throw new BadRequestError("track_ids must be a valid JSON array.");
    }
  }

  return [value];
};

const parseTracksMetadata = (value) => {
  if (!value) return [];

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) {
      throw new BadRequestError("tracks_metadata must be a valid JSON array.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new BadRequestError("tracks_metadata must be a valid JSON array.");
  }
};

const validateTrackFileIndexes = (tracksMetadata, audioFiles, trackArtworkFiles) => {
  const usedAudioIndexes = new Set();

  tracksMetadata.forEach((trackMeta, index) => {
    if (!Number.isInteger(trackMeta.audio_index) || !audioFiles[trackMeta.audio_index]) {
      throw new BadRequestError(
        `tracks_metadata[${index}].audio_index does not match an uploaded audio file.`,
      );
    }

    if (usedAudioIndexes.has(trackMeta.audio_index)) {
      throw new BadRequestError(
        `tracks_metadata[${index}].audio_index is duplicated in this request.`,
      );
    }
    usedAudioIndexes.add(trackMeta.audio_index);

    if (
      trackMeta.artwork_index !== undefined &&
      (!Number.isInteger(trackMeta.artwork_index) ||
        !trackArtworkFiles[trackMeta.artwork_index])
    ) {
      throw new BadRequestError(
        `tracks_metadata[${index}].artwork_index does not match an uploaded track artwork file.`,
      );
    }
  });
};

class AlbumService {
  async createAlbum(
    userId,
    albumData,
    coverFile,
    audioFiles = [],
    trackArtworkFiles = [],
  ) {
    if (!albumData.title) throw new BadRequestError("Album title is required.");
    if (!albumData.genre) throw new BadRequestError("Album genre is required.");

    // ── Album creation quota ──
    const entitlement = await subscriptionService.getPlanLimitForUser(userId);
    if (Number.isInteger(entitlement.planLimit.album_limit)) {
      const albumCount = await albumRepository.countByArtist(userId);
      if (albumCount >= entitlement.planLimit.album_limit) {
        throw new ForbiddenError(
          `Album limit reached for ${entitlement.effectivePlan} plan (${entitlement.planLimit.album_limit} albums).`,
        );
      }
    }

    if (coverFile) {
      photoUtils.validateImageFile(coverFile, MAX_COVER_BYTES);
    }

    let artworkUrl;
    const createdTracks = [];
    if (coverFile) {
      artworkUrl = await S3Utils.uploadToS3(coverFile, "albums/artwork");
    }

    const tracksMetadata = parseTracksMetadata(albumData.tracks_metadata);

    const normalizedTrackIds = normalizeTrackIds(albumData.track_ids);
    validateTrackFileIndexes(tracksMetadata, audioFiles, trackArtworkFiles);

    let tracks = [];
    let totalDuration = 0;
    if (normalizedTrackIds.length > 0) {
      for (let i = 0; i < normalizedTrackIds.length; i++) {
        const trackId = normalizedTrackIds[i];
        const track = await trackRepository.findById(trackId);
        if (!track) throw new NotFoundError(`Track ${trackId} not found.`);
        if (track.artist_id.toString() !== userId.toString()) {
          throw new ForbiddenError(`Track ${trackId} does not belong to you.`);
        }
        tracks.push({ track_id: trackId, position: i });
        totalDuration += track.duration || 0;
      }
    }

    for (const trackMeta of tracksMetadata) {
      const trackArtworkFile =
        trackMeta.artwork_index !== undefined
          ? trackArtworkFiles[trackMeta.artwork_index]
          : undefined;

      const createdTrack = await trackService.createTrackFromUpload(
        userId,
        {
          title: trackMeta.title,
          genre: trackMeta.genre || albumData.genre,
          description: trackMeta.description,
          tags: trackMeta.tags,
          lyrics: trackMeta.lyrics,
          visibility: trackMeta.visibility,
          preview_start_seconds: trackMeta.preview_start_seconds,
          artwork_url:
            trackMeta.artwork_index === undefined ? artworkUrl : undefined,
        },
        audioFiles[trackMeta.audio_index],
        trackArtworkFile,
      );

      createdTracks.push(createdTrack);
      tracks.push({ track_id: createdTrack._id, position: tracks.length });
      totalDuration += createdTrack.duration || 0;
    }

    const newAlbum = {
      ...albumData,
      artist_id: userId,
      tracks,
      track_count: tracks.length,
      total_duration: totalDuration,
      ...(artworkUrl && { artwork_url: artworkUrl }),
    };

    try {
      return await albumRepository.create(newAlbum);
    } catch (error) {
      await Promise.all(
        createdTracks.map(async (track) => {
          await trackRepository.deleteById(track._id).catch(() => {});
          await S3Utils.deleteFromS3(track.audio_url).catch(() => {});
          await S3Utils.deleteFromS3(track.artwork_url).catch(() => {});
        }),
      );

      await S3Utils.deleteFromS3(artworkUrl).catch(() => {});
      throw error;
    }
  }

  async getAlbumById(id, userId = null) {
    const album = await albumRepository.findById(id);
    if (!album) throw new NotFoundError("Album not found.");

    const isOwner = userId && album.artist_id.toString() === userId.toString();

    // Check visibility
    if (!isOwner) {
      if (album.is_hidden || album.visibility === "private") {
        throw new ForbiddenError("You do not have permission to view this album.");
      }
    }

    return album;
  }

  async getArtistAlbums(artistId, page = 1, limit = 20, requesterId = null) {
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const isOwner = requesterId && artistId.toString() === requesterId.toString();

    return await albumRepository.findByArtist(artistId, parsedPage, parsedLimit, isOwner);
  }

  async updateAlbum(userId, albumId, updateData) {
    const album = await albumRepository.findById(albumId);
    if (!album) throw new NotFoundError("Album not found.");

    if (album.artist_id.toString() !== userId.toString()) {
      throw new ForbiddenError("You are not the owner of this album.");
    }

    const allowedFields = ["title", "description", "genre", "type", "visibility", "is_hidden", "release_date"];
    const filteredUpdate = {};
    let hasUpdates = false;

    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        filteredUpdate[key] = updateData[key];
        hasUpdates = true;
      }
    }

    if (!hasUpdates) {
      throw new BadRequestError("No valid fields to update.");
    }

    return await albumRepository.update(albumId, filteredUpdate);
  }

  async updateArtwork(userId, albumId, coverFile) {
    if (!coverFile) throw new BadRequestError("Cover file is required.");

    const album = await albumRepository.findById(albumId);
    if (!album) throw new NotFoundError("Album not found.");

    if (album.artist_id.toString() !== userId.toString()) {
      throw new ForbiddenError("You are not the owner of this album.");
    }

    photoUtils.validateImageFile(coverFile, MAX_COVER_BYTES);

    // Upload new artwork
    const newArtworkUrl = await S3Utils.uploadToS3(coverFile, "albums/artwork");

    // Delete old artwork if it's not the default
    if (
      album.artwork_url &&
      !album.artwork_url.includes("default-album-artwork.png")
    ) {
      await S3Utils.deleteFromS3(album.artwork_url).catch((err) =>
        console.error(`[S3] Failed to delete old album artwork: ${err.message}`)
      );
    }

    return await albumRepository.update(albumId, { artwork_url: newArtworkUrl });
  }

  async deleteAlbum(userId, albumId) {
    const album = await albumRepository.findById(albumId);
    if (!album) throw new NotFoundError("Album not found.");

    if (album.artist_id.toString() !== userId.toString()) {
      throw new ForbiddenError("You are not the owner of this album.");
    }

    // Delete artwork from S3
    if (
      album.artwork_url &&
      !album.artwork_url.includes("default-album-artwork.png")
    ) {
      await S3Utils.deleteFromS3(album.artwork_url).catch((err) =>
        console.error(`[S3] Failed to delete album artwork: ${err.message}`)
      );
    }

    await albumRepository.delete(albumId);
    return { message: "Album deleted successfully." };
  }

  async addTracks(userId, albumId, trackIds) {
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      throw new BadRequestError("track_ids must be a non-empty array.");
    }

    const album = await albumRepository.findById(albumId);
    if (!album) throw new NotFoundError("Album not found.");

    if (album.artist_id.toString() !== userId.toString()) {
      throw new ForbiddenError("You are not the owner of this album.");
    }

    let additionalDuration = 0;
    // Check that all tracks exist and belong to this artist
    for (const trackId of trackIds) {
      const track = await trackRepository.findById(trackId);
      if (!track) {
        throw new NotFoundError(`Track ${trackId} not found.`);
      }
      if (track.artist_id.toString() !== userId.toString()) {
        throw new ForbiddenError(`Track ${trackId} does not belong to you.`);
      }
      
      // Prevent duplicates in the same album
      const alreadyInAlbum = album.tracks.some(
        (t) => t.track_id._id?.toString() === trackId.toString() || t.track_id.toString() === trackId.toString()
      );
      if (alreadyInAlbum) {
        throw new BadRequestError(`Track ${trackId} is already in this album.`);
      }

      additionalDuration += track.duration || 0;
    }

    // ── Per-album track quota ──
    const entitlement = await subscriptionService.getPlanLimitForUser(userId);
    if (Number.isInteger(entitlement.planLimit.album_track_limit)) {
      const newTotal = album.tracks.length + trackIds.length;
      if (newTotal > entitlement.planLimit.album_track_limit) {
        throw new ForbiddenError(
          `Album track limit reached for ${entitlement.effectivePlan} plan (${entitlement.planLimit.album_track_limit} tracks per album).`,
        );
      }
    }

    const newTotalDuration = (album.total_duration || 0) + additionalDuration;

    return await albumRepository.addTracks(albumId, trackIds, newTotalDuration);
  }

  async removeTrack(userId, albumId, trackId) {
    const album = await albumRepository.findById(albumId);
    if (!album) throw new NotFoundError("Album not found.");

    if (album.artist_id.toString() !== userId.toString()) {
      throw new ForbiddenError("You are not the owner of this album.");
    }

    // Find the track to subtract its duration
    const trackToRemove = await trackRepository.findById(trackId);
    const durationToSubtract = trackToRemove ? (trackToRemove.duration || 0) : 0;
    const newTotalDuration = Math.max(0, (album.total_duration || 0) - durationToSubtract);

    return await albumRepository.removeTrack(albumId, trackId, newTotalDuration);
  }

  async reorderTracks(userId, albumId, orderedIds) {
    if (!Array.isArray(orderedIds)) {
      throw new BadRequestError("orderedIds must be an array.");
    }

    const album = await albumRepository.findById(albumId);
    if (!album) throw new NotFoundError("Album not found.");

    if (album.artist_id.toString() !== userId.toString()) {
      throw new ForbiddenError("You are not the owner of this album.");
    }

    if (orderedIds.length !== album.tracks.length) {
      throw new BadRequestError("orderedIds length must match the current number of tracks.");
    }

    // Verify all IDs match current tracks
    const currentTrackIds = album.tracks.map((t) => (t.track_id._id || t.track_id).toString());
    for (const id of orderedIds) {
      if (!currentTrackIds.includes(id.toString())) {
        throw new BadRequestError(`Track ${id} is not in this album.`);
      }
    }

    return await albumRepository.reorderTracks(albumId, orderedIds);
  }
}

export default new AlbumService();
