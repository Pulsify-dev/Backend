import mongoose from "mongoose";

const followSchema = mongoose.Schema(
  {
    follower_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true,'Follower ID is required'],
      index: true,
    },
    following_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true,'Following ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

//make sure the user cant follow the same person morethan once 
followSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });

//user cant follow himself
followSchema.pre('save', async function (next) {
  if (this.follower_id.equals(this.following_id)) {
    throw new Error('Cannot follow yourself');
  }
  next();
});

const Follow = mongoose.model('Follow', followSchema);
export default Follow;
