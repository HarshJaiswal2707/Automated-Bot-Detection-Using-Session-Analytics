document.addEventListener("DOMContentLoaded", function () {

    // Create map
    const map = L.map("map").setView([lat, lng], 13);


    // Add map tiles
    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);


    // Add marker
    L.marker([lat, lng])
        .addTo(map)
        .bindPopup(title)
        .openPopup();


    // =====================================
    // MAP INTERACTION TRACKING
    // =====================================

    // Map click
    map.on("click", function () {

        window.WanderlustAnalytics.trackEvent(
            "map_interaction",
            {
                listingId: window.location.pathname.split("/").pop(),

                metadata: {
                    interaction: "click"
                }
            }
        );

        console.log("Map click tracked");

    });


    // Map zoom
    map.on("zoomend", function () {

        window.WanderlustAnalytics.trackEvent(
            "map_interaction",
            {
                listingId: window.location.pathname.split("/").pop(),

                metadata: {
                    interaction: "zoom",
                    zoomLevel: map.getZoom()
                }
            }
        );

        console.log("Map zoom tracked");

    });


    // Map drag / move
    map.on("moveend", function () {

        window.WanderlustAnalytics.trackEvent(
            "map_interaction",
            {
                listingId: window.location.pathname.split("/").pop(),

                metadata: {
                    interaction: "move"
                }
            }
        );

        console.log("Map move tracked");

    });

});