const BehaviorEvent = require("../model/behaviorEvent");

async function detectBot(sessionId) {

    const events = await BehaviorEvent
        .find({ sessionId })
        .sort({ timestamp: 1 });

    // -----------------------------------------
    // 1. INSUFFICIENT DATA
    // -----------------------------------------

    if (events.length < 5) {
        return {
            sessionId,
            prediction: "Insufficient Data",
            botScore: 0,
            reasons: [],
            features: {}
        };
    }

    // -----------------------------------------
    // 2. TIMESTAMP ANALYSIS
    // -----------------------------------------

    const timestamps = events.map(event =>
        new Date(event.timestamp).getTime()
    );

    const durationMs =
        timestamps[timestamps.length - 1] - timestamps[0];

    const durationSeconds =
        Math.max(durationMs / 1000, 0.01);

    const durationMinutes =
        Math.max(durationMs / 60000, 0.01);

    const eventsPerMinute =
        events.length / durationMinutes;

    // -----------------------------------------
    // 3. INTER-EVENT INTERVALS
    // -----------------------------------------

    const intervals = [];

    for (let i = 1; i < timestamps.length; i++) {

        const difference =
            timestamps[i] - timestamps[i - 1];

        if (difference >= 0) {
            intervals.push(difference);
        }
    }

    const averageInterval =
        intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) /
              intervals.length
            : 0;

    const sortedIntervals =
        [...intervals].sort((a, b) => a - b);

    const medianInterval =
        sortedIntervals.length > 0
            ? sortedIntervals[
                Math.floor(sortedIntervals.length / 2)
              ]
            : 0;

    // -----------------------------------------
    // 4. TIMING VARIABILITY
    // -----------------------------------------

    let coefficientVariation = 0;

    if (
        intervals.length >= 3 &&
        averageInterval > 0
    ) {

        const variance =
            intervals.reduce(
                (sum, value) =>
                    sum +
                    Math.pow(
                        value - averageInterval,
                        2
                    ),
                0
            ) / intervals.length;

        const standardDeviation =
            Math.sqrt(variance);

        coefficientVariation =
            standardDeviation / averageInterval;
    }

    // -----------------------------------------
    // 5. SHORT INTERVAL RATIO
    // -----------------------------------------

    const shortIntervalCount =
        intervals.filter(
            interval => interval < 100
        ).length;

    const shortIntervalRatio =
        intervals.length > 0
            ? shortIntervalCount / intervals.length
            : 0;

    // -----------------------------------------
    // 6. EVENT TYPE DISTRIBUTION
    // -----------------------------------------

    const eventTypeCounts = {};

    events.forEach(event => {

        eventTypeCounts[event.eventType] =
            (eventTypeCounts[event.eventType] || 0) + 1;

    });

    const uniqueEventTypes =
        Object.keys(eventTypeCounts).length;

    const eventTypeDiversity =
        uniqueEventTypes / events.length;

    const maxRepeatedEvents =
        Math.max(
            ...Object.values(eventTypeCounts)
        );

    const repetitionRatio =
        maxRepeatedEvents / events.length;

    // -----------------------------------------
    // 7. EVENT SEQUENCE ANALYSIS
    // -----------------------------------------

    const eventSequence =
        events.map(event => event.eventType);

    let repeatedTransitions = 0;

    for (
        let i = 1;
        i < eventSequence.length;
        i++
    ) {

        if (
            eventSequence[i] ===
            eventSequence[i - 1]
        ) {
            repeatedTransitions++;
        }
    }

    const transitionRepetitionRatio =
        eventSequence.length > 1
            ? repeatedTransitions /
              (eventSequence.length - 1)
            : 0;

    // -----------------------------------------
    // 8. MEANINGFUL USER EVENTS
    // -----------------------------------------

    const meaningfulEventTypes = [

        "search",
        "listing_view",
        "category_view",
        "map_interaction",
        "review_interaction",
        "review_submit",
        "listing_action"

    ];

    const meaningfulEvents =
        events.filter(event =>
            meaningfulEventTypes.includes(
                event.eventType
            )
        );

    const meaningfulEventRatio =
        events.length > 0
            ? meaningfulEvents.length /
              events.length
            : 0;

    // =========================================
    // 9. WEIGHTED BOT SCORE
    // =========================================

    let botScore = 0;

    const reasons = [];

    // -----------------------------------------
    // A. TIMING REGULARITY
    // Weight: 3
    // -----------------------------------------

    if (coefficientVariation < 0.80) {

        botScore += 3;

        reasons.push(
            "Highly regular interaction timing"
        );

    } else if (coefficientVariation < 1.20) {

        botScore += 2;

        reasons.push(
            "Regular interaction timing"
        );

    } else if (coefficientVariation < 1.60) {

        botScore += 1;

        reasons.push(
            "Moderately regular interaction timing"
        );
    }

    // -----------------------------------------
    // B. EVENT REPETITION
    // Weight: 3
    // -----------------------------------------

    if (repetitionRatio >= 0.65) {

        botScore += 3;

        reasons.push(
            "Highly repetitive event distribution"
        );

    } else if (repetitionRatio >= 0.55) {

        botScore += 2;

        reasons.push(
            "Repetitive event distribution"
        );

    } else if (repetitionRatio >= 0.45) {

        botScore += 1;

        reasons.push(
            "Moderately repetitive event distribution"
        );
    }

    // -----------------------------------------
    // C. EVENT TYPE DIVERSITY
    // Weight: 3
    // -----------------------------------------

    if (
        events.length >= 8 &&
        eventTypeDiversity < 0.25
    ) {

        botScore += 3;

        reasons.push(
            "Very low behavioral diversity"
        );

    } else if (
        events.length >= 8 &&
        eventTypeDiversity < 0.32
    ) {

        botScore += 2;

        reasons.push(
            "Low behavioral diversity"
        );

    } else if (
        events.length >= 8 &&
        eventTypeDiversity < 0.38
    ) {

        botScore += 1;

        reasons.push(
            "Limited behavioral diversity"
        );
    }

    // -----------------------------------------
    // D. MEANINGFUL EVENT RATIO
    // Weight: 2
    // -----------------------------------------

    if (meaningfulEventRatio < 0.25) {

        botScore += 2;

        reasons.push(
            "Low proportion of meaningful user actions"
        );

    } else if (meaningfulEventRatio < 0.40) {

        botScore += 1;

        reasons.push(
            "Relatively low meaningful user activity"
        );
    }

    // -----------------------------------------
    // E. TRANSITION REPETITION
    // Weight: 2
    // -----------------------------------------

    if (
        eventSequence.length >= 8 &&
        transitionRepetitionRatio >= 0.45
    ) {

        botScore += 2;

        reasons.push(
            "Highly repetitive event sequence"
        );

    } else if (
        eventSequence.length >= 8 &&
        transitionRepetitionRatio >= 0.30
    ) {

        botScore += 1;

        reasons.push(
            "Repeated event sequence"
        );
    }

    // -----------------------------------------
    // F. SESSION DURATION
    // Weight: 1
    // -----------------------------------------

    if (
        events.length >= 8 &&
        durationSeconds < 70
    ) {

        botScore += 1;

        reasons.push(
            "Short session duration"
        );
    }

    // -----------------------------------------
    // G. EVENT FREQUENCY
    // Weight: 1
    // -----------------------------------------

    if (eventsPerMinute >= 20) {

        botScore += 1;

        reasons.push(
            "High event frequency"
        );
    }

    // -----------------------------------------
    // H. EXTREMELY SHORT INTERVALS
    // Weight: 1
    // -----------------------------------------

    if (shortIntervalRatio >= 0.50) {

        botScore += 1;

        reasons.push(
            "Many extremely short interaction intervals"
        );
    }

    // =========================================
    // 10. FINAL CLASSIFICATION
    // =========================================

    /*
        Maximum possible score = 16

        0 - 6   => Human
        7+      => Bot
    */

    let prediction = "Human";

    if (botScore >= 7) {
        prediction = "Bot";
    }

    // =========================================
    // 11. RETURN RESULT
    // =========================================

    return {

        sessionId,

        prediction,

        botScore,

        maxPossibleScore: 16,

        reasons,

        features: {

            totalEvents:
                events.length,

            sessionDurationSeconds:
                Number(
                    durationSeconds.toFixed(2)
                ),

            eventsPerMinute:
                Number(
                    eventsPerMinute.toFixed(2)
                ),

            averageIntervalMs:
                Number(
                    averageInterval.toFixed(2)
                ),

            medianIntervalMs:
                Number(
                    medianInterval.toFixed(2)
                ),

            coefficientVariation:
                Number(
                    coefficientVariation.toFixed(2)
                ),

            shortIntervalRatio:
                Number(
                    shortIntervalRatio.toFixed(2)
                ),

            repetitionRatio:
                Number(
                    repetitionRatio.toFixed(2)
                ),

            uniqueEventTypes,

            eventTypeDiversity:
                Number(
                    eventTypeDiversity.toFixed(2)
                ),

            transitionRepetitionRatio:
                Number(
                    transitionRepetitionRatio.toFixed(2)
                ),

            meaningfulEventRatio:
                Number(
                    meaningfulEventRatio.toFixed(2)
                )
        },

        eventTypeCounts

    };
}

module.exports = {
    detectBot
};