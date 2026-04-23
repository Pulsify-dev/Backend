import Subscription from "../models/subscription.model.js";
import PlanLimit from "../models/plan-limit.model.js";

const findSubscriptionByUserId = function (userId) {
	return Subscription.findOne({ user_id: userId });
};

const findSubscriptionByStripeSubscriptionId = function (stripeSubscriptionId) {
	return Subscription.findOne({ stripe_subscription_id: stripeSubscriptionId });
};

const findSubscriptionByStripeCustomerId = function (stripeCustomerId) {
	return Subscription.findOne({ stripe_customer_id: stripeCustomerId });
};

const createSubscription = function (subscriptionData) {
	return Subscription.create(subscriptionData);
};

const createDefaultFreeSubscription = function (userId) {
	return Subscription.create({
		user_id: userId,
		plan: "Free",
		status: "Active",
	});
};

const upsertSubscriptionByUserId = function (userId, updatePatch) {
	return Subscription.findOneAndUpdate(
		{ user_id: userId },
		updatePatch,
		{
			upsert: true,
			returnDocument: "after",
			runValidators: true,
			setDefaultsOnInsert: true,
		},
	);
};

const updateSubscriptionByUserId = function (userId, updatePatch) {
	return Subscription.findOneAndUpdate(
		{ user_id: userId },
		updatePatch,
		{
			returnDocument: "after",
			runValidators: true,
		},
	);
};

const findExpiredPaidSubscriptions = function (referenceDate = new Date()) {
	return Subscription.find({
		plan: { $ne: "Free" },
		current_period_end: { $ne: null, $lte: referenceDate },
		status: { $in: ["Active", "Cancelled"] },
	});
};

const findPlanLimitByPlan = function (plan) {
	return PlanLimit.findOne({ plan });
};

const getAllPlanLimits = function () {
	return PlanLimit.find({}).sort({ plan: 1 }).lean();
};

const createPlanLimit = function (planLimitData) {
	return PlanLimit.create(planLimitData);
};

const upsertPlanLimitByPlan = function (plan, updatePatch) {
	return PlanLimit.findOneAndUpdate(
		{ plan },
		updatePatch,
		{
			upsert: true,
			returnDocument: "after",
			runValidators: true,
			setDefaultsOnInsert: true,
		},
	);
};

export default {
	findSubscriptionByUserId,
	findSubscriptionByStripeSubscriptionId,
	findSubscriptionByStripeCustomerId,
	createSubscription,
	createDefaultFreeSubscription,
	upsertSubscriptionByUserId,
	updateSubscriptionByUserId,
	findExpiredPaidSubscriptions,
	findPlanLimitByPlan,
	getAllPlanLimits,
	createPlanLimit,
	upsertPlanLimitByPlan,
};
