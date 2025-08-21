const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const authenticateToken = require('../middlewares/checkLog');
const redirectIfAuthenticated = require('../middlewares/redirect');
const getUser = require('../middlewares/getUser');
const Video = require('../models/Video');

// Pages
router.get('/', getUser, (req, res) => {
    const user = req.user || null;
    const isLoggedIn = !!user;   // true if user exists, false otherwise

    res.render('index', { 
        title: 'Home', 
        user, 
        isLoggedIn 
    });
});

router.get('/register',redirectIfAuthenticated, (req, res) => {
 const isLoggedIn = false; // Not logged in on register page
  return res.render('register', { title: 'Register', isLoggedIn });
});

router.get('/login',redirectIfAuthenticated, (req, res) => {
 const isLoggedIn = false; // Not logged in on register page
  
  return  res.render('login', { title: 'Login  Page',isLoggedIn });
});

// POST /register
router.post("/register", async (req, res) => {
 try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      req.flash("error", "All fields are required");
      return res.redirect("/register");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already registered");
      return res.redirect("/register");
    }

    if (password.length < 6) {
      req.flash("error", "Password must be at least 6 characters");
      return res.redirect("/register");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "student", // default student
    });

    await user.save();

    req.flash("success", "Account created successfully. Please login.");
    res.redirect("/login");
  } catch (error) {
    console.error("Registration Error:", error);
    req.flash("error", "Server error during registration");
    res.redirect("/register");
  }
})
// POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            req.flash('error', 'Invalid email or password.');

            return res.redirect('/login');
        }

        const token = jsonwebtoken.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });

        req.flash('success', 'Welcome back!');
        if(user.role === 'user') return res.redirect('/videos');
        if(user.role === 'tutor') return res.redirect('/tutor/dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while logging in.');
        res.redirect('/login');
    }
});

// GET /dashboard
router.get('/videos', authenticateToken, getUser, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/logout');
        }

        // Fetch all videos from DB, sorted newest first
        const videos = await Video.find().populate('uploadedBy', 'username').sort({ createdAt: -1 });

        const isLoggedIn = req.isLoggedIn;   

        res.render('protected/all-videos', {
            title: 'All Videos',
            user,
            isLoggedIn,
            videos // 👈 pass videos to EJS
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong.');
        res.redirect('/login');
    }
});

router.get("/videos/:id", authenticateToken, getUser, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/logout");
    }

    const video = await Video.findById(req.params.id)
      .populate("uploadedBy", "username email"); // show uploader info

    if (!video) {
      req.flash("error", "Video not found.");
      return res.redirect("/videos");
    }

    const isLoggedIn = req.isLoggedIn;
video.views = (video.views || 0) + 1;
await video.save(); // increment views
    res.render("protected/single-video", {
      title: video.title,
      user,
      video,
      isLoggedIn
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong.");
    res.redirect("/videos");
  }
});
router.post("/videos/:id/feedback", authenticateToken, getUser, async (req, res) => {
  try {
    const { comment } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      req.flash("error", "Video not found.");
      return res.redirect("/videos");
    }

    video.feedbacks.push({
      user: req.user._id,
      comment
    });

    await video.save();
    req.flash("success", "Feedback added!");
    res.redirect(`/videos/${video._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not add feedback.");
    res.redirect("/videos");
  }
});
// PROFILE PAGE (GET)
router.get('/profile', authenticateToken, getUser, (req, res) => {
    const user = req.user;
    if (!user) {
        req.flash('error', 'Please log in to view your profile.');
        return res.redirect('/login');
    }
    const isLoggedIn = true

    res.render('protected/profile', {
        title: 'Your Profile',
        user,
        isLoggedIn
    });
});

router.post('/profile', authenticateToken, getUser, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/login');
        }

        const { name, email, password,learningStyle } = req.body;

        // Update fields dynamically
        if (name && name.trim() !== '') user.name = name;
        if (email && email.trim() !== '') user.email = email;

        // Password update only if provided
        if (password && password.length >= 6) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        req.flash('success', 'Profile updated successfully.');
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong while updating your profile.');
        res.redirect('/profile');
    }
});
// POST like/unlike
// Backend
router.post("/videos/:id/like", authenticateToken, getUser, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      req.flash("error", "Video not found.");
      return res.redirect("/videos");
    }

    const userId = req.user._id;

    if (video.likes.includes(userId)) {
      // unlike
      video.likes.pull(userId);
    } else {
      // like
      video.likes.push(userId);
    }

    await video.save();

    // Redirect back to the page where the request came from
    res.redirect(req.get('referer') || '/videos');

  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong.");
    res.redirect("/videos");
  }
});


// GET /logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.flash('success', 'You have logged out.');
    res.redirect('/login');
});

module.exports = router;
