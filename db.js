const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

// Create a schema for the storing user handle
const userHandleSchema = new mongoose.Schema({
    guildId: { type: String, required: true },  // New field for guild ID
    userId: { type: String, required: true },
    handle: { type: String, required: true },
});
const UserHandle = mongoose.model('UserHandle', userHandleSchema);

// Create a schema for the dark web channel
const darkWebChannelSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true },
});
const DarkWebChannel = mongoose.model('DarkWebChannel', darkWebChannelSchema);

// Create a schema for the logging Admin Actions
const adminActionSchema = new mongoose.Schema({
    actionType: { type: String, required: true }, // Example: 'add', 'remove'
    performedBy: { type: String, required: true }, // ID of the user who performed the action
    targetUserId: { type: String, required: true }, // ID of the user affected (added/removed)
    timestamp: { type: Date, default: Date.now }, // Timestamp of when the action occurred
    guildId: { type: String, required: true }, // ID of the server/guild
});
const AdminAction = mongoose.model('AdminAction', adminActionSchema);

module.exports = { UserHandle, DarkWebChannel, AdminAction };