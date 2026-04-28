import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import PlanLimit from "../src/models/plan-limit.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const URL = process.env.MONGODB_URI;

if (!URL) {
	console.error("Missing MONGODB_URI in environment.");
	process.exit(1);
}

const PLAN_LIMIT_ROWS = [
	{
		plan: "Free",
		can_upload: true,
		upload_track_limit: 10,
		album_limit: 2,
		album_track_limit: 5,
		is_ad_free: false,
		ad_interval_seconds: 240,
		can_offline_listen: false,
		price_usd: 0,
	},
	{
		plan: "Artist Pro",
		can_upload: true,
		upload_track_limit: null,
		album_limit: null,
		album_track_limit: null,
		is_ad_free: true,
		ad_interval_seconds: null,
		can_offline_listen: true,
		price_usd: 9.99,
	},
];

const seedPlanLimits = async () => {
	try {
		await mongoose.connect(URL);
		console.log("Connected to MongoDB for plan-limits seed.");

		for (const row of PLAN_LIMIT_ROWS) {
			await PlanLimit.findOneAndUpdate(
				{ plan: row.plan },
				row,
				{
					upsert: true,
					new: true,
					runValidators: true,
					setDefaultsOnInsert: true,
				},
			);
		}

		console.log("Plan limits seed completed.");
		process.exit(0);
	} catch (error) {
		console.error("Plan limits seed failed:", error);
		process.exit(1);
	}
};

seedPlanLimits();
