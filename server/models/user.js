
import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true,
        minlength : 3,
        unique : true
    },
    email : {
        type : String,
        required : true,
        unique : true
    },
    password : {
        type : String,
        required : true,
        minlength : 8
    },
    avatar :{
        type : String,
        default : ''
    },
    isOnline : {
        type : Boolean,
        default : false
    },
    lastSeen : {
        type : Date
    },
    // for password reset
    passwordResetToken : {
        type : String
    },
    passwordResetExpires : {
        type : Date
    }
},{timestamps: true});

const User = mongoose.model("User", userSchema);
export default User;