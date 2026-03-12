import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema=mongoose.Schema({
    email:{
        type:String,
        required:[true, 'Email is required'],
        unique:true,
        lowercase:true,
        trim:true,
        match:[/^\S+@\S+\.\S+$/,'Please use a valid email address']

    },
    password:{
        type:String,
        required:[true,'Password is required'],
        minlength:8,
        select:false,
    },
    username:{
        type:String,
        required:[true,'Username is required'],
        unique:true,
        lowercase:true,
        trim:true,
        minlength:[6,'Username must be at least 6 characters'],
        maxlength:[20,'Username cannot exceed 20 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Usernames can only contain letters, numbers, and underscores'],
    },
    display_name:{
        type:String,
        required:[true,'A display name is required'],
        trim

    }

});
userSchema.pre('save',async function (next) {
    if(!this.isModified('password')){
        return next;
    }
    this.password = await bcrypt.hash(this.password, 12);
    next(); 
});
userSchema.methods.comparePassword=async function(typedPassword,userPassword) {
    return await bcrypt.compare(typedPassword,userPassword);
};
const User=mongoose.model('User',userSchema);