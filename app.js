if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}
const express = require("express");
const app = express();

const path = require("path");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
const ejsMate = require("ejs-mate");
app.engine('ejs', ejsMate);

app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/reviews.js");
const userRouter = require("./routes/user.js");
const analyticsRouter = require("./routes/analytics");

const session = require("express-session");
const flash = require("connect-flash");

const methodOverride = require("method-override");
app.use(methodOverride("_method"));

const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./model/user.js");

const ExpressError = require("./utils/ExpressError.js");

const mongoose = require("mongoose");
const MongoStore = require("connect-mongo").default;
const { resolve } = require("url");
// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL;
main()
    .then(() => {
        console.log("connected to DB Successfully");
    })
    .catch((err) => {
        console.log(err)
    });
async function main() {
    await mongoose.connect(dbUrl);
}

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});
store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
})
const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 7 * 24 * 60 * 60,
        maxAge: 1000 * 7 * 24 * 60 * 60,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/analytics", analyticsRouter);
app.use((req, res, next) => {
    next(new ExpressError(404, "Page not Found"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).render("alert.ejs", { message });
});

//Check server listen or not 
app.listen(1000, () => {
    console.log("server is litening to port 1000");
});