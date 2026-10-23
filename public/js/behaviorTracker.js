(function () {
    const SESSION_KEY = "wanderlust_behavior_session";
    const ACTIVITY_KEY = "wanderlust_last_activity";
    const STARTED_KEY = "wanderlust_session_started";
    const ENDED_KEY = "wanderlust_session_ended";
    const SESSION_TIMEOUT = 60 * 60 * 1000;

    // Generate a new session ID
    function createSessionId() {
        const sessionId =
            "session_" +
            Date.now() +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 10);
        sessionStorage.setItem(
            SESSION_KEY,
            sessionId
        );
        return sessionId;
    }

    // Get current session ID
    function getSessionId() {
        let sessionId =
            sessionStorage.getItem(SESSION_KEY);
        if (!sessionId) {
            sessionId = createSessionId();
        }
        return sessionId;
    }
    // Send event to backend
    async function sendEvent(
        eventType,
        sessionId,
        data = {}
    ) {
        try {
            const eventData = {
                sessionId: sessionId,
                eventType: eventType,
                page:
                    window.location.pathname,
                listingId:
                    data.listingId || null,
                metadata:
                    data.metadata || {}
            };
            const response =
                await fetch(
                    "/analytics/events",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify(
                                eventData
                            ),
                        keepalive: true
                    }
                );
            if (!response.ok) {
                console.error(
                    "Analytics request failed:",
                    response.status
                );
            }
            return response;
        } catch (error) {
            console.error("Behavior tracking error:",error);
        }
    }

    // Update last activity time
    function updateActivity() {
        sessionStorage.setItem(
            ACTIVITY_KEY,
            Date.now().toString()
        );
    }
    // Check whether current session expired
    async function checkSessionExpired() {
        const lastActivity =
            sessionStorage.getItem(
                ACTIVITY_KEY
            );
        if (!lastActivity) {
            return false;
        }
        const inactiveTime =
            Date.now() -
            Number(lastActivity);
        if ( inactiveTime >= SESSION_TIMEOUT) {
            const alreadyEnded =
                sessionStorage.getItem(
                    ENDED_KEY
                );
            if (!alreadyEnded) {
                const oldSessionId =
                    getSessionId();
                // End OLD session
                await sendEvent(
                    "session_end",
                    oldSessionId,
                    {
                        metadata: {
                            reason:
                                "inactivity",
                            inactiveFor:
                                Math.floor(
                                    inactiveTime / 1000
                                )
                        }
                    }
                );
                // Mark old session as ended
                sessionStorage.setItem(
                    ENDED_KEY,
                    "true"
                );
                console.log(
                    "Session ended:",
                    oldSessionId
                );
            }
            return true;
        }
        return false;
    }
    // Main tracking function
    async function trackEvent(
        eventType,
        data = {}
    ) {
        // Check whether previous session expired
        const expired = await checkSessionExpired();
        let sessionId;
        if (expired) {
            sessionId = createSessionId();
            sessionStorage.removeItem(
                ENDED_KEY
            );
            updateActivity();
            // Start NEW session
            await sendEvent(
                "session_start",
                sessionId
            );
            console.log(
                "New session started:",
                sessionId
            );
        } else {
            sessionId = getSessionId();

        }
        // Update activity
        updateActivity();
        // Don't create duplicate session_start
        if ( eventType ==="session_start") {
            return;
        }
        // Send requested event
        return await sendEvent(eventType, sessionId, data);
    }
    // Expose functions
    window.WanderlustAnalytics = {
        trackEvent,
        getSessionId,
        updateActivity
    };
    if (!sessionStorage.getItem(STARTED_KEY)) {
        const sessionId =getSessionId();
        sessionStorage.setItem(
            STARTED_KEY,
            "true"
        );
        sessionStorage.removeItem(
            ENDED_KEY
        );
        updateActivity();
        sendEvent(
            "session_start",
            sessionId
        );
        console.log(
            "First session started:",
            sessionId
        );
    }
    trackEvent(
        "page_view"
    );
    document.addEventListener(
        "click",
        updateActivity
    );
    document.addEventListener(
        "keydown",
        updateActivity
    );
    document.addEventListener(
        "scroll",
        updateActivity
    );

    setInterval(
        checkSessionExpired,
        10 * 1000
    );
    // Initial check
    checkSessionExpired();
})();