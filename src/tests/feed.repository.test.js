import { expect } from "chai";
import sinon from "sinon";
import feedRepository from "../repositories/feed.repository.js";
import Track from "../models/track.model.js";
import Repost from "../models/repost.model.js";
import Follow from "../models/follow.model.js";
import AlbumRepost from "../models/album-repost.model.js";

const makeQuery = (resolvedValue) => {
  const query = {
    select: sinon.stub(),
    populate: sinon.stub(),
    sort: sinon.stub(),
    limit: sinon.stub(),
    lean: sinon.stub(),
  };

  query.select.returns(query);
  query.populate.returns(query);
  query.sort.returns(query);
  query.limit.returns(query);
  query.lean.resolves(resolvedValue);

  return query;
};

describe("feedRepository", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("getPersonalFeed()", () => {
    it("should include album repost items in the personal feed", async () => {
      sinon.stub(Follow, "find").returns({
        select: sinon.stub().returns({
          lean: sinon.stub().resolves([{ following_id: "artist-1" }]),
        }),
      });

      sinon.stub(Track, "find").returns(makeQuery([]));
      sinon.stub(Repost, "find").returns(makeQuery([]));
      sinon.stub(AlbumRepost, "find").returns(makeQuery([
        {
          createdAt: new Date("2026-04-23T12:00:00.000Z"),
          user_id: {
            _id: "artist-1",
            username: "reposter",
            display_name: "Reposter",
            avatar_url: "avatar.png",
            is_verified: false,
          },
          album_id: {
            _id: "album-1",
            title: "After Hours",
            permalink: "after-hours-1234abcd",
            genre: "Pop",
            type: "Album",
            artwork_url: "cover.png",
            track_count: 14,
            like_count: 12,
            repost_count: 3,
            artist_id: {
              _id: "artist-2",
              username: "the_weeknd",
              display_name: "The Weeknd",
              avatar_url: "artist.png",
              is_verified: true,
            },
          },
        },
      ]));

      const result = await feedRepository.getPersonalFeed("listener-1", 1, 20);

      expect(result.items).to.have.length(1);
      expect(result.items[0].type).to.equal("repost");
      expect(result.items[0].entity_type).to.equal("album");
      expect(result.items[0].album.title).to.equal("After Hours");
      expect(result.items[0].reposted_by.username).to.equal("reposter");
      expect(result.items[0].artist.username).to.equal("the_weeknd");
    });
  });
});
