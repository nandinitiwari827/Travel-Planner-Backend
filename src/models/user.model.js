import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

let userSchema=new Schema({
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phoneNumber: {
        type: Number,
        required: true,
        unique: true
    },
    fullName:{
        type: String,
        required: true,
        index: true,
        trim: true
    },
    password:{
        type: String,
        required: true
    },
    
    refreshToken:{
        type: String,
    }
}, {timestamps: true})

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password || typeof this.password !== 'string') {
    return next();
  }
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.isPasswordCorrect = async function (password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Input password must be a non-empty string');
  }
  if (!this.password || typeof this.password !== 'string') {
    throw new Error('Stored password is missing or invalid');
  }
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullName: this.fullName,
            phoneNumber: this.phoneNumber      
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id: this._id,     
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

userSchema.index({fullName: "text"})

export let User=mongoose.model("User", userSchema)


