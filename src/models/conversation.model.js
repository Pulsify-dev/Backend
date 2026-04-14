import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      required: [true, "Participants are required"],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: "Conversation must have exactly 2 participants",
      },
    },
    participant_pair_id: {
      type: String,
      required: [true, "Participant pair is required"],
      unique: true,
      index: true,
    },
    last_message_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.pre("validate", function () {
  if (!Array.isArray(this.participants) || this.participants.length !== 2) {
    return;
  }

  const sortedParticipants = [...this.participants].sort((a, b) =>
    a.toString().localeCompare(b.toString()),
  );

  const participantIds = sortedParticipants.map((participant) =>
    participant.toString(),
  );

  if (participantIds[0] === participantIds[1]) {
    this.invalidate("participants", "Conversation participants must be two different users");
    return;
  }

  this.participants = sortedParticipants;
  this.participant_pair_id = participantIds.join("-");
});


const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;