const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

router.post("/events", analyticsController.trackEvent);

router.get("/category", analyticsController.trackCategory);
router.get("/session/:sessionId",analyticsController.getSessionEvents);
router.get("/detect-bot/:sessionId",analyticsController.detectBot);
router.get("/evaluate-bot",analyticsController.evaluateBotDetector);
router.get("/dashboard",analyticsController.botDashboard);
module.exports = router;