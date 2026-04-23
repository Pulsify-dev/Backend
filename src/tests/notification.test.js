import { expect } from "chai";
import sinon from "sinon";

// ── Module-under-test imports ──────────────────────────────────────────────
import NotificationService from "../services/notification.service.js";
import NotificationRepository from "../repositories/notification.repository.js";
import UserRepository from "../repositories/user.repository.js";
import FirebaseService from "../services/firebase.service.js";
import { AppError } from "../utils/errors.utils.js";
import {
  emitNotification,
  registerNotificationHandlers,
} from "../sockets/notification.socket.js";

// ── Shared mock data ──────────────────────────────────────────────────────
const MOCK_USER_ID = "507f1f77bcf86cd799439011";
const MOCK_ACTOR_ID = "607f1f77bcf86cd799439022";
const MOCK_NOTIFICATION_ID = "707f1f77bcf86cd799439033";

const mockNotification = {
  _id: MOCK_NOTIFICATION_ID,
  recipient_id: MOCK_USER_ID,
  actor_id: MOCK_ACTOR_ID,
  entity_type: "Track",
  entity_id: "807f1f77bcf86cd799439044",
  action_type: "LIKE",
  is_read: false,
  created_at: new Date(),
};

// ═══════════════════════════════════════════════════════════════════════════
// NotificationService
// ═══════════════════════════════════════════════════════════════════════════
describe("NotificationService", () => {
  afterEach(() => sinon.restore());

  // ─────────────────────────────────────────────────────────────────────────
  // getNotifications
  // ─────────────────────────────────────────────────────────────────────────
  describe("getNotifications", () => {
    it("should return paginated notifications with correct meta", async () => {
      const notifications = [mockNotification];
      sinon
        .stub(NotificationRepository, "findPaginatedByUserId")
        .resolves(notifications);
      sinon.stub(NotificationRepository, "countTotalByUserId").resolves(1);

      const result = await NotificationService.getNotifications(
        MOCK_USER_ID,
        1,
        20,
      );

      expect(result.data).to.deep.equal(notifications);
      expect(result.meta.currentPage).to.equal(1);
      expect(result.meta.itemsPerPage).to.equal(20);
      expect(result.meta.totalItems).to.equal(1);
      expect(result.meta.totalPages).to.equal(1);
    });

    it("should calculate skip correctly for page > 1", async () => {
      const findStub = sinon
        .stub(NotificationRepository, "findPaginatedByUserId")
        .resolves([]);
      sinon.stub(NotificationRepository, "countTotalByUserId").resolves(0);

      await NotificationService.getNotifications(MOCK_USER_ID, 3, 10);

      // skip = (3-1)*10 = 20
      expect(findStub.firstCall.args[1]).to.equal(20);
      expect(findStub.firstCall.args[2]).to.equal(10);
    });

    it("should use default page=1 and limit=20 when not provided", async () => {
      const findStub = sinon
        .stub(NotificationRepository, "findPaginatedByUserId")
        .resolves([]);
      sinon.stub(NotificationRepository, "countTotalByUserId").resolves(0);

      await NotificationService.getNotifications(MOCK_USER_ID);

      // skip = (1-1)*20 = 0
      expect(findStub.firstCall.args[1]).to.equal(0);
      expect(findStub.firstCall.args[2]).to.equal(20);
    });

    it("should compute totalPages correctly for multiple pages", async () => {
      sinon
        .stub(NotificationRepository, "findPaginatedByUserId")
        .resolves([]);
      sinon.stub(NotificationRepository, "countTotalByUserId").resolves(45);

      const result = await NotificationService.getNotifications(
        MOCK_USER_ID,
        1,
        20,
      );

      expect(result.meta.totalPages).to.equal(3); // ceil(45/20)
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getUnreadCount
  // ─────────────────────────────────────────────────────────────────────────
  describe("getUnreadCount", () => {
    it("should return unread count", async () => {
      sinon.stub(NotificationRepository, "countUnread").resolves(5);

      const result = await NotificationService.getUnreadCount(MOCK_USER_ID);

      expect(result).to.deep.equal({ unread_count: 5 });
    });

    it("should return zero when there are no unread notifications", async () => {
      sinon.stub(NotificationRepository, "countUnread").resolves(0);

      const result = await NotificationService.getUnreadCount(MOCK_USER_ID);

      expect(result.unread_count).to.equal(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // markAllAsRead
  // ─────────────────────────────────────────────────────────────────────────
  describe("markAllAsRead", () => {
    it("should mark all notifications as read and return success message", async () => {
      sinon
        .stub(NotificationRepository, "markAllAsRead")
        .resolves({ modifiedCount: 3 });

      const result = await NotificationService.markAllAsRead(MOCK_USER_ID);

      expect(result).to.deep.equal({
        message: "All notifications marked as read",
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // markAsRead
  // ─────────────────────────────────────────────────────────────────────────
  describe("markAsRead", () => {
    it("should return updated notification when found", async () => {
      const readNotification = { ...mockNotification, is_read: true };
      sinon
        .stub(NotificationRepository, "markAsRead")
        .resolves(readNotification);

      const result = await NotificationService.markAsRead(
        MOCK_NOTIFICATION_ID,
        MOCK_USER_ID,
      );

      expect(result.is_read).to.be.true;
    });

    it("should throw AppError 404 when notification not found", async () => {
      sinon.stub(NotificationRepository, "markAsRead").resolves(null);

      try {
        await NotificationService.markAsRead(
          MOCK_NOTIFICATION_ID,
          MOCK_USER_ID,
        );
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.include("Notification not found");
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // addPushToken
  // ─────────────────────────────────────────────────────────────────────────
  describe("addPushToken", () => {
    it("should register push token and return success message", async () => {
      sinon
        .stub(UserRepository, "addDeviceToken")
        .resolves({ _id: MOCK_USER_ID });

      const result = await NotificationService.addPushToken(
        MOCK_USER_ID,
        "fcm-token-123",
      );

      expect(result).to.deep.equal({
        message: "Push token registered successfully",
      });
    });

    it("should throw AppError 404 when user not found", async () => {
      sinon.stub(UserRepository, "addDeviceToken").resolves(null);

      try {
        await NotificationService.addPushToken(MOCK_USER_ID, "fcm-token-123");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.include("User not found");
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createAndDeliverNotification
  // ─────────────────────────────────────────────────────────────────────────
  describe("createAndDeliverNotification", () => {
    const notificationData = {
      recipient_id: MOCK_USER_ID,
      actor_id: MOCK_ACTOR_ID,
      entity_type: "Track",
      entity_id: "807f1f77bcf86cd799439044",
      action_type: "LIKE",
    };

    it("should return null when actor notifies themselves (self-notification)", async () => {
      const selfData = {
        ...notificationData,
        actor_id: MOCK_USER_ID,
        recipient_id: MOCK_USER_ID,
      };

      const result = await NotificationService.createAndDeliverNotification(
        selfData,
        {},
      );

      expect(result).to.be.null;
    });

    it("should create notification and emit via socket when ioInstance provided", async () => {
      const savedNotification = { ...mockNotification };
      sinon.stub(NotificationRepository, "create").resolves(savedNotification);
      sinon
        .stub(UserRepository, "findById")
        .resolves({ _id: MOCK_USER_ID, device_tokens: [] });

      const mockIo = {
        to: sinon.stub().returns({ emit: sinon.stub() }),
      };

      const result = await NotificationService.createAndDeliverNotification(
        notificationData,
        mockIo,
      );

      expect(result).to.deep.equal(savedNotification);
      expect(mockIo.to.calledOnce).to.be.true;
    });

    it("should create notification without emitting when ioInstance is null", async () => {
      const savedNotification = { ...mockNotification };
      sinon.stub(NotificationRepository, "create").resolves(savedNotification);
      sinon
        .stub(UserRepository, "findById")
        .resolves({ _id: MOCK_USER_ID, device_tokens: [] });

      const result = await NotificationService.createAndDeliverNotification(
        notificationData,
        null,
      );

      expect(result).to.deep.equal(savedNotification);
    });

    it("should send push notification when recipient has device tokens", async () => {
      const savedNotification = { ...mockNotification };
      sinon.stub(NotificationRepository, "create").resolves(savedNotification);
      sinon.stub(UserRepository, "findById").resolves({
        _id: MOCK_USER_ID,
        device_tokens: ["token-a", "token-b"],
      });
      const pushStub = sinon
        .stub(FirebaseService, "sendPushNotification")
        .resolves(true);

      await NotificationService.createAndDeliverNotification(
        notificationData,
        null,
      );

      expect(pushStub.calledOnce).to.be.true;
      const [tokens, payload] = pushStub.firstCall.args;
      expect(tokens).to.deep.equal(["token-a", "token-b"]);
      expect(payload.title).to.equal("New Activity on Pulsify");
      expect(payload.body).to.include("track");
      expect(payload.data.action_type).to.equal("LIKE");
    });

    it("should NOT send push notification when recipient has no device tokens", async () => {
      sinon.stub(NotificationRepository, "create").resolves(mockNotification);
      sinon
        .stub(UserRepository, "findById")
        .resolves({ _id: MOCK_USER_ID, device_tokens: [] });
      const pushStub = sinon
        .stub(FirebaseService, "sendPushNotification")
        .resolves(true);

      await NotificationService.createAndDeliverNotification(
        notificationData,
        null,
      );

      expect(pushStub.called).to.be.false;
    });

    it("should NOT send push notification when recipient has null device_tokens", async () => {
      sinon.stub(NotificationRepository, "create").resolves(mockNotification);
      sinon
        .stub(UserRepository, "findById")
        .resolves({ _id: MOCK_USER_ID, device_tokens: null });
      const pushStub = sinon
        .stub(FirebaseService, "sendPushNotification")
        .resolves(true);

      await NotificationService.createAndDeliverNotification(
        notificationData,
        null,
      );

      expect(pushStub.called).to.be.false;
    });

    it("should NOT send push notification when recipient is null", async () => {
      sinon.stub(NotificationRepository, "create").resolves(mockNotification);
      sinon.stub(UserRepository, "findById").resolves(null);
      const pushStub = sinon
        .stub(FirebaseService, "sendPushNotification")
        .resolves(true);

      await NotificationService.createAndDeliverNotification(
        notificationData,
        null,
      );

      expect(pushStub.called).to.be.false;
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NotificationController
// ═══════════════════════════════════════════════════════════════════════════
describe("NotificationController", () => {
  // We dynamically import the default export (singleton) for each test
  let NotificationController;

  before(async () => {
    const mod = await import("../controllers/notification.controller.js");
    NotificationController = mod.default;
  });

  afterEach(() => sinon.restore());

  // Helper factories
  const mockReq = (overrides = {}) => ({
    user: { user_id: MOCK_USER_ID },
    pagination: { page: 1, limit: 20 },
    query: {},
    params: {},
    body: {},
    ...overrides,
  });

  const mockRes = () => {
    const res = {};
    res.status = sinon.stub().returns(res);
    res.json = sinon.stub().returns(res);
    return res;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // getNotifications
  // ─────────────────────────────────────────────────────────────────────────
  describe("getNotifications", () => {
    it("should return 200 with notifications data and meta", async () => {
      const serviceResult = {
        data: [mockNotification],
        meta: {
          currentPage: 1,
          itemsPerPage: 20,
          totalItems: 1,
          totalPages: 1,
        },
      };
      sinon
        .stub(NotificationService, "getNotifications")
        .resolves(serviceResult);

      const req = mockReq();
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.getNotifications(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.firstCall.args[0].status).to.equal("success");
      expect(res.json.firstCall.args[0].data).to.deep.equal(
        serviceResult.data,
      );
      expect(res.json.firstCall.args[0].meta).to.deep.equal(
        serviceResult.meta,
      );
    });

    it("should fall back to req.query when req.pagination is missing", async () => {
      const serviceStub = sinon
        .stub(NotificationService, "getNotifications")
        .resolves({ data: [], meta: {} });

      const req = mockReq({
        pagination: undefined,
        query: { page: "2", limit: "5" },
      });
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.getNotifications(req, res, next);

      expect(serviceStub.firstCall.args[1]).to.equal(2);
      expect(serviceStub.firstCall.args[2]).to.equal(5);
    });

    it("should call next(error) when service throws", async () => {
      const error = new Error("DB error");
      sinon.stub(NotificationService, "getNotifications").rejects(error);

      const req = mockReq();
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.getNotifications(req, res, next);

      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.equal(error);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getUnreadCount
  // ─────────────────────────────────────────────────────────────────────────
  describe("getUnreadCount", () => {
    it("should return 200 with unread count", async () => {
      sinon
        .stub(NotificationService, "getUnreadCount")
        .resolves({ unread_count: 3 });

      const req = mockReq();
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.getUnreadCount(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.firstCall.args[0].data.unread_count).to.equal(3);
    });

    it("should call next(error) when service throws", async () => {
      const error = new Error("DB error");
      sinon.stub(NotificationService, "getUnreadCount").rejects(error);

      const req = mockReq();
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.getUnreadCount(req, res, next);

      expect(next.calledWith(error)).to.be.true;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // markAllAsRead
  // ─────────────────────────────────────────────────────────────────────────
  describe("markAllAsRead", () => {
    it("should return 200 with success message", async () => {
      sinon
        .stub(NotificationService, "markAllAsRead")
        .resolves({ message: "All notifications marked as read" });

      const req = mockReq();
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.markAllAsRead(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.firstCall.args[0].data.message).to.equal(
        "All notifications marked as read",
      );
    });

    it("should call next(error) when service throws", async () => {
      const error = new Error("DB error");
      sinon.stub(NotificationService, "markAllAsRead").rejects(error);

      const req = mockReq();
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.markAllAsRead(req, res, next);

      expect(next.calledWith(error)).to.be.true;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // markAsRead
  // ─────────────────────────────────────────────────────────────────────────
  describe("markAsRead", () => {
    it("should return 200 with marked notification", async () => {
      const readNotif = { ...mockNotification, is_read: true };
      sinon.stub(NotificationService, "markAsRead").resolves(readNotif);

      const req = mockReq({ params: { id: MOCK_NOTIFICATION_ID } });
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.markAsRead(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.firstCall.args[0].data.is_read).to.be.true;
    });

    it("should call next(error) when service throws", async () => {
      const error = new AppError("Notification not found or unauthorized", 404);
      sinon.stub(NotificationService, "markAsRead").rejects(error);

      const req = mockReq({ params: { id: MOCK_NOTIFICATION_ID } });
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.markAsRead(req, res, next);

      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0].statusCode).to.equal(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // registerPushToken
  // ─────────────────────────────────────────────────────────────────────────
  describe("registerPushToken", () => {
    it("should return 200 when token is provided", async () => {
      sinon
        .stub(NotificationService, "addPushToken")
        .resolves({ message: "Push token registered successfully" });

      const req = mockReq({ body: { token: "fcm-token-abc" } });
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.registerPushToken(req, res, next);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.firstCall.args[0].data.message).to.include(
        "Push token registered",
      );
    });

    it("should call next with AppError 400 when token is missing", async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.registerPushToken(req, res, next);

      expect(next.calledOnce).to.be.true;
      const err = next.firstCall.args[0];
      expect(err).to.be.instanceOf(AppError);
      expect(err.statusCode).to.equal(400);
      expect(err.message).to.include("Push token is required");
    });

    it("should call next(error) when service throws", async () => {
      const error = new AppError("User not found", 404);
      sinon.stub(NotificationService, "addPushToken").rejects(error);

      const req = mockReq({ body: { token: "fcm-token-abc" } });
      const res = mockRes();
      const next = sinon.stub();

      await NotificationController.registerPushToken(req, res, next);

      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0].statusCode).to.equal(404);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// notification.socket.js  –  emitNotification & registerNotificationHandlers
// ═══════════════════════════════════════════════════════════════════════════
describe("NotificationSocket", () => {
  afterEach(() => sinon.restore());

  // ─────────────────────────────────────────────────────────────────────────
  // emitNotification
  // ─────────────────────────────────────────────────────────────────────────
  describe("emitNotification", () => {
    it("should emit new_notification to the correct user room", () => {
      const emitStub = sinon.stub();
      const io = { to: sinon.stub().returns({ emit: emitStub }) };
      const notification = { message: "hello" };

      emitNotification(io, MOCK_USER_ID, notification);

      expect(io.to.calledWith(`user_${MOCK_USER_ID}`)).to.be.true;
      expect(emitStub.calledWith("new_notification", notification)).to.be.true;
    });

    it("should not emit when io is null", () => {
      // Should not throw
      emitNotification(null, MOCK_USER_ID, {});
    });

    it("should not emit when userId is null", () => {
      const emitStub = sinon.stub();
      const io = { to: sinon.stub().returns({ emit: emitStub }) };

      emitNotification(io, null, {});

      expect(io.to.called).to.be.false;
    });

    it("should not emit when userId is undefined", () => {
      const emitStub = sinon.stub();
      const io = { to: sinon.stub().returns({ emit: emitStub }) };

      emitNotification(io, undefined, {});

      expect(io.to.called).to.be.false;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // registerNotificationHandlers
  // ─────────────────────────────────────────────────────────────────────────
  describe("registerNotificationHandlers", () => {
    it("should register join_notifications and leave_notifications handlers for authenticated socket", () => {
      const handlers = {};
      const socket = {
        id: "socket-123",
        user: { user_id: MOCK_USER_ID },
        on: (event, cb) => {
          handlers[event] = cb;
        },
        join: sinon.stub(),
        leave: sinon.stub(),
      };

      registerNotificationHandlers({}, socket);

      // Both events should be registered
      expect(handlers).to.have.property("join_notifications");
      expect(handlers).to.have.property("leave_notifications");
    });

    it("should join the correct room when join_notifications is triggered", () => {
      const handlers = {};
      const socket = {
        id: "socket-123",
        user: { user_id: MOCK_USER_ID },
        on: (event, cb) => {
          handlers[event] = cb;
        },
        join: sinon.stub(),
        leave: sinon.stub(),
      };

      registerNotificationHandlers({}, socket);
      handlers["join_notifications"]();

      expect(socket.join.calledWith(`user_${MOCK_USER_ID}`)).to.be.true;
    });

    it("should leave the correct room when leave_notifications is triggered", () => {
      const handlers = {};
      const socket = {
        id: "socket-123",
        user: { user_id: MOCK_USER_ID },
        on: (event, cb) => {
          handlers[event] = cb;
        },
        join: sinon.stub(),
        leave: sinon.stub(),
      };

      registerNotificationHandlers({}, socket);
      handlers["leave_notifications"]();

      expect(socket.leave.calledWith(`user_${MOCK_USER_ID}`)).to.be.true;
    });

    it("should NOT register handlers when socket has no user (unauthenticated)", () => {
      const socket = {
        id: "socket-456",
        user: null,
        on: sinon.stub(),
      };

      registerNotificationHandlers({}, socket);

      expect(socket.on.called).to.be.false;
    });

    it("should NOT register handlers when socket.user exists but user_id is missing", () => {
      const socket = {
        id: "socket-789",
        user: {},
        on: sinon.stub(),
      };

      registerNotificationHandlers({}, socket);

      expect(socket.on.called).to.be.false;
    });

    it("should NOT register handlers when socket has no user property at all", () => {
      const socket = {
        id: "socket-000",
        on: sinon.stub(),
      };

      registerNotificationHandlers({}, socket);

      expect(socket.on.called).to.be.false;
    });
  });
});
