import subscriptionService from "../services/subscription.service.js";

const getMySubscription = async (req, res, next) => {
	try {
		const userId = req.user._id || req.user.user_id;
		const result = await subscriptionService.getSubscriptionSnapshotForUser(userId);

		res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error) {
		next(error);
	}
};

const getPlans = async (req, res, next) => {
	try {
		const plans = await subscriptionService.getAllPlans();

		res.status(200).json({
			success: true,
			data: plans,
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
