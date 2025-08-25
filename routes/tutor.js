// routes/tutor.js
const express = require("express");
const router = express.Router();
const Video = require("../models/Video");   // ✅ renamed correctly
const User = require("../models/User");
const authenticateToken = require("../middlewares/checkLog");
const getUser = require("../middlewares/getUser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Save uploads in 'uploads/' folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// 📌 Tutor dashboard
router.get("/dashboard", authenticateToken, getUser, async (req, res) => {
  try {
    const tutorId = req.user._id;

    // Videos uploaded by tutor
    const videos = await Video.find({ uploadedBy: tutorId }).sort({ createdAt: -1 });

    // Stats calculations
    const totalVideos = videos.length;
    const totalLikes = videos.reduce((acc, v) => acc + (v.likes ? v.likes.length : 0), 0);
    const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);

  

    res.render("protected/tutor/dashboard", {
      title: "Tutor Dashboard",
      user: req.user,
      stats: { totalVideos,  totalViews, totalLikes },
      videos,
      isLoggedIn: true,
      activities: [
        "Uploaded a new video",
        "Updated video details",
        "Shared a tutorial"
      ]
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading dashboard.");
    res.redirect("/login");
  }
});


// 📌 GET: Render video upload form
router.get("/videos/upload", authenticateToken, getUser, (req, res) => {
  res.render("protected/tutor/upload-video", {
    title: "Upload Video",
    user: req.user,
    isLoggedIn: true
  });
});

// 📌 POST: Handle video upload
router.post(
  "/videos/upload",
  authenticateToken,
  getUser,
  upload.single("video"),
  async (req, res) => {
    try {
      const { title, description, category } = req.body;

      if (!title || !req.file) {
        req.flash("error", "Title and video file are required.");
        return res.redirect("/tutor/videos/upload");
      }

      const newVideo = new Video({
        title,
        description,
        category,
        videoUrl: `/uploads/${req.file.filename}`,
        uploadedBy: req.user._id,
      });

      await newVideo.save();

      req.flash("success", "Video uploaded successfully!");
      res.redirect("/tutor/dashboard");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error uploading video");
      res.redirect("/tutor/videos/upload");
    }
  }
);

// 📌 All videos uploaded by tutor
router.get("/videos", authenticateToken, getUser, async (req, res) => {
  try {
    const user = req.user;
    const videos = await Video.find({ uploadedBy: user._id }).sort({ createdAt: -1 });

    res.render("protected/tutor/videos", {
      title: "My Videos",
      user,
      videos,
      isLoggedIn: true
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading videos");
    res.redirect("/tutor/dashboard");
  }
});

// 📌 GET: Edit video details
router.get("/videos/:id/edit", authenticateToken, getUser, async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.redirect("/tutor/dashboard");

  res.render("protected/tutor/edit-video", {
    title: `Edit: ${video.title}`,
    video,
    user: req.user,
    isLoggedIn: true
  });
});

// 📌 POST: Update video details
router.post("/videos/:id/edit", authenticateToken, getUser, upload.single("video"), async (req, res) => {
  try {
    const { title, description, category } = req.body;

    const video = await Video.findById(req.params.id);
    if (!video) {
      req.flash("error", "Video not found!");
      return res.redirect("/tutor/videos");
    }

    const updateData = { title, description, category };

    // If new video uploaded → delete old one
    if (req.file) {
      if (video.videoUrl) {
        const oldPath = path.join(__dirname, "../../", video.videoUrl);
        fs.unlink(oldPath, (err) => {
          if (err) console.error("Error deleting old video:", err);
        });
      }
      updateData.videoUrl = "/uploads/videos/" + req.file.filename;
    }

    await Video.findByIdAndUpdate(req.params.id, updateData);

    req.flash("success", "Video updated successfully!");
    res.redirect("/tutor/videos");
  } catch (err) {
    console.error(err);
    req.flash("error", "Error updating video");
    res.redirect(`/tutor/videos/${req.params.id}/edit`);
  }
});
router.post("/videos/:id/delete", authenticateToken, getUser, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      req.flash("error", "Video not found!");
      return res.redirect("/tutor/videos");
    }

    // Delete file from disk
    if (video.videoUrl) {
      const filePath = path.join(__dirname, "../../", video.videoUrl);
      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting video file:", err);
      });
    }

    // Delete DB record
    await Video.findByIdAndDelete(req.params.id);

    req.flash("success", "Video deleted successfully!");
    res.redirect("/tutor/videos");
  } catch (err) {
    console.error(err);
    req.flash("error", "Error deleting video");
    res.redirect("/tutor/videos");
  }
});
module.exports = router;
