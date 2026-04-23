import cron from "node-cron";
import subscriptionService from "../services/subscription.service.js";

export const syncExpiredSubscriptionsNow = async () => {
	const summary = await subscriptionService.syncExpiredSubscriptions();
	console.log(
		`[Subscription Expiry Job] Checked ${summary.checked}, downgraded ${summary.downgraded}.`,
	);
	return summary;
};

export const startSubscriptionExpiryCron = () => {
	// Every 30 minutes: keep subscription status and quotas consistent.
	cron.schedule("*/30 * * * *", async () => {
		try {
			await syncExpiredSubscriptionsNow();
		} catch (error) {
			console.error("[Subscription Expiry Job] Error:", error);
		}
	});

	console.log("[Subscription Expiry Job] Cron scheduled — runs every 30 minutes.");
};
