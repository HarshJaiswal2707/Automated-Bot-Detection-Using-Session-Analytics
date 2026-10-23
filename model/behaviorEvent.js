const mongoose = require("mongoose");

const behaviorEventSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      enum: [
        "session_start",
        "page_view",
        "search",
        "listing_view",
        "category_view",
        "review_interaction",
        "map_interaction",
        "listing_action",
        "review_submit",
        "session_end",
      ],
    },

    page: {
      type: String,
      default: null,
    },

    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model("BehaviorEvent", behaviorEventSchema);