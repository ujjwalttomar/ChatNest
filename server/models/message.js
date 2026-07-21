
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    text : {
        type : String
    },
    sender : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    receiver : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User'
    },
    group : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Group'
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent',
    },
    chatType: {
        type : String,
        enum : ['direct', 'group'],
        required : true
    },
    deleted : {
        type : Boolean,
        default : false
    },
    deletedAt : {
        type : Date
    },
    deletedFor :[ {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    }],
    edited : {
        type : Boolean,
        default : false
    },
    editedAt: {
        type : Date
    }

},{timestamps : true});

const Message = mongoose.model("Message", messageSchema);
export default Message;