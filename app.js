const express = require('express');
const path = require('path');
const route = require('./routes/route');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieparser = require('cookie-parser');
const flash = require('connect-flash');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const dotenv = require('dotenv');
const User = require('./models/User');
dotenv.config()
const app = express();



// Session only for flash
app.use(session({
  secret: 'just_for_flash_only',
  resave: false,
  saveUninitialized: false,
}));

app.use(flash());
// Flash message variables accessible in views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.errors = req.flash('errors'); // Optional for validation arrays
  next();
});
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(morgan('tiny'));
app.use(cookieparser());
app.use('/', route);


app.use(async (req, res, next)=>{
   const token = req.cookies.token;
  let user = null;

  if (!token) {
    req.user = null;
  }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      req.user = null;
      return next();
    }
  
    res.render('404', { title: '404 Not Found' , user, isLoggedIn :!!user});
})

app.listen(3000,
    () => {
        console.log('🚀 Server running on http://localhost:3000')
       mongoose.connect(process.env.dbURL).then(()=>{
            console.log('✅ Connected to MongoDB');
        }).catch((err)=>{
            console.error('❌ Error connecting to MongoDB:', err);
        });
    });