import meilisearchClient from "../config/meilisearch.js";

class SearchService {
  /**
    Search across all relevant indices
    @param {string} query 
    @param {number} limit 
    @param {number} offset 
   */
  async globalSearch(query, limit = 10, offset = 0) {
    if (!query) {
      return { tracks: [], users: [], playlists: [] };
    }

    try {
      const results = await meilisearchClient.multiSearch({
        queries: [
          { indexUid: "tracks", q: query, limit, offset },
          { indexUid: "users", q: query, limit, offset },
          { indexUid: "playlists", q: query, limit, offset },
        ],
      });

      return {
        tracks: results.results.find((r) => r.indexUid === "tracks")?.hits || [],
        users: results.results.find((r) => r.indexUid === "users")?.hits || [],
        playlists: results.results.find((r) => r.indexUid === "playlists")?.hits || [],
      };
    } catch (error) {
      console.error("Global search error:", error);
      throw error;
    }
  }

  /**
   * Lightweight autocomplete suggestions for the search bar.
   * Returns minimal fields capped at 5 results per category
   * for fast, as-you-type dropdown rendering.
   * @param {string} query
   * @param {number} limit  - max results per category (default: 5)
   */
  async searchSuggestions(query, limit = 5) {
    if (!query || !query.trim()) {
      return { tracks: [], users: [], playlists: [] };
    }

    try {
      const results = await meilisearchClient.multiSearch({
        queries: [
          {
            indexUid: "tracks",
            q: query,
            limit,
            attributesToRetrieve: [
              "id", "title", "artist_name", "artist_username", "permalink", "genre",
            ],
          },
          {
            indexUid: "users",
            q: query,
            limit,
            attributesToRetrieve: [
              "id", "username", "display_name", "is_verified",
            ],
          },
          {
            indexUid: "playlists",
            q: query,
            limit,
            attributesToRetrieve: [
              "id", "title", "creator_name", "creator_username", "permalink",
            ],
          },
        ],
      });

      return {
        tracks: results.results.find((r) => r.indexUid === "tracks")?.hits || [],
        users: results.results.find((r) => r.indexUid === "users")?.hits || [],
        playlists: results.results.find((r) => r.indexUid === "playlists")?.hits || [],
      };
    } catch (error) {
      console.error("Search suggestions error:", error);
      throw error;
    }
  }

  /*
    Add or update a document in a specific index
   */
  async indexDocument(indexName, document) {
    try {
      const index = meilisearchClient.index(indexName);
      await index.addDocuments([document]);
    } catch (error) {
      console.error(`Error indexing document in ${indexName}:`, error);
    }
  }

  /*
    Remove a document from a specific index
   */
  async removeDocument(indexName, documentId) {
    try {
      const index = meilisearchClient.index(indexName);
      await index.deleteDocument(documentId);
    } catch (error) {
      console.error(`Error deleting document from ${indexName}:`, error);
    }
  }
}

export default new SearchService();
