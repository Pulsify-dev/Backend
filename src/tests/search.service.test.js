import { expect } from "chai";
import sinon from "sinon";
import meilisearchClient from "../config/meilisearch.js";
import searchService from "../services/search.service.js";

describe("SearchService", () => {
    describe("globalSearch", () => {
        afterEach(() => {
            sinon.restore();
        });

        it("should return empty arrays if no query provided", async () => {
            const result = await searchService.globalSearch("");
            expect(result).to.deep.equal({ tracks: [], users: [], playlists: [] });
        });

        it("should perform multiSearch and map results correctly", async () => {
            const mockMultiSearch = sinon.stub(meilisearchClient, "multiSearch").resolves({
                results: [
                    { indexUid: "tracks", hits: [{ id: "1", title: "Test Track" }] },
                    { indexUid: "users", hits: [{ id: "2", username: "testuser" }] },
                    { indexUid: "playlists", hits: [] }
                ]
            });

            const result = await searchService.globalSearch("test", 10, 0);

            expect(mockMultiSearch.calledOnce).to.be.true;
            expect(mockMultiSearch.firstCall.args[0]).to.deep.equal({
                queries: [
                    { indexUid: "tracks", q: "test", limit: 10, offset: 0 },
                    { indexUid: "users", q: "test", limit: 10, offset: 0 },
                    { indexUid: "playlists", q: "test", limit: 10, offset: 0 }
                ]
            });

            expect(result.tracks).to.deep.equal([{ id: "1", title: "Test Track" }]);
            expect(result.users).to.deep.equal([{ id: "2", username: "testuser" }]);
            expect(result.playlists).to.deep.equal([]);
        });
    });
});
