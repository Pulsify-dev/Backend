import { expect } from "chai";
import sinon from "sinon";
import subscriptionService from "../services/subscription.service.js";
import subscriptionRepository from "../repositories/subscription.repository.js";
import trackRepository from "../repositories/track.repository.js";
import albumRepository from "../repositories/album.repository.js";
import userRepository from "../repositories/user.repository.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../utils/errors.utils.js";

const USER_ID = "507f1f77bcf86cd799439011";

const FREE_SUB = { user_id: USER_ID, plan: "Free", status: "Active", current_period_end: null };
const ACTIVE_PRO_SUB = {
  user_id: USER_ID,
  plan: "Artist Pro",
  status: "Active",
  current_period_end: new Date(Date.now() + 24 * 60 * 60 * 1000),
};
const EXPIRED_PRO_SUB = {
  user_id: USER_ID,
  plan: "Artist Pro",
  status: "Active",
  current_period_end: new Date(Date.now() - 60 * 1000),
};
const FREE_PLAN_LIMIT = {
  plan: "Free",
  can_upload: true,
  upload_track_limit: 3,
  album_limit: 2,
  album_track_limit: 5,
  can_offline_listen: false,
};
const PRO_PLAN_LIMIT = {
  plan: "Artist Pro",
  can_upload: true,
  upload_track_limit: null,
  album_limit: null,
  album_track_limit: null,
  can_offline_listen: true,
};

