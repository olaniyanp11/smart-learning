const express = require('express');
const authRoutes = require('./auth');
const tutorRoutes = require('./tutor')
const router = express.Router();

router.use("/",authRoutes)
router.use("/user",authRoutes)
router.use("/tutor",tutorRoutes)


module.exports = router;