const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String, required: true }, // store video path/URL
  thumbnail: { type: String }, // optional preview image
  category: { type: String }, // e.g., "Education", "Music"
  duration: { type: Number }, // store in seconds
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Likes
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  likeCount: { type: Number, default: 0 },
views: { type: Number, default: 0 },

  // Feedbacks
  feedbacks: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      comment: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
