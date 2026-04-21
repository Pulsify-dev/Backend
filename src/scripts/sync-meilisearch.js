import mongoose from "mongoose";
import dotenv from "dotenv";
import Track from "../models/track.model.js";
import User from "../models/user.model.js";
import Playlist from "../models/playlist.model.js";
import searchService from "../services/search.service.js";

dotenv.config();

const URL = process.env.MONGODB_URI;

mongoose.connect(URL).then(() => {
    console.log("Connected to MongoDB for syncing.");
}).catch((err) => {
    console.error("MongoDB Connection Error: ", err);
    process.exit(1);
});

const syncDatabaseToMeilisearch = async () => {
    console.log("Starting Meilisearch sync...");

    try {
        console.log("Syncing Tracks...");
        const tracks = await Track.find({}).populate("artist_id", "display_name username");
        const trackDocs = tracks.map(doc => ({
            id: doc._id.toString(),
            title: doc.title,
            artist_id: doc.artist_id?._id?.toString() || "",
            artist_name: doc.artist_id?.display_name || "",
            artist_username: doc.artist_id?.username || "",
            permalink: doc.permalink,
            description: doc.description,
            genre: doc.genre,
            tags: doc.tags,
            visibility: doc.visibility,
            playback_state: doc.playback_state,
            play_count: doc.play_count,
        }));

        if (trackDocs.length > 0) {
            const trackIndex = (await import("../config/meilisearch.js")).default.index("tracks");
            await trackIndex.addDocuments(trackDocs, { primaryKey: "id" });
        }
        console.log(`Synced ${trackDocs.length} tracks.`);

        console.log("Syncing Users...");
        const users = await User.find({});
        const userDocs = users.map(doc => ({
            id: doc._id.toString(),
            username: doc.username,
            display_name: doc.display_name,
            role: doc.role,
            tier: doc.tier,
            is_private: doc.is_private,
            is_verified: doc.is_verified,
            is_suspended: doc.is_suspended,
        }));

        if (userDocs.length > 0) {
            const userIndex = (await import("../config/meilisearch.js")).default.index("users");
            await userIndex.addDocuments(userDocs);
        }
        console.log(`Synced ${userDocs.length} users.`);

        console.log("Syncing Playlists...");
        const playlists = await Playlist.find({}).populate("creator_id", "display_name username");
        const playlistDocs = playlists.map(doc => ({
            id: doc._id.toString(),
            title: doc.title,
            description: doc.description || "",
            creator_id: doc.creator_id?._id?.toString() || "",
            creator_name: doc.creator_id?.display_name || "",
            creator_username: doc.creator_id?.username || "",
            permalink: doc.permalink,
            is_private: doc.is_private,
            track_count: doc.track_count,
            duration_ms: doc.duration_ms,
        }));

        if (playlistDocs.length > 0) {
            const playlistIndex = (await import("../config/meilisearch.js")).default.index("playlists");
            await playlistIndex.addDocuments(playlistDocs, { primaryKey: "id" });
        }
        console.log(`Synced ${playlistDocs.length} playlists.`);

        console.log("Meilisearch sync complete.");
        process.exit(0);

    } catch (error) {
        console.error("Error during sync:", error);
        process.exit(1);
    }
};

syncDatabaseToMeilisearch();
