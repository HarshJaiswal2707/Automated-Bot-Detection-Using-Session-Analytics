const BehaviorEvent = require("../model/behaviorEvent");
const { detectBot } = require("../services/botDetector");
const {
    humanSessions,
    basicBotSessions,
    humanLikeBotSessions
} = require("../research/experimentDataset");
module.exports.trackEvent = async (req, res) => {
  try {
    const {
      sessionId,
      eventType,
      page,
      listingId,
      metadata,
    } = req.body;

    if (!sessionId || !eventType) {
      return res.status(400).json({
        success: false,
        message: "sessionId and eventType are required",
      });
    }

    const behaviorEvent = new BehaviorEvent({
      sessionId,
      userId: req.user ? req.user._id : null,
      eventType,
      page: page || null,
      listingId: listingId || null,
      metadata: metadata || {},
    });

    await behaviorEvent.save();

    res.status(201).json({
      success: true,
      message: "Behavior event recorded",
    });
  } catch (error) {
    console.error("Analytics Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to record behavior event",
    });
  }
};
module.exports.trackCategory = async (req, res) => {
  try {
    const {
      category,
      sessionId,
      redirect
    } = req.query;

    if (!sessionId || !category) {
      return res.redirect(redirect || "/listings");
    }

    const behaviorEvent = new BehaviorEvent({
      sessionId: sessionId,
      userId: req.user ? req.user._id : null,
      eventType: "category_view",
      page: "/listings",
      listingId: null,
      metadata: {
        category: category
      }
    });

    await behaviorEvent.save();

    console.log("Category event saved:", category);

    res.redirect(redirect || "/listings");

  } catch (error) {

    console.error("Category tracking error:", error);

    res.redirect(req.query.redirect || "/listings");
  }
};
module.exports.getSessionEvents = async (req, res) => {

  try {

    const { sessionId } = req.params;


    if (!sessionId) {

      return res.status(400).json({

        success: false,

        message:
          "sessionId is required"

      });

    }


    const events =
      await BehaviorEvent
        .find({ sessionId })
        .sort({ timestamp: 1 })
        .select(
          "eventType page listingId metadata timestamp"
        );


    if (events.length === 0) {

      return res.status(404).json({

        success: false,

        message:
          "No events found for this session"

      });

    }


    res.json({

      success: true,

      events

    });


  } catch (error) {

    console.error(
      "Session Events Error:",
      error
    );


    res.status(500).json({

      success: false,

      message:
        "Failed to load session events"

    });

  }

};

module.exports.detectBot = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const result = await detectBot(sessionId);

        res.render("analytics/detectBot", {
            result: result,
            error: null
        });

    } catch (error) {
        console.error("Bot detection error:", error);

        res.status(500).render("analytics/detectBot", {
            result: null,
            error: error.message || "Unable to detect bot"
        });
    }
};

async function evaluateExperiment(humanIds, botIds) {

    const results = [];


    // ==========================================
    // HUMAN SESSIONS
    // ==========================================

    for (const sessionId of humanIds) {

        const detection =
            await detectBot(sessionId);

        results.push({

            sessionId,

            actual: "Human",

            predicted:
                detection.prediction === "Bot"
                    ? "Bot"
                    : "Human",

            botScore:
                detection.botScore,

            features:
                detection.features,

            reasons:
                detection.reasons || []
        });
    }


    // ==========================================
    // BOT SESSIONS
    // ==========================================

    for (const sessionId of botIds) {

        const detection =
            await detectBot(sessionId);

        results.push({

            sessionId,

            actual: "Bot",

            predicted:
                detection.prediction === "Bot"
                    ? "Bot"
                    : "Human",

            botScore:
                detection.botScore,

            features:
                detection.features,

            reasons:
                detection.reasons || []
        });
    }


    // ==========================================
    // CONFUSION MATRIX
    // ==========================================

    let TP = 0;
    let TN = 0;
    let FP = 0;
    let FN = 0;


    results.forEach(result => {

        if (
            result.actual === "Bot" &&
            result.predicted === "Bot"
        ) {
            TP++;
        }

        if (
            result.actual === "Human" &&
            result.predicted === "Human"
        ) {
            TN++;
        }

        if (
            result.actual === "Human" &&
            result.predicted === "Bot"
        ) {
            FP++;
        }

        if (
            result.actual === "Bot" &&
            result.predicted === "Human"
        ) {
            FN++;
        }

    });


    // ==========================================
    // METRICS
    // ==========================================

    const total =
        TP + TN + FP + FN;


    const accuracy =
        total > 0
            ? (TP + TN) / total
            : 0;


    const precision =
        TP + FP > 0
            ? TP / (TP + FP)
            : 0;


    const recall =
        TP + FN > 0
            ? TP / (TP + FN)
            : 0;


    const f1Score =
        precision + recall > 0
            ? (
                2 *
                precision *
                recall
            ) /
            (
                precision +
                recall
            )
            : 0;


    return {

        experimentSessions:
            total,

        humanSessions:
            humanIds.length,

        botSessions:
            botIds.length,

        confusionMatrix: {

            truePositive: TP,

            trueNegative: TN,

            falsePositive: FP,

            falseNegative: FN
        },

        metrics: {

            accuracy:
                Number(
                    (accuracy * 100)
                        .toFixed(2)
                ),

            precision:
                Number(
                    (precision * 100)
                        .toFixed(2)
                ),

            recall:
                Number(
                    (recall * 100)
                        .toFixed(2)
                ),

            f1Score:
                Number(
                    (f1Score * 100)
                        .toFixed(2)
                )
        },

        results
    };
}

