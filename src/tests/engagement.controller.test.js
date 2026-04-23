import { expect } from "chai";
import sinon from "sinon";
import engagementController from "../controllers/engagement.controller.js";
import engagementService from "../services/engagement.service.js";
import NotificationService from "../services/notification.service.js";
import Album from "../models/album.model.js";

const mockRes = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

describe("engagementController", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("likeAlbum()", () => {
    it("should create an album like notification", async () => {
      sinon.stub(engagementService, "likeAlbum").resolves({ message: "Album liked successfully." });
      sinon.stub(Album, "findById").resolves({
        _id: "album-1",
        artist_id: "artist-1",
      });
      const notificationStub = sinon.stub(NotificationService, "createAndDeliverNotification").resolves();

      const req = {
        user: { user_id: "listener-1" },
        params: { album_id: "album-1" },
        app: { get: sinon.stub().withArgs("io").returns({}) },
      };
      const res = mockRes();
      const next = sinon.stub();

      await engagementController.likeAlbum(req, res, next);

      expect(res.status.calledWith(201)).to.be.true;
      expect(notificationStub.calledOnce).to.be.true;
      expect(notificationStub.firstCall.args[0].entity_type).to.equal("Album");
      expect(notificationStub.firstCall.args[0].action_type).to.equal("LIKE");
      expect(notificationStub.firstCall.args[0].entity_id).to.equal("album-1");
    });
  });

  describe("repostAlbum()", () => {
    it("should create an album repost notification", async () => {
      sinon.stub(engagementService, "repostAlbum").resolves({ message: "Album reposted successfully." });
      sinon.stub(Album, "findById").resolves({
        _id: "album-1",
        artist_id: "artist-1",
      });
      const notificationStub = sinon.stub(NotificationService, "createAndDeliverNotification").resolves();

      const req = {
        user: { user_id: "listener-1" },
        params: { album_id: "album-1" },
        app: { get: sinon.stub().withArgs("io").returns({}) },
      };
      const res = mockRes();
      const next = sinon.stub();

      await engagementController.repostAlbum(req, res, next);

      expect(res.status.calledWith(201)).to.be.true;
      expect(notificationStub.calledOnce).to.be.true;
      expect(notificationStub.firstCall.args[0].entity_type).to.equal("Album");
      expect(notificationStub.firstCall.args[0].action_type).to.equal("REPOST");
      expect(notificationStub.firstCall.args[0].entity_id).to.equal("album-1");
    });
  });
});
