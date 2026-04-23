import subscriptionRepository from "../repositories/subscription.repository.js";
import trackRepository from "../repositories/track.repository.js";
// TODO: import albumRepository once album module is delivered by teammate
import userRepository from "../repositories/user.repository.js";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../utils/errors.utils.js";

const FREE_PLAN = "Free";
const ARTIST_PRO_PLAN = "Artist Pro";
const ACTIVE_STATUSES = new Set(["Active"]);

const normalizePlanInput = (planInput) => {
	if (typeof planInput !== "string") {
		throw new BadRequestError("Plan is required.");
	}

	const normalized = planInput.toLowerCase().trim().replace(/[\s_-]+/g, "");
	if (normalized === "free") return FREE_PLAN;
	if (normalized === "artistpro" || normalized === "artist" || normalized === "pro") {
		return ARTIST_PRO_PLAN;
	}

	throw new BadRequestError("Unsupported plan. Allowed values: Free, Artist Pro.");
};

const isSubscriptionPeriodExpired = (subscription, referenceDate = new Date()) => {
	if (!subscription) return false;
	if (subscription.plan === FREE_PLAN) return false;
	if (!subscription.current_period_end) return false;

	return new Date(subscription.current_period_end).getTime() <= referenceDate.getTime();
};

const syncUserTier = async (userId, plan) => {
	await userRepository.updateById(userId, { tier: plan });
};

const downgradeSubscriptionToFree = async (userId) => {
	const updatedSubscription = await subscriptionRepository.updateSubscriptionByUserId(userId, {
		plan: FREE_PLAN,
		status: "Cancelled",
		current_period_start: null,
		current_period_end: null,
		cancel_at_period_end: false,
	});

	if (!updatedSubscription) {
		throw new NotFoundError("Subscription not found.");
	}

	await syncUserTier(userId, FREE_PLAN);
	return updatedSubscription;
};

const getEffectivePlan = (subscription) => {
	if (!subscription) return FREE_PLAN;
	if (!ACTIVE_STATUSES.has(subscription.status)) return FREE_PLAN;
	return subscription.plan || FREE_PLAN;
};

const getSubscriptionByUserId = async (userId) => {
	if (!userId) {
		throw new BadRequestError("User ID is required.");
	}

	let subscription = await subscriptionRepository.findSubscriptionByUserId(userId);
	if (!subscription) {
		subscription = await subscriptionRepository.createDefaultFreeSubscription(userId);
		await syncUserTier(userId, FREE_PLAN);
		return subscription;
	}

	if (isSubscriptionPeriodExpired(subscription)) {
		subscription = await downgradeSubscriptionToFree(userId);
	}

	return subscription;
};

const resolvePlanLimit = async (effectivePlan) => {
	let planLimit = await subscriptionRepository.findPlanLimitByPlan(effectivePlan);
	if (!planLimit && effectivePlan !== FREE_PLAN) {
		planLimit = await subscriptionRepository.findPlanLimitByPlan(FREE_PLAN);
	}

	if (!planLimit) {
		throw new NotFoundError(
			"Plan limits are not configured. Please run the plan-limits seed script.",
		);
	}

	return planLimit;
};

const getPlanLimitForUser = async (userId) => {
	const subscription = await getSubscriptionByUserId(userId);
	const effectivePlan = getEffectivePlan(subscription);
	const planLimit = await resolvePlanLimit(effectivePlan);

	return {
		subscription,
		effectivePlan,
		planLimit,
		is_expired: false,
	};
};

const buildRemaining = (used, limit) => {
	if (!Number.isInteger(limit)) return null;
	return Math.max(limit - used, 0);
};

