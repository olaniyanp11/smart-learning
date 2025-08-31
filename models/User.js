const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Name is required"], trim: true },
  email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true, match: [/\S+@\S+\.\S+/, "Email is invalid"] },
  role: { type: String, enum: ["user", "tutor"], default: "user" },
  password: { type: String, required: [true, "Password is required"], minlength: 6 },

  // 🔔 Simple notification (e.g., last video checked or unread flag)
notification: {
  lastVideoChecked: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
  hasNewVideo: { type: Boolean, default: false },
  watchedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }] // track what user already watched
}


}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);