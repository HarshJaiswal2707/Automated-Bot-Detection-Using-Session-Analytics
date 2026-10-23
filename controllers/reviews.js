const Listing = require("../model/listing");
const Review = require("../model/review");
const BehaviorEvent = require("../model/behaviorEvent");

module.exports.createReview = async (req, res) => {

    let listing = await Listing.findById(req.params.id);

    let newReview = new Review(req.body.review);

    newReview.author = req.user._id;

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();


    // ==============================
    // REVIEW SUBMIT ANALYTICS
    // ==============================

    try {

        const sessionId = req.body.behaviorSessionId;

        console.log("Analytics Session ID:", sessionId);

        if (sessionId) {

            const behaviorEvent = new BehaviorEvent({
                sessionId: sessionId,
                userId: req.user._id,
                eventType: "review_submit",
                page: `/listings/${listing._id}`,
                listingId: listing._id,

                metadata: {
                    rating: newReview.rating,
                    reviewId: newReview._id
                }
            });

            await behaviorEvent.save();

            console.log(
                "Review submit event saved successfully!"
            );

        } else {

            console.log(
                "No behaviorSessionId received!"
            );

        }

    } catch (analyticsError) {

        console.error(
            "Review analytics error:",
            analyticsError
        );

    }


    req.flash("success", "New Review Created!");

    res.redirect(`/listings/${listing._id}`);
};


module.exports.destroyReview = async (req, res) => {

    let { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(
        id,
        { $pull: { reviews: reviewId } }
    );

    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review Deleted!");

    res.redirect(`/listings/${id}`);
};