const getUsageForUser = async (userId) => {
	const entitlement = await getPlanLimitForUser(userId);

	const trackCount = await trackRepository.countByArtistId(userId);

	// TODO: replace with albumRepository.countByArtistId(userId) once album module lands
	const albumCount = 0;

	return {
		plan: entitlement.effectivePlan,
		status: entitlement.subscription.status,
		usage: {
			uploaded_tracks: {
				used: trackCount,
				limit: entitlement.planLimit.upload_track_limit,
				remaining: buildRemaining(
					trackCount,
					entitlement.planLimit.upload_track_limit,
				),
			},
			albums: {
				used: albumCount,
				limit: entitlement.planLimit.album_limit,
				remaining: buildRemaining(
					albumCount,
					entitlement.planLimit.album_limit,
				),
			},
			album_tracks_per_album: {
				limit: entitlement.planLimit.album_track_limit,
			},
		},
		plan_limits: entitlement.planLimit,
	};
};

const getSubscriptionSnapshotForUser = async (userId) => {
	const entitlement = await getPlanLimitForUser(userId);

	return {
		subscription: entitlement.subscription,
		effective_plan: entitlement.effectivePlan,
		plan_limits: entitlement.planLimit,
	};
};

const activatePlanForUser = async ({
	userId,
	plan,
	stripeCustomerId = null,
	stripeSubscriptionId = null,
	periodStart = new Date(),
	periodEnd = null,
}) => {
	const normalizedPlan = normalizePlanInput(plan);
	if (normalizedPlan === FREE_PLAN) {
		throw new BadRequestError("Use cancellation/downgrade flow for Free plan.");
	}

	const resolvedPeriodStart = new Date(periodStart);
	const resolvedPeriodEnd =
		periodEnd !== null
			? new Date(periodEnd)
			: new Date(resolvedPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

	const updatedSubscription = await subscriptionRepository.upsertSubscriptionByUserId(
		userId,
		{
			user_id: userId,
			plan: normalizedPlan,
			status: "Active",
			stripe_customer_id: stripeCustomerId,
			stripe_subscription_id: stripeSubscriptionId,
			current_period_start: resolvedPeriodStart,
			current_period_end: resolvedPeriodEnd,
			cancel_at_period_end: false,
		},
	);

	await syncUserTier(userId, normalizedPlan);

	return updatedSubscription;
};

const createCheckoutSession = async ({ userId, plan, successUrl, cancelUrl }) => {
	if (!userId) {
		throw new BadRequestError("User ID is required.");
	}

	const updatedSubscription = await activatePlanForUser({ userId, plan });

	return {
		checkout_mode: "mock",
		checkout_url: successUrl || null,
		cancel_url: cancelUrl || null,
		subscription: updatedSubscription,
	};
};

const cancelSubscriptionAtPeriodEnd = async (userId) => {
	const subscription = await getSubscriptionByUserId(userId);

	if (subscription.plan === FREE_PLAN) {
		return subscription;
	}

	const updatedSubscription = await subscriptionRepository.updateSubscriptionByUserId(
		userId,
		{
			cancel_at_period_end: true,
		},
	);

	if (!updatedSubscription) {
		throw new NotFoundError("Subscription not found.");
	}

	return updatedSubscription;
};

const resolveUserIdFromWebhookObject = async (payloadObject = {}) => {
	if (payloadObject?.metadata?.user_id) return payloadObject.metadata.user_id;
	if (payloadObject?.client_reference_id) return payloadObject.client_reference_id;

	if (payloadObject?.customer) {
		const subscription = await subscriptionRepository.findSubscriptionByStripeCustomerId(
			payloadObject.customer,
		);
		if (subscription) return subscription.user_id;
	}

	if (payloadObject?.subscription) {
		const subscription =
			await subscriptionRepository.findSubscriptionByStripeSubscriptionId(
				payloadObject.subscription,
			);
		if (subscription) return subscription.user_id;
	}

	if (payloadObject?.id) {
		const subscription =
			await subscriptionRepository.findSubscriptionByStripeSubscriptionId(
				payloadObject.id,
			);
		if (subscription) return subscription.user_id;
	}

	return null;
};

const handleWebhook = async (eventPayload = {}) => {
	const eventType = eventPayload?.type;
	const payloadObject = eventPayload?.data?.object || {};

	if (!eventType) {
		throw new BadRequestError("Webhook event type is required.");
	}

	if (eventType === "checkout.session.completed") {
		const userId = await resolveUserIdFromWebhookObject(payloadObject);
		const requestedPlan = payloadObject?.metadata?.plan;
		if (!userId || !requestedPlan) {
			throw new BadRequestError("Webhook payload missing user_id or plan metadata.");
		}

		await activatePlanForUser({
			userId,
			plan: requestedPlan,
			stripeCustomerId: payloadObject.customer || null,
			stripeSubscriptionId: payloadObject.subscription || null,
		});

		return { processed: true, event: eventType };
	}

	if (eventType === "invoice.payment_failed") {
		const userId = await resolveUserIdFromWebhookObject(payloadObject);
		if (!userId) {
			return { processed: false, event: eventType, reason: "User could not be resolved." };
		}

		await downgradeSubscriptionToFree(userId);

		return { processed: true, event: eventType };
	}

	if (eventType === "invoice.payment_succeeded") {
		const userId = await resolveUserIdFromWebhookObject(payloadObject);
		if (!userId) {
			return { processed: false, event: eventType, reason: "User could not be resolved." };
		}

		const updatePatch = { status: "Active" };
		if (payloadObject?.period_start) {
			updatePatch.current_period_start = new Date(payloadObject.period_start * 1000);
		}
		if (payloadObject?.period_end) {
			updatePatch.current_period_end = new Date(payloadObject.period_end * 1000);
		}

		await subscriptionRepository.updateSubscriptionByUserId(userId, updatePatch);

		return { processed: true, event: eventType };
	}

	if (eventType === "customer.subscription.updated") {
		const userId = await resolveUserIdFromWebhookObject(payloadObject);
		if (!userId) {
			return { processed: false, event: eventType, reason: "User could not be resolved." };
		}

		const nextStatusRaw = typeof payloadObject.status === "string"
			? payloadObject.status.toLowerCase()
			: "active";

		const mappedStatus = nextStatusRaw === "canceled"
			? "Cancelled"
			: "Active";

		const updatePatch = {
			status: mappedStatus,
			cancel_at_period_end: Boolean(payloadObject?.cancel_at_period_end),
		};
		if (payloadObject?.current_period_start) {
			updatePatch.current_period_start = new Date(payloadObject.current_period_start * 1000);
		}
		if (payloadObject?.current_period_end) {
			updatePatch.current_period_end = new Date(payloadObject.current_period_end * 1000);
		}

		await subscriptionRepository.updateSubscriptionByUserId(userId, updatePatch);

		const periodExpired = payloadObject?.current_period_end
			? new Date(payloadObject.current_period_end * 1000).getTime() <= Date.now()
			: false;

		if (mappedStatus === "Cancelled" || periodExpired) {
			await downgradeSubscriptionToFree(userId);
		}

		return { processed: true, event: eventType };
	}

	if (eventType === "customer.subscription.deleted") {
		const userId = await resolveUserIdFromWebhookObject(payloadObject);
		if (!userId) {
			return { processed: false, event: eventType, reason: "User could not be resolved." };
		}

		await downgradeSubscriptionToFree(userId);
		return { processed: true, event: eventType };
	}

	return {
		processed: false,
		event: eventType,
		reason: "Unhandled event type.",
	};
};

const syncExpiredSubscriptions = async (referenceDate = new Date()) => {
	const expiredSubscriptions = await subscriptionRepository.findExpiredPaidSubscriptions(
		referenceDate,
	);

	let downgraded = 0;
	for (const subscription of expiredSubscriptions) {
		await downgradeSubscriptionToFree(subscription.user_id);
		downgraded += 1;
	}

	return {
		checked: expiredSubscriptions.length,
		downgraded,
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
	getSubscriptionSnapshotForUser,
	getUsageForUser,
	getAllPlans: subscriptionRepository.getAllPlanLimits,
	createCheckoutSession,
	cancelSubscriptionAtPeriodEnd,
	handleWebhook,
	syncExpiredSubscriptions,
	assertCanOfflineListen,
};
