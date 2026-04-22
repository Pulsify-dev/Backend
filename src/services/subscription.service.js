import subscriptionRepository from "../repositories/subscription.repository.js";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../utils/errors.utils.js";

const FREE_PLAN = "Free";

const getEffectivePlan = (subscription) => {
	if (!subscription) return FREE_PLAN;
	if (subscription.status !== "Active") return FREE_PLAN;
	return subscription.plan || FREE_PLAN;
};

const getSubscriptionByUserId = async (userId) => {
	if (!userId) {
		throw new BadRequestError("User ID is required.");
	}

	let subscription = await subscriptionRepository.findSubscriptionByUserId(userId);
	if (!subscription) {
		subscription = await subscriptionRepository.createDefaultFreeSubscription(userId);
	}

	return subscription;
};

const getPlanLimitForUser = async (userId) => {
	const subscription = await getSubscriptionByUserId(userId);
	let effectivePlan = getEffectivePlan(subscription);

	let planLimit = await subscriptionRepository.findPlanLimitByPlan(effectivePlan);
	if (!planLimit && effectivePlan !== FREE_PLAN) {
		effectivePlan = FREE_PLAN;
		planLimit = await subscriptionRepository.findPlanLimitByPlan(FREE_PLAN);
	}

	if (!planLimit) {
		throw new NotFoundError(
			"Plan limits are not configured. Please run the plan-limits seed script.",
		);
	}

	return {
		subscription,
		effectivePlan,
		planLimit,
	};
};

const assertCanOfflineListen = async (userId) => {
	const entitlement = await getPlanLimitForUser(userId);
	if (!entitlement.planLimit.can_offline_listen) {
		throw new ForbiddenError(
			`Offline listening is not available on the ${entitlement.effectivePlan} plan.`,
		);
	}

	return entitlement;
};

export default {
	getSubscriptionByUserId,
	getPlanLimitForUser,
	assertCanOfflineListen,
};
