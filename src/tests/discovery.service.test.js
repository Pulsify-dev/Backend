import { expect } from "chai";
import sinon from "sinon";
import discoveryService from "../services/discovery.service.js";
import feedRepository from "../repositories/feed.repository.js";
import userRepository from "../repositories/user.repository.js";
import trackRepository from "../repositories/track.repository.js";
import playlistRepository from "../repositories/playlist.repository.js";
import albumRepository from "../repositories/album.repository.js";
import playHistoryRepository from "../repositories/play-history.repository.js";
import Follow from "../models/follow.model.js";
import cache from "../utils/cache.utils.js";
import { NotFoundError, BadRequestError } from "../utils/errors.utils.js";

describe("Discovery Service", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("getPersonalFeed", () => {
    it("should return personal feed", async () => {
      const mockFeed = [{ _id: "1", type: "track" }];
      sinon.stub(feedRepository, "getPersonalFeed").resolves(mockFeed);

      const result = await discoveryService.getPersonalFeed("user123", 1, 20);
      expect(result).to.deep.equal(mockFeed);
    });

    it("should throw BadRequestError for invalid pagination", async () => {
      try {
        await discoveryService.getPersonalFeed("user123", 0, 20);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("getUserProfileFeed", () => {
    it("should return user profile feed", async () => {
      const mockUser = { _id: "user123", is_suspended: false, is_private: false };
      const mockFeed = [{ _id: "1", type: "track" }];
      
      sinon.stub(userRepository, "findById").resolves(mockUser);
      sinon.stub(feedRepository, "getUserProfileFeed").resolves(mockFeed);

      const result = await discoveryService.getUserProfileFeed("user123", 1, 20);
      expect(result).to.deep.equal(mockFeed);
    });

    it("should throw NotFoundError if user not found", async () => {
      sinon.stub(userRepository, "findById").resolves(null);

      try {
        await discoveryService.getUserProfileFeed("user123", 1, 20);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw NotFoundError if user is suspended", async () => {
      sinon.stub(userRepository, "findById").resolves({ is_suspended: true });

      try {
        await discoveryService.getUserProfileFeed("user123", 1, 20);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw BadRequestError for invalid pagination", async () => {
      try {
        await discoveryService.getUserProfileFeed("user123", 1, 101);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("resolveUrl", () => {
    it("should resolve a user profile URL", async () => {
      const mockUser = { _id: "user123", username: "the_weeknd" };
      sinon.stub(userRepository, "findByUsername").resolves(mockUser);

      const result = await discoveryService.resolveUrl("https://pulsify.page/the_weeknd");
      expect(result.type).to.equal("user");
      expect(result.data).to.deep.equal(mockUser);
    });

    it("should resolve a playlist URL", async () => {
      const mockUser = { _id: "user123", username: "the_weeknd" };
      const mockPlaylist = { _id: "play123", title: "My Hits" };
      
      sinon.stub(userRepository, "findByUsername").resolves(mockUser);
      sinon.stub(playlistRepository, "findByPermalinkAndCreator").resolves(mockPlaylist);

      const result = await discoveryService.resolveUrl("/the_weeknd/sets/my-hits");
      expect(result.type).to.equal("playlist");
      expect(result.data).to.deep.equal(mockPlaylist);
    });

    it("should resolve a track URL", async () => {
      const mockUser = { _id: "user123", username: "the_weeknd" };
      const mockTrack = { _id: "track123", title: "Blinding Lights", is_hidden: false, status: "finished" };
      
      sinon.stub(userRepository, "findByUsername").resolves(mockUser);
      sinon.stub(trackRepository, "findByPermalinkAndArtist").returns({
        populate: sinon.stub().resolves(mockTrack)
      });

      const result = await discoveryService.resolveUrl("/the_weeknd/blinding-lights");
      expect(result.type).to.equal("track");
      expect(result.data).to.deep.equal(mockTrack);
    });

    it("should resolve an album URL when no track matches", async () => {
      const mockUser = { _id: "user123", username: "the_weeknd" };
      const mockAlbum = { _id: "album123", title: "After Hours", is_hidden: false, visibility: "public" };

      sinon.stub(userRepository, "findByUsername").resolves(mockUser);
      sinon.stub(trackRepository, "findByPermalinkAndArtist").returns({
        populate: sinon.stub().resolves(null)
      });
      sinon.stub(albumRepository, "findByPermalink").resolves(mockAlbum);

      const result = await discoveryService.resolveUrl("/the_weeknd/after-hours");
      expect(result.type).to.equal("album");
      expect(result.data).to.deep.equal(mockAlbum);
    });

    it("should throw BadRequestError for missing URL", async () => {
      try {
        await discoveryService.resolveUrl("");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw NotFoundError if user does not exist", async () => {
      sinon.stub(userRepository, "findByUsername").resolves(null);

      try {
        await discoveryService.resolveUrl("/unknown_user");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw NotFoundError if track is hidden and no album fallback exists", async () => {
      const mockUser = { _id: "user123", username: "the_weeknd" };
      const mockTrack = { _id: "track123", title: "Secret", is_hidden: true, status: "finished" };
      
      sinon.stub(userRepository, "findByUsername").resolves(mockUser);
      sinon.stub(trackRepository, "findByPermalinkAndArtist").returns({
        populate: sinon.stub().resolves(mockTrack)
      });
      sinon.stub(albumRepository, "findByPermalink").resolves(null);

      try {
        await discoveryService.resolveUrl("/the_weeknd/secret");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it("should throw NotFoundError if resolved album is private or hidden", async () => {
      const mockUser = { _id: "user123", username: "the_weeknd" };
      const mockAlbum = { _id: "album123", title: "Vault", is_hidden: true, visibility: "public" };

      sinon.stub(userRepository, "findByUsername").resolves(mockUser);
      sinon.stub(trackRepository, "findByPermalinkAndArtist").returns({
        populate: sinon.stub().resolves(null)
      });
      sinon.stub(albumRepository, "findByPermalink").resolves(mockAlbum);

      try {
        await discoveryService.resolveUrl("/the_weeknd/vault");
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });
  });



  describe("getTrending", () => {
    it("should return cached trending if available", async () => {
      const cachedTrending = { tracks: [], total: 0 };
      sinon.stub(cache, "get").resolves(cachedTrending);

      const result = await discoveryService.getTrending(1, 20);
      expect(result).to.deep.equal(cachedTrending);
    });

    it("should fetch and cache trending if not cached", async () => {
      sinon.stub(cache, "get").resolves(null);
      const setStub = sinon.stub(cache, "set").resolves();
      
      const mockTrending = { tracks: [{ _id: "1", title: "Hit" }], total: 1 };
      sinon.stub(trackRepository, "findTrending").resolves(mockTrending);

      const result = await discoveryService.getTrending(1, 20);
      expect(result).to.deep.equal(mockTrending);
      expect(setStub.calledOnce).to.be.true;
    });

    it("should throw BadRequestError for invalid pagination", async () => {
      try {
        await discoveryService.getTrending(0, 20);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("getCharts", () => {
    it("should return cached charts if available", async () => {
      const cachedCharts = { tracks: [], total: 0 };
      sinon.stub(cache, "get").resolves(cachedCharts);

      const result = await discoveryService.getCharts(50);
      expect(result).to.deep.equal(cachedCharts);
    });

    it("should fetch and cache charts if not cached", async () => {
      sinon.stub(cache, "get").resolves(null);
      const setStub = sinon.stub(cache, "set").resolves();
      
      const mockTracks = [{ _id: "1", title: "Top Hit" }, { _id: "2", title: "Second Hit" }];
      sinon.stub(trackRepository, "findCharts").resolves(mockTracks);

      const result = await discoveryService.getCharts(50);
      expect(result.tracks.length).to.equal(2);
      expect(result.tracks[0].rank).to.equal(1);
      expect(result.tracks[1].rank).to.equal(2);
      expect(setStub.calledOnce).to.be.true;
    });

    it("should throw BadRequestError for invalid limit", async () => {
      try {
        await discoveryService.getCharts(0);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });
  });

  describe("getDiscoverHome", () => {
    const mockTracks = [{ _id: "t1", title: "Hit Song" }];

    it("should return cached guest shelves if available", async () => {
      const cachedShelves = [{ id: "trending", title: "Trending Now", type: "track_list", items: mockTracks }];
      sinon.stub(cache, "get").resolves(cachedShelves);

      const result = await discoveryService.getDiscoverHome(null);
      expect(result).to.deep.equal(cachedShelves);
    });

    it("should build and cache shelves for guest when no cache", async () => {
      sinon.stub(cache, "get").resolves(null);
      const setStub = sinon.stub(cache, "set").resolves();
      sinon.stub(trackRepository, "findTrending").resolves({ tracks: mockTracks, total: 1 });
      sinon.stub(trackRepository, "findCharts").resolves(mockTracks);
      sinon.stub(trackRepository, "findNewReleases").resolves(mockTracks);

      const result = await discoveryService.getDiscoverHome(null);

      expect(result).to.be.an("array").with.lengthOf(3);
      expect(result[0].id).to.equal("trending");
      expect(result[1].id).to.equal("charts");
      expect(result[2].id).to.equal("new_releases");
      expect(setStub.calledOnce).to.be.true;
    });

    it("should skip empty shelves", async () => {
      sinon.stub(cache, "get").resolves(null);
      sinon.stub(cache, "set").resolves();
      sinon.stub(trackRepository, "findTrending").resolves({ tracks: [], total: 0 });
      sinon.stub(trackRepository, "findCharts").resolves([]);
      sinon.stub(trackRepository, "findNewReleases").resolves(mockTracks);

      const result = await discoveryService.getDiscoverHome(null);

      expect(result).to.be.an("array").with.lengthOf(1);
      expect(result[0].id).to.equal("new_releases");
    });

    it("should add personalized shelves for authenticated user with history and genres", async () => {
      const trendingStub = sinon.stub(trackRepository, "findTrending");
      trendingStub.onFirstCall().resolves({ tracks: mockTracks, total: 1 });
      trendingStub.onSecondCall().resolves({ tracks: [{ _id: "g1", title: "Genre Hit" }], total: 1 });
      trendingStub.onThirdCall().resolves({ tracks: [{ _id: "f1", title: "Fav Hit" }], total: 1 });

      sinon.stub(trackRepository, "findCharts").resolves(mockTracks);
      sinon.stub(trackRepository, "findNewReleases").resolves(mockTracks);
      sinon.stub(playHistoryRepository, "getRecentlyPlayed").resolves({
        tracks: [{ track: { _id: "t1", title: "Last Song", genre: "Electronic" } }],
        total: 1,
      });
      sinon.stub(userRepository, "findById").resolves({
        _id: "user1",
        favorite_genres: ["Pop"],
      });

      const result = await discoveryService.getDiscoverHome("user1");

      expect(result).to.be.an("array").with.lengthOf(5);
      expect(result[3].id).to.equal("because_you_listened");
      expect(result[3].title).to.include("Electronic");
      expect(result[4].id).to.equal("favorite_genre");
      expect(result[4].title).to.include("Pop");
    });

    it("should skip personalized shelves when user has no history", async () => {
      sinon.stub(trackRepository, "findTrending").resolves({ tracks: mockTracks, total: 1 });
      sinon.stub(trackRepository, "findCharts").resolves(mockTracks);
      sinon.stub(trackRepository, "findNewReleases").resolves(mockTracks);
      sinon.stub(playHistoryRepository, "getRecentlyPlayed").resolves({ tracks: [], total: 0 });
      sinon.stub(userRepository, "findById").resolves({ _id: "user1", favorite_genres: [] });

      const result = await discoveryService.getDiscoverHome("user1");

      expect(result).to.be.an("array").with.lengthOf(3);
      const ids = result.map((s) => s.id);
      expect(ids).to.not.include("because_you_listened");
      expect(ids).to.not.include("favorite_genre");
    });

    it("should not cache authenticated user responses", async () => {
      sinon.stub(trackRepository, "findTrending").resolves({ tracks: mockTracks, total: 1 });
      sinon.stub(trackRepository, "findCharts").resolves([]);
      sinon.stub(trackRepository, "findNewReleases").resolves([]);
      sinon.stub(playHistoryRepository, "getRecentlyPlayed").resolves({ tracks: [], total: 0 });
      sinon.stub(userRepository, "findById").resolves({ _id: "user1", favorite_genres: [] });
      const setStub = sinon.stub(cache, "set").resolves();

      await discoveryService.getDiscoverHome("user1");

      expect(setStub.called).to.be.false;
    });
  });

  describe("getDiscoverFeed", () => {
    const mockTracks = [
      { _id: "t1", title: "Discover Hit", artist_id: { username: "artist1" } },
    ];

    it("should return tracks for unauthenticated user", async () => {
      sinon.stub(trackRepository, "findDiscoverFeed").resolves({ tracks: mockTracks, total: 1 });

      const result = await discoveryService.getDiscoverFeed(null, 1, 15);

      expect(result.tracks).to.deep.equal(mockTracks);
      expect(result.total).to.equal(1);
      expect(result.page).to.equal(1);
    });

    it("should exclude followed artists for authenticated user", async () => {
      sinon.stub(Follow, "find").returns({
        select: sinon.stub().returns({
          lean: sinon.stub().resolves([{ following_id: "artist-A" }, { following_id: "artist-B" }]),
        }),
      });
      const feedStub = sinon.stub(trackRepository, "findDiscoverFeed").resolves({ tracks: mockTracks, total: 1 });

      await discoveryService.getDiscoverFeed("user1", 1, 15);

      const excludeArg = feedStub.firstCall.args[2];
      expect(excludeArg).to.deep.equal(["artist-A", "artist-B"]);
    });

    it("should throw BadRequestError for invalid pagination", async () => {
      try {
        await discoveryService.getDiscoverFeed(null, 0, 15);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw BadRequestError if limit exceeds 50", async () => {
      try {
        await discoveryService.getDiscoverFeed(null, 1, 51);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestError);
      }
    });

    it("should return empty results when no tracks match", async () => {
      sinon.stub(trackRepository, "findDiscoverFeed").resolves({ tracks: [], total: 0 });

      const result = await discoveryService.getDiscoverFeed(null, 1, 15);

      expect(result.tracks).to.have.lengthOf(0);
      expect(result.total).to.equal(0);
    });
  });
});
