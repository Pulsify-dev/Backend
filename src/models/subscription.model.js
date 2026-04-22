import mongoose from "mongoose";

const PLAN_ENUM = ["Free", "Artist Pro"];
const STATUS_ENUM = ["Active", "Cancelled", "Past_Due", "Trialing"];

const subscriptionSchema = mongoose.Schema(
	{
		user_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			unique: true,
			index: true,
		},
		plan: {
			type: String,
			enum: PLAN_ENUM,
			default: "Free",
			index: true,
		},
		status: {
			type: String,
			enum: STATUS_ENUM,
			default: "Active",
			index: true,
		},
		stripe_customer_id: {
			type: String,
			default: null,
			index: true,
			sparse: true,
		},
		stripe_subscription_id: {
			type: String,
			default: null,
			index: true,
			sparse: true,
		},
		current_period_start: {
			type: Date,
			default: null,
		},
		current_period_end: {
			type: Date,
			default: null,
		},
		cancel_at_period_end: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	},
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