describe("SubscriptionService Unit Tests", () => {
  beforeEach(() => {
    sinon.stub(trackRepository, "hideOldestTracks").resolves(0);
    sinon.stub(albumRepository, "hideOldestAlbums").resolves(0);
    sinon.stub(albumRepository, "getVisibleAlbumTrackIds").resolves([]);
    sinon.stub(trackRepository, "unhideAllTracks").resolves(0);
    sinon.stub(albumRepository, "unhideAllAlbums").resolves(0);
    sinon.stub(subscriptionRepository, "findPlanLimitByPlan").resolves(FREE_PLAN_LIMIT);
  });

  afterEach(() => {
    sinon.restore();
  });

  // ═══════════════════════════════════════════
  // getSubscriptionByUserId()
  // ═══════════════════════════════════════════
  describe("getSubscriptionByUserId()", () => {
    it("should throw BadRequestError when userId is null", async () => {
      try {
        await subscriptionService.getSubscriptionByUserId(null);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });

    it("should create a default Free subscription if missing", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(null);
      sinon.stub(subscriptionRepository, "createDefaultFreeSubscription").resolves(FREE_SUB);
      sinon.stub(userRepository, "updateById").resolves({});

      const result = await subscriptionService.getSubscriptionByUserId(USER_ID);

      expect(result.plan).to.equal("Free");
      expect(userRepository.updateById.calledOnce).to.be.true;
    });

    it("should return existing non-expired subscription as-is", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(ACTIVE_PRO_SUB);

      const result = await subscriptionService.getSubscriptionByUserId(USER_ID);

      expect(result.plan).to.equal("Artist Pro");
      expect(result.status).to.equal("Active");
    });

    it("should downgrade expired paid subscriptions to Free", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(EXPIRED_PRO_SUB);
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        ...FREE_SUB,
        status: "Cancelled",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const result = await subscriptionService.getSubscriptionByUserId(USER_ID);

      expect(result.plan).to.equal("Free");
    });
  });

  // ═══════════════════════════════════════════
  // getSubscriptionSnapshotForUser()
  // ═══════════════════════════════════════════
  describe("getSubscriptionSnapshotForUser()", () => {
    it("should return snapshot with subscription, effective plan, and plan limits", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(ACTIVE_PRO_SUB);
      subscriptionRepository.findPlanLimitByPlan.restore();
      sinon.stub(subscriptionRepository, "findPlanLimitByPlan").resolves(PRO_PLAN_LIMIT);

      const result = await subscriptionService.getSubscriptionSnapshotForUser(USER_ID);

      expect(result).to.have.property("subscription");
      expect(result).to.have.property("effective_plan", "Artist Pro");
      expect(result).to.have.property("plan_limits");
    });
  });

  // ═══════════════════════════════════════════
  // getPlanLimitForUser()
  // ═══════════════════════════════════════════
  describe("getPlanLimitForUser()", () => {
    it("should fall back to Free plan limits when current plan limit not found", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(ACTIVE_PRO_SUB);
      subscriptionRepository.findPlanLimitByPlan.restore();
      const findPlanStub = sinon.stub(subscriptionRepository, "findPlanLimitByPlan");
      findPlanStub.withArgs("Artist Pro").resolves(null);
      findPlanStub.withArgs("Free").resolves(FREE_PLAN_LIMIT);

      const result = await subscriptionService.getPlanLimitForUser(USER_ID);

      expect(result.planLimit.plan).to.equal("Free");
    });

    it("should throw NotFoundError when no plan limits configured at all", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(FREE_SUB);
      subscriptionRepository.findPlanLimitByPlan.restore();
      sinon.stub(subscriptionRepository, "findPlanLimitByPlan").resolves(null);

      try {
        await subscriptionService.getPlanLimitForUser(USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
        expect(err.message).to.include("Plan limits are not configured");
      }
    });
  });

  // ═══════════════════════════════════════════
  // getUsageForUser()
  // ═══════════════════════════════════════════
  describe("getUsageForUser()", () => {
    it("should return usage and remaining quotas", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(FREE_SUB);
      subscriptionRepository.findPlanLimitByPlan.restore();
      sinon.stub(subscriptionRepository, "findPlanLimitByPlan").resolves(FREE_PLAN_LIMIT);
      sinon.stub(trackRepository, "countByArtistId").resolves(2);
      sinon.stub(albumRepository, "countByArtist").resolves(1);

      const usage = await subscriptionService.getUsageForUser(USER_ID);

      expect(usage.plan).to.equal("Free");
      expect(usage.usage.uploaded_tracks.used).to.equal(2);
      expect(usage.usage.uploaded_tracks.remaining).to.equal(1);
      expect(usage.usage.albums.used).to.equal(1);
      expect(usage.usage.albums.remaining).to.equal(1);
    });

    it("should return null remaining when limit is not an integer (unlimited)", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(ACTIVE_PRO_SUB);
      subscriptionRepository.findPlanLimitByPlan.restore();
      sinon.stub(subscriptionRepository, "findPlanLimitByPlan").resolves(PRO_PLAN_LIMIT);
      sinon.stub(trackRepository, "countByArtistId").resolves(50);
      sinon.stub(albumRepository, "countByArtist").resolves(10);

      const usage = await subscriptionService.getUsageForUser(USER_ID);

      expect(usage.plan).to.equal("Artist Pro");
      expect(usage.usage.uploaded_tracks.remaining).to.equal(null);
      expect(usage.usage.albums.remaining).to.equal(null);
    });
  });

  // ═══════════════════════════════════════════
  // createCheckoutSession()
  // ═══════════════════════════════════════════
  describe("createCheckoutSession()", () => {
    it("should return webhook payload in mock checkout mode", async () => {
      const result = await subscriptionService.createCheckoutSession({
        userId: USER_ID,
        plan: "Artist Pro",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.checkout_mode).to.equal("mock");
      expect(result.checkout_url).to.equal("https://example.com/success");
      expect(result.webhook_payload_example.data.object.metadata.plan).to.equal("Artist Pro");
    });

    it("should throw BadRequestError when userId is falsy", async () => {
      try {
        await subscriptionService.createCheckoutSession({ userId: null, plan: "Artist Pro" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
      }
    });

    it("should throw BadRequestError when plan is not a string", async () => {
      try {
        await subscriptionService.createCheckoutSession({ userId: USER_ID, plan: 123 });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.equal("Plan is required.");
      }
    });

    it("should throw BadRequestError for unsupported plan name", async () => {
      try {
        await subscriptionService.createCheckoutSession({ userId: USER_ID, plan: "Gold" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("Unsupported plan");
      }
    });

    it("should throw BadRequestError when trying to activate Free plan via checkout", async () => {
      try {
        await subscriptionService.createCheckoutSession({ userId: USER_ID, plan: "Free" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("cancellation/downgrade");
      }
    });

    it("should normalize 'pro' to Artist Pro", async () => {
      const result = await subscriptionService.createCheckoutSession({
        userId: USER_ID, plan: "pro",
      });

      expect(result.webhook_payload_example.data.object.metadata.plan).to.equal("Artist Pro");
    });
  });

  // ═══════════════════════════════════════════
  // cancelSubscriptionAtPeriodEnd()
  // ═══════════════════════════════════════════
  describe("cancelSubscriptionAtPeriodEnd()", () => {
    it("should set cancel_at_period_end to true", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(ACTIVE_PRO_SUB);
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        ...ACTIVE_PRO_SUB, cancel_at_period_end: true,
      });

      const result = await subscriptionService.cancelSubscriptionAtPeriodEnd(USER_ID);

      expect(result.cancel_at_period_end).to.equal(true);
    });

    it("should return subscription unchanged when plan is already Free", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(FREE_SUB);
      sinon.stub(subscriptionRepository, "createDefaultFreeSubscription").resolves(FREE_SUB);
      sinon.stub(userRepository, "updateById").resolves({});

      const result = await subscriptionService.cancelSubscriptionAtPeriodEnd(USER_ID);

      expect(result.plan).to.equal("Free");
    });

    it("should throw NotFoundError when update returns null", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(ACTIVE_PRO_SUB);
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves(null);

      try {
        await subscriptionService.cancelSubscriptionAtPeriodEnd(USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ═══════════════════════════════════════════
  // handleWebhook()
  // ═══════════════════════════════════════════
  describe("handleWebhook()", () => {
    // ── checkout.session.completed ──
    it("should process checkout.session.completed", async () => {
      sinon.stub(subscriptionRepository, "upsertSubscriptionByUserId").resolves({
        user_id: USER_ID, plan: "Artist Pro", status: "Active",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { user_id: USER_ID, plan: "Artist Pro" },
            customer: "cus_123",
            subscription: "sub_123",
          },
        },
      });

      expect(response.processed).to.equal(true);
      expect(response.event).to.equal("checkout.session.completed");
    });

    it("should throw BadRequestError for checkout.session.completed with missing metadata", async () => {
      try {
        await subscriptionService.handleWebhook({
          type: "checkout.session.completed",
          data: { object: { metadata: {} } },
        });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("missing user_id or plan");
      }
    });

    // ── invoice.payment_failed ──
    it("should downgrade to Free on invoice.payment_failed", async () => {
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        plan: "Free", status: "Cancelled",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "invoice.payment_failed",
        data: { object: { metadata: { user_id: USER_ID } } },
      });

      expect(response.processed).to.equal(true);
    });

    it("should return processed: false for payment_failed when user not resolved", async () => {
      const response = await subscriptionService.handleWebhook({
        type: "invoice.payment_failed",
        data: { object: {} },
      });

      expect(response.processed).to.equal(false);
      expect(response.reason).to.include("User could not be resolved");
    });

    // ── invoice.payment_succeeded ──
    it("should update status to Active on invoice.payment_succeeded with period dates", async () => {
      const updateStub = sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({});
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "invoice.payment_succeeded",
        data: {
          object: {
            metadata: { user_id: USER_ID },
            period_start: 1700000000,
            period_end: 1702592000,
          },
        },
      });

      expect(response.processed).to.equal(true);
      const patch = updateStub.firstCall.args[1];
      expect(patch.status).to.equal("Active");
      expect(patch.current_period_start).to.be.instanceOf(Date);
      expect(patch.current_period_end).to.be.instanceOf(Date);
    });

    it("should update status to Active without period dates", async () => {
      const updateStub = sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({});
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "invoice.payment_succeeded",
        data: { object: { metadata: { user_id: USER_ID } } },
      });

      expect(response.processed).to.equal(true);
      const patch = updateStub.firstCall.args[1];
      expect(patch).to.not.have.property("current_period_start");
      expect(patch).to.not.have.property("current_period_end");
    });

    it("should return processed: false for payment_succeeded when user not resolved", async () => {
      const response = await subscriptionService.handleWebhook({
        type: "invoice.payment_succeeded",
        data: { object: {} },
      });

      expect(response.processed).to.equal(false);
    });

    // ── customer.subscription.updated ──
    it("should map canceled status to Cancelled and downgrade", async () => {
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        plan: "Free", status: "Cancelled",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "customer.subscription.updated",
        data: { object: { metadata: { user_id: USER_ID }, status: "canceled" } },
      });

      expect(response.processed).to.equal(true);
    });

    it("should map active status and update period dates", async () => {
      const updateStub = sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "customer.subscription.updated",
        data: {
          object: {
            metadata: { user_id: USER_ID },
            status: "active",
            current_period_start: 1700000000,
            current_period_end: 1800000000,
            cancel_at_period_end: false,
          },
        },
      });

      expect(response.processed).to.equal(true);
      const patch = updateStub.firstCall.args[1];
      expect(patch.status).to.equal("Active");
      expect(patch.current_period_start).to.be.instanceOf(Date);
    });

    it("should downgrade when period is expired in subscription.updated", async () => {
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        plan: "Free", status: "Cancelled",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "customer.subscription.updated",
        data: {
          object: {
            metadata: { user_id: USER_ID },
            status: "active",
            current_period_end: 1000000, // way in the past
          },
        },
      });

      expect(response.processed).to.equal(true);
    });

    it("should return processed: false for subscription.updated when user not resolved", async () => {
      const response = await subscriptionService.handleWebhook({
        type: "customer.subscription.updated",
        data: { object: {} },
      });

      expect(response.processed).to.equal(false);
    });

    // ── customer.subscription.deleted ──
    it("should downgrade to Free on customer.subscription.deleted", async () => {
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        plan: "Free", status: "Cancelled",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "customer.subscription.deleted",
        data: { object: { metadata: { user_id: USER_ID } } },
      });

      expect(response.processed).to.equal(true);
    });

    it("should return processed: false for subscription.deleted when user not resolved", async () => {
      const response = await subscriptionService.handleWebhook({
        type: "customer.subscription.deleted",
        data: { object: {} },
      });

      expect(response.processed).to.equal(false);
    });

    // ── Edge cases ──
    it("should return processed: false for unhandled event type", async () => {
      const response = await subscriptionService.handleWebhook({
        type: "some.unknown.event",
        data: { object: {} },
      });

      expect(response.processed).to.equal(false);
      expect(response.reason).to.equal("Unhandled event type.");
    });

    it("should throw BadRequestError when event type is missing", async () => {
      try {
        await subscriptionService.handleWebhook({});
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(BadRequestError);
        expect(err.message).to.include("event type is required");
      }
    });

    // ── resolveUserIdFromWebhookObject paths ──
    it("should resolve userId via client_reference_id", async () => {
      sinon.stub(subscriptionRepository, "upsertSubscriptionByUserId").resolves({
        user_id: USER_ID, plan: "Artist Pro", status: "Active",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "checkout.session.completed",
        data: {
          object: {
            client_reference_id: USER_ID,
            metadata: { plan: "Artist Pro" },
          },
        },
      });

      expect(response.processed).to.equal(true);
    });

    it("should resolve userId via stripe customer lookup", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByStripeCustomerId").resolves({
        user_id: USER_ID,
      });
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        plan: "Free", status: "Cancelled",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "customer.subscription.deleted",
        data: { object: { customer: "cus_456" } },
      });

      expect(response.processed).to.equal(true);
    });

    it("should resolve userId via stripe subscription id lookup", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByStripeCustomerId").resolves(null);
      sinon.stub(subscriptionRepository, "findSubscriptionByStripeSubscriptionId").resolves({
        user_id: USER_ID,
      });
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        plan: "Free", status: "Cancelled",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "customer.subscription.deleted",
        data: { object: { customer: "cus_unknown", subscription: "sub_789" } },
      });

      expect(response.processed).to.equal(true);
    });

    it("should resolve userId via payload object id", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByStripeCustomerId").resolves(null);
      const findByStripeSub = sinon.stub(subscriptionRepository, "findSubscriptionByStripeSubscriptionId");
      findByStripeSub.onFirstCall().resolves(null); // subscription field
      findByStripeSub.onSecondCall().resolves({ user_id: USER_ID }); // id field
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        plan: "Free", status: "Cancelled",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const response = await subscriptionService.handleWebhook({
        type: "customer.subscription.deleted",
        data: { object: { customer: "cus_x", subscription: "sub_x", id: "sub_actual" } },
      });

      expect(response.processed).to.equal(true);
    });
  });

  // ═══════════════════════════════════════════
  // syncExpiredSubscriptions()
  // ═══════════════════════════════════════════
  describe("syncExpiredSubscriptions()", () => {
    it("should downgrade all expired paid subscriptions", async () => {
      sinon.stub(subscriptionRepository, "findExpiredPaidSubscriptions").resolves([
        { user_id: "user_1" },
        { user_id: "user_2" },
      ]);
      sinon.stub(subscriptionRepository, "updateSubscriptionByUserId").resolves({
        plan: "Free", status: "Cancelled",
      });
      sinon.stub(userRepository, "updateById").resolves({});

      const summary = await subscriptionService.syncExpiredSubscriptions();

      expect(summary.checked).to.equal(2);
      expect(summary.downgraded).to.equal(2);
    });

    it("should return zeroes when no subscriptions are expired", async () => {
      sinon.stub(subscriptionRepository, "findExpiredPaidSubscriptions").resolves([]);

      const summary = await subscriptionService.syncExpiredSubscriptions();

      expect(summary.checked).to.equal(0);
      expect(summary.downgraded).to.equal(0);
    });
  });

  // ═══════════════════════════════════════════
  // assertCanOfflineListen()
  // ═══════════════════════════════════════════
  describe("assertCanOfflineListen()", () => {
    it("should throw ForbiddenError when plan does not support offline listening", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(FREE_SUB);
      subscriptionRepository.findPlanLimitByPlan.restore();
      sinon.stub(subscriptionRepository, "findPlanLimitByPlan").resolves(FREE_PLAN_LIMIT);

      try {
        await subscriptionService.assertCanOfflineListen(USER_ID);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ForbiddenError);
        expect(err.message).to.include("Offline listening is not available");
      }
    });

    it("should return entitlement when plan supports offline listening", async () => {
      sinon.stub(subscriptionRepository, "findSubscriptionByUserId").resolves(ACTIVE_PRO_SUB);
      subscriptionRepository.findPlanLimitByPlan.restore();
      sinon.stub(subscriptionRepository, "findPlanLimitByPlan").resolves(PRO_PLAN_LIMIT);

      const result = await subscriptionService.assertCanOfflineListen(USER_ID);

      expect(result).to.have.property("effectivePlan", "Artist Pro");
      expect(result.planLimit.can_offline_listen).to.equal(true);
    });
  });
});
