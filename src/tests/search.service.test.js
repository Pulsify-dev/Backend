import { expect } from "chai";
import sinon from "sinon";
import meilisearchClient from "../config/meilisearch.js";
import searchService from "../services/search.service.js";
import { ServerError } from "../utils/errors.utils.js";

describe("SearchService", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("globalSearch", () => {
    it("should return empty arrays if no query provided", async () => {
      const result = await searchService.globalSearch("");
      expect(result).to.deep.equal({ tracks: [], users: [], playlists: [] });
    });

    it("should include lyrics in attributesToSearchOn if query has 4 or more words", async () => {
      const mockMultiSearch = sinon.stub(meilisearchClient, "multiSearch").resolves({
        results: [
          { indexUid: "tracks", hits: [{ id: "1", title: "Test Track" }] },
          { indexUid: "users", hits: [] },
          { indexUid: "playlists", hits: [] }
        ]
      });

      const result = await searchService.globalSearch("one two three four", 10, 0);

      expect(mockMultiSearch.calledOnce).to.be.true;
      const queries = mockMultiSearch.firstCall.args[0].queries;
      const trackQuery = queries.find(q => q.indexUid === "tracks");
      expect(trackQuery.attributesToSearchOn).to.include("lyrics");
    });

    it("should NOT include lyrics in attributesToSearchOn if query has less than 4 words", async () => {
      const mockMultiSearch = sinon.stub(meilisearchClient, "multiSearch").resolves({
        results: [
          { indexUid: "tracks", hits: [{ id: "1", title: "Test Track" }] },
          { indexUid: "users", hits: [{ id: "2", username: "testuser" }] },
          { indexUid: "playlists", hits: [] }
        ]
      });

      const result = await searchService.globalSearch("test query", 10, 0);

      expect(mockMultiSearch.calledOnce).to.be.true;
      const queries = mockMultiSearch.firstCall.args[0].queries;
      const trackQuery = queries.find(q => q.indexUid === "tracks");
      
      expect(trackQuery.attributesToSearchOn).to.not.include("lyrics");
      expect(result.tracks).to.deep.equal([{ id: "1", title: "Test Track" }]);
      expect(result.users).to.deep.equal([{ id: "2", username: "testuser" }]);
      expect(result.playlists).to.deep.equal([]);
    });

    it("should throw error if multiSearch fails", async () => {
      sinon.stub(meilisearchClient, "multiSearch").rejects(new Error("Search failed"));

      try {
        await searchService.globalSearch("test");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(ServerError);
        expect(error.message).to.equal("Global search failed: Search failed");
      }
    });
  });

  describe("searchSuggestions", () => {
    it("should return empty arrays if no query provided", async () => {
      const result = await searchService.searchSuggestions("");
      expect(result).to.deep.equal({ tracks: [], users: [], playlists: [] });
    });

    it("should perform searchSuggestions and map results correctly", async () => {
      const mockMultiSearch = sinon.stub(meilisearchClient, "multiSearch").resolves({
        results: [
          { indexUid: "tracks", hits: [{ id: "1", title: "Test Track" }] },
          { indexUid: "users", hits: [] },
          { indexUid: "playlists", hits: [] }
        ]
      });

      const result = await searchService.searchSuggestions("test", 5);

      expect(mockMultiSearch.calledOnce).to.be.true;
      const queries = mockMultiSearch.firstCall.args[0].queries;
      const trackQuery = queries.find(q => q.indexUid === "tracks");
      
      expect(trackQuery.attributesToSearchOn).to.not.include("lyrics");
      expect(trackQuery.attributesToRetrieve).to.include("title");
      
      expect(result.tracks).to.deep.equal([{ id: "1", title: "Test Track" }]);
    });

    it("should throw error if multiSearch fails", async () => {
      sinon.stub(meilisearchClient, "multiSearch").rejects(new Error("Suggestions failed"));

      try {
        await searchService.searchSuggestions("test");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(ServerError);
        expect(error.message).to.equal("Search suggestions failed: Suggestions failed");
      }
    });
  });

  describe("indexDocument", () => {
    it("should add document to index", async () => {
      const mockAddDocuments = sinon.stub().resolves();
      sinon.stub(meilisearchClient, "index").returns({ addDocuments: mockAddDocuments });

      await searchService.indexDocument("tracks", { id: "1", title: "Test" });

      expect(meilisearchClient.index.calledWith("tracks")).to.be.true;
      expect(mockAddDocuments.calledWith([{ id: "1", title: "Test" }])).to.be.true;
    });

    it("should throw InternalServerError when index fails", async () => {
      const mockAddDocuments = sinon.stub().rejects(new Error("Index failed"));
      sinon.stub(meilisearchClient, "index").returns({ addDocuments: mockAddDocuments });

      try {
        await searchService.indexDocument("tracks", { id: "1", title: "Test" });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(ServerError);
        expect(error.message).to.equal("Error indexing document in tracks: Index failed");
      }
    });
  });

  describe("removeDocument", () => {
    it("should remove document from index", async () => {
      const mockDeleteDocument = sinon.stub().resolves();
      sinon.stub(meilisearchClient, "index").returns({ deleteDocument: mockDeleteDocument });

      await searchService.removeDocument("tracks", "1");

      expect(meilisearchClient.index.calledWith("tracks")).to.be.true;
      expect(mockDeleteDocument.calledWith("1")).to.be.true;
    });

    it("should throw InternalServerError when delete fails", async () => {
      const mockDeleteDocument = sinon.stub().rejects(new Error("Delete failed"));
      sinon.stub(meilisearchClient, "index").returns({ deleteDocument: mockDeleteDocument });

      try {
        await searchService.removeDocument("tracks", "1");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(ServerError);
        expect(error.message).to.equal("Error deleting document from tracks: Delete failed");
      }
    });
  });
});
