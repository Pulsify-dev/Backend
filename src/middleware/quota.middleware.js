import subscriptionService from "../services/subscription.service.js";

const attachEntitlement = async (req, res, next) => {
	try {
		const userId = req.user?._id || req.user?.user_id;
		req.entitlement = await subscriptionService.getPlanLimitForUser(userId);
		next();
	} catch (error) {
		next(error);
	}
};

const requireOfflineListening = async (req, res, next) => {
	try {
		const userId = req.user?._id || req.user?.user_id;
		await subscriptionService.assertCanOfflineListen(userId);
		next();
	} catch (error) {
		next(error);
	}
};

export default {
	attachEntitlement,
	requireOfflineListening,
};
