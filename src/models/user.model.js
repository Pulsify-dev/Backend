import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']

    },
    password: {
        type: String,
        minlength: 8,
        select: false,
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        lowercase: true,
        trim: true,
        minlength: [6, 'Username must be at least 6 characters'],
        maxlength: [20, 'Username cannot exceed 20 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Usernames can only contain letters, numbers, and underscores'],
    },
    display_name: {
        type: String,
        required: [true, 'A display name is required'],
        trim: true,
        minlength: [1, 'Display name must be at least 1 characters'],
        maxlength: [50, 'Display name cannot exceed 50 characters'],
        default: function () {
            return this.username;
        }
    },
    bio: {
        type: String,
        trim: true,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        default: ''
    },
    location: {
        type: String,
        trim: true,
        maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    role: {
        type: String,
        enum: ['User', 'Admin'],
        default: 'User',
    },
    tier: {
        type: String,
        enum: ['Free', 'Artist Pro'],
        default: 'Free',
    },
    is_private: {
        type: Boolean,
        default: false,
    },
    is_verified: {
        type: Boolean,
        default: false,
    },
    is_suspended: {
        type: Boolean,
        default: false
    },
    avatar_url: {
        type: String,
        default: 'avatar-url.png',
    },
    cover_url: {
        type: String,
        default: 'cover-url.png',
    },
    favorite_genres: {
        type: [String],
        trim: true,
        index: true,
        default: [],
    },
    social_links: {
        instagram: { type: String, trim: true, default: '' },
        x: { type: String, trim: true, default: '' },
        facebook: { type: String, trim: true, default: '' },
        website: { type: String, trim: true, default: '' },
    },
    device_tokens: {
        type: [String],
        default: [],
        index: true,
    },
    followers_count: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer"
        }
    },
    following_count: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer"
        }
    },
    track_count: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer"
        }
    },
    playlist_count: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer"
        }
    },
    upload_duration_used_seconds: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer"
        }
    },
    storage_used_bytes: {
        type: Number,
        min: 0,
        default: 0,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer"
        }
    },

    google_id: {
        type: String,
        default: null,
        sparse: true,
        index: true,
    },
    email_verification_token: {
        type: String,
        default: null,
        select: false,
    },
    email_verification_expires: {
        type: Date,
        default: null,
        select: false,
    },
    password_reset_token: {
        type: String,
        default: null,
        select: false,
    },
    password_reset_expires: {
        type: Date,
        default: null,
        select: false,
    },
    pending_email: {
        type: String,
        default: null,
        select: false,
    },
    pending_email_token: {
        type: String,
        default: null,
        select: false,
    },
    pending_email_expires: {
        type: Date,
        default: null,
        select: false,
    },
},
    {

        timestamps: true,
    }
);
//can add can_upload bool and change tiers enum
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 12);
    next();
});
userSchema.methods.comparePassword = async function (typedPassword, userPassword) {
    return await bcrypt.compare(typedPassword, userPassword);
};

const User = mongoose.model('User', userSchema);
export default User;