exports.evaluateBotDetector = async (req, res) => {
    try {

        // ==========================================
        // EXPERIMENT 1
        // Human vs Basic Bot
        // ==========================================

        const baselineExperiment =
            await evaluateExperiment(
                humanSessions,
                basicBotSessions
            );


        // ==========================================
        // EXPERIMENT 2
        // Human vs Human-like Bot
        // ==========================================

        const humanLikeExperiment =
            await evaluateExperiment(
                humanSessions,
                humanLikeBotSessions
            );


        // ==========================================
        // FINAL RESPONSE
        // ==========================================

        res.json({

            success: true,

            dataset: {

                humanSessions:
                    humanSessions.length,

                basicBotSessions:
                    basicBotSessions.length,

                humanLikeBotSessions:
                    humanLikeBotSessions.length
            },

            experiments: {

                baseline: {

                    description:
                        "Human vs Basic Automated Bot",

                    ...baselineExperiment
                },

                humanLike: {

                    description:
                        "Human vs Human-like Automated Bot",

                    ...humanLikeExperiment
                }
            }

        });

    } catch (error) {

        console.error(
            "Bot detector evaluation error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Bot detector evaluation failed"

        });
    }
};

module.exports.botDashboard = async (req, res) => {

    try {

        // ==========================================
        // RUN BOTH EXPERIMENTS
        // ==========================================

        const baselineExperiment =
            await evaluateExperiment(
                humanSessions,
                basicBotSessions
            );

        const humanLikeExperiment =
            await evaluateExperiment(
                humanSessions,
                humanLikeBotSessions
            );


        // ==========================================
        // COMBINE ALL 30 SESSIONS
        // ==========================================

        const dashboardSessions = [

            ...baselineExperiment.results.map(result => ({
                ...result,
                botType:
                    result.actual === "Human"
                        ? "Human"
                        : "Basic Bot"
            })),

            ...humanLikeExperiment.results
                .filter(result => result.actual === "Bot")
                .map(result => ({
                    ...result,
                    botType: "Human-like Bot"
                }))
        ];


        // ==========================================
        // FINAL METRICS
        // ==========================================

        const totalSessions =
            dashboardSessions.length;

        const humanCount =
            dashboardSessions.filter(
                session => session.actual === "Human"
            ).length;

        const basicBotCount =
            dashboardSessions.filter(
                session => session.botType === "Basic Bot"
            ).length;

        const humanLikeBotCount =
            dashboardSessions.filter(
                session => session.botType === "Human-like Bot"
            ).length;


        // ==========================================
        // SEND DATA TO EJS
        // ==========================================

        res.render("analytics/botDashboard", {

            totalSessions,

            humanCount,

            basicBotCount,

            humanLikeBotCount,

            baselineExperiment,

            humanLikeExperiment,

            sessions: dashboardSessions

        });

    } catch (error) {

        console.error(
            "Research Dashboard Error:",
            error
        );

        res.status(500).send(
            "Failed to load research dashboard"
        );
    }
};