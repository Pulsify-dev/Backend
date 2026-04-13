import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
	{
		conversation_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Conversation",
			required: [true, "Conversation ID is required"],
			index: true,
		},
		sender_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: [true, "Sender ID is required"],
			index: true,
		},
		text: {
			type: String,
			trim: true,
			maxlength: [2000, "Message text cannot exceed 2000 characters"],
			default: null,
		},
		shared_entity: {
			type: {
				type: String,
				enum: ["Track", "Playlist"],
			},
			id: {
				type: mongoose.Schema.Types.ObjectId,
			},
		},
		is_read: {
			type: Boolean,
			default: false,
			index: true,
		},
		read_at: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
	},
);

messageSchema.pre("validate", function (next) {
	if (typeof this.text === "string") {
		this.text = this.text.trim();
	}

	const hasText = !!this.text;
	const hasSharedEntity =
		!!this.shared_entity && !!this.shared_entity.type && !!this.shared_entity.id;

	if (!hasText && !hasSharedEntity) {
		this.invalidate("text", "Message must contain text or shared_entity");
	}

	if (hasText || hasSharedEntity) {
		next();
		return;
	}

	next();
});

messageSchema.index({ conversation_id: 1, createdAt: 1 });
messageSchema.index({ conversation_id: 1, is_read: 1, sender_id: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
