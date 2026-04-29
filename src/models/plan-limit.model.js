import mongoose from "mongoose";

const PLAN_ENUM = ["Free", "Artist Pro"];

const integerOrNull = {
	validator: (value) => value === null || Number.isInteger(value),
	message: "{VALUE} is not an integer",
};

const planLimitSchema = mongoose.Schema(
	{
		plan: {
			type: String,
			enum: PLAN_ENUM,
			required: true,
			unique: true,
			index: true,
		},
		can_upload: {
			type: Boolean,
			required: true,
			default: false,
		},
		upload_track_limit: {
			type: Number,
			default: null,
			min: 0,
			validate: integerOrNull,
		},
		album_limit: {
			type: Number,
			default: null,
			min: 0,
			validate: integerOrNull,
		},
		album_track_limit: {
			type: Number,
			default: null,
			min: 1,
			validate: integerOrNull,
		},
		is_ad_free: {
			type: Boolean,
			default: false,
		},
		ad_interval_seconds: {
			type: Number,
			default: null,
		},
		can_offline_listen: {
			type: Boolean,
			default: false,
		},
		price_usd: {
			type: Number,
			required: true,
			min: 0,
			default: 0,
		},
	},
	{
		timestamps: true,
	},
);

const PlanLimit = mongoose.model("PlanLimit", planLimitSchema);

export default PlanLimit;
