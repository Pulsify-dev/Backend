import subscriptionService from "../services/subscription.service.js";

// ── Ad asset config (lives in logic, not in the plan model) ──
const AD_VIDEO_URL = "https://pulsify-s3-dev.s3.eu-central-1.amazonaws.com/%D8%A7%D8%B9%D9%84%D8%A7%D9%86+%DA%A4%D9%88%D8%AF%D8%A7%D9%81%D9%88%D9%86+%D8%B1%D9%85%D8%B6%D8%A7%D9%86+%D9%A2%D9%A0%D9%A2%D9%A6+-+%D9%8A%D8%A7+%D9%88%D8%A7%D8%AD%D8%B4%D9%86%D9%8A+-+%D8%B1%D9%85%D8%B6%D8%A7%D9%86+%D9%81%D8%B1%D8%B5%D8%A9+%D9%86%D9%86%D9%88%D8%B1+%D8%A8%D8%B9%D8%B6+-+Vodafone+Egypt+(360p%2C+h264).mp4";

const getMySubscription = async (req, res, next) => {
	try {
		const userId = req.user._id || req.user.user_id;
		const result = await subscriptionService.getSubscriptionSnapshotForUser(userId);

		const resultWithFeatures = {
			...result,
			features: {
				ad_free: result.plan_limits?.is_ad_free || false,
				unlimited_uploads: result.plan_limits?.upload_track_limit === null,
				offline_listening: result.plan_limits?.can_offline_listen || false,
				ad_interval_seconds: result.plan_limits?.ad_interval_seconds || null,
				ad_video_url: (result.plan_limits?.is_ad_free) ? null : AD_VIDEO_URL
			}
		};

		res.status(200).json({
			success: true,
			data: resultWithFeatures,
		});
	} catch (error) {
		next(error);
	}
};

const getPlans = async (req, res, next) => {
	try {
		const plans = await subscriptionService.getAllPlans();

		const plansWithAdConfig = plans.map(plan => {
			const planObj = plan.toObject ? plan.toObject() : plan;
			planObj.ad_video_url = planObj.is_ad_free ? null : AD_VIDEO_URL;
			return planObj;
		});

		res.status(200).json({
			success: true,
			data: plansWithAdConfig,
		});
	} catch (error) {
		next(error);
	}
};

const getUsage = async (req, res, next) => {
	try {
		const userId = req.user._id || req.user.user_id;
		const usage = await subscriptionService.getUsageForUser(userId);

		res.status(200).json({
			success: true,
			data: usage,
		});
	} catch (error) {
		next(error);
	}
};

const createCheckout = async (req, res, next) => {
	try {
		const userId = req.user._id || req.user.user_id;
		const { plan, success_url: successUrl, cancel_url: cancelUrl } = req.body;

		const checkout = await subscriptionService.createCheckoutSession({
			userId,
			plan,
			successUrl,
			cancelUrl,
		});

		res.status(200).json({
			success: true,
			data: checkout,
		});
	} catch (error) {
		next(error);
	}
};

const cancelSubscription = async (req, res, next) => {
	try {
		const userId = req.user._id || req.user.user_id;
		const updated = await subscriptionService.cancelSubscriptionAtPeriodEnd(userId);

		res.status(200).json({
			success: true,
			data: updated,
		});
	} catch (error) {
		next(error);
	}
};

const handleWebhook = async (req, res, next) => {
	try {
		const result = await subscriptionService.handleWebhook(req.body);

		res.status(200).json({
			received: true,
			...result,
		});
	} catch (error) {
		next(error);
	}
};

export default {
	getMySubscription,
	getPlans,
	getUsage,
	createCheckout,
	cancelSubscription,
	handleWebhook,
};
