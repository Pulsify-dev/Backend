import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const BATCH_SIZE = 50; // Small batches to minimise RAM usage

const URL = process.env.MONGODB_URI;

await mongoose.connect(URL);
console.log("Connected to MongoDB for syncing.");

// Import Meilisearch client once
const client = (await import("../config/meilisearch.js")).default;

/**
 * Sync a single collection to Meilisearch using the smallest possible
 * memory footprint:
 *   - .select() only the fields we actually index (skip large fields)
 *   - .lean() returns plain objects instead of heavy Mongoose docs
 *   - .cursor({ batchSize }) tells the MongoDB driver to fetch N docs at a time
 *   - Flushes each batch to Meilisearch before loading the next one
 */
const syncCollection = async ({
    modelName,
    indexName,
    filter,
    select,
    populateCfg,
    transform,
}) => {
    const Model = mongoose.model(modelName);
    const index = client.index(indexName);

    let query = Model.find(filter || {});
    if (select) query = query.select(select);
    if (populateCfg) query = query.populate(populateCfg);
    query = query.lean();

    const cursor = query.cursor({ batchSize: BATCH_SIZE });

    let batch = [];
    let total = 0;

    for await (const doc of cursor) {
        try {
            const transformed = transform(doc);
            if (transformed) batch.push(transformed);
        } catch (_) {
            // Skip malformed documents
        }

        if (batch.length >= BATCH_SIZE) {
            await index.addDocuments(batch, { primaryKey: "id" });
            total += batch.length;
            batch = [];
            console.log(`  [${indexName}] ${total} synced...`);
        }
    }

    if (batch.length > 0) {
        await index.addDocuments(batch, { primaryKey: "id" });
        total += batch.length;
    }

    console.log(`OK ${indexName}: ${total} documents synced.\n`);
};

const run = async () => {
    console.log("Starting Meilisearch sync...\n");

    await syncCollection({
        modelName: "Track",
        indexName: "tracks",
        select: "title artist_id permalink description genre tags lyrics visibility playback_state play_count",
        populateCfg: { path: "artist_id", select: "display_name username" },
        transform: (doc) => ({
            id: doc._id.toString(),
            title: doc.title,
            artist_id: doc.artist_id?._id?.toString() || "",
            artist_name: doc.artist_id?.display_name || "",
            artist_username: doc.artist_id?.username || "",
            permalink: doc.permalink,
            description: doc.description,
            genre: doc.genre,
            tags: doc.tags,
            lyrics: doc.lyrics || null,
            visibility: doc.visibility,
            playback_state: doc.playback_state,
            play_count: doc.play_count,
        }),
    });

    await syncCollection({
        modelName: "User",
        indexName: "users",
        select: "username display_name role tier is_private is_verified is_suspended",
        transform: (doc) => ({
            id: doc._id.toString(),
            username: doc.username,
            display_name: doc.display_name,
            role: doc.role,
            tier: doc.tier,
            is_private: doc.is_private,
            is_verified: doc.is_verified,
            is_suspended: doc.is_suspended,
        }),
    });

    await syncCollection({
        modelName: "Playlist",
        indexName: "playlists",
        select: "title description creator_id permalink is_private track_count duration_ms",
        populateCfg: { path: "creator_id", select: "display_name username" },
        transform: (doc) => ({
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
        }),
    });

    await syncCollection({
        modelName: "Album",
        indexName: "albums",
        select: "title description artist_id permalink artwork_url genre type track_count visibility is_hidden createdAt",
        populateCfg: { path: "artist_id", select: "display_name username" },
        transform: (doc) => ({
            id: doc._id.toString(),
            title: doc.title,
            description: doc.description || "",
            artist_id: doc.artist_id?._id?.toString() || "",
            artist_name: doc.artist_id?.display_name || "",
            artist_username: doc.artist_id?.username || "",
            permalink: doc.permalink,
            artwork_url: doc.artwork_url,
            genre: doc.genre,
            type: doc.type,
            track_count: doc.track_count,
            visibility: doc.visibility,
            is_hidden: Boolean(doc.is_hidden),
            createdAt: doc.createdAt,
        }),
    });

    // Configure filterable attributes for albums index so globalSearch works
    console.log("Configuring filterable attributes for albums...");
    await client.index("albums").updateFilterableAttributes(["visibility", "is_hidden"]);

    console.log("Meilisearch sync complete.");
    process.exit(0);
};

// Need to import models so mongoose.model() works
import "../models/track.model.js";
import "../models/user.model.js";
import "../models/playlist.model.js";
import "../models/album.model.js";

run().catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
});
