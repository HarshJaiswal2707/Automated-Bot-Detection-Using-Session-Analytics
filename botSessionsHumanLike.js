const { chromium } = require("playwright");
const BASE_URL = "http://localhost:1000";
const BOT_SESSIONS = 10;

// Random delay between min and max milliseconds
function randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Random integer
function randomInt(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}

async function runBotSession(browser, sessionNumber) {
    console.log(
        `\n========== HUMAN-LIKE BOT SESSION ${sessionNumber} ==========`
    );
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        // 1. Open homepage
        await page.goto(BASE_URL, {
            waitUntil: "domcontentloaded"
        });
        await randomDelay(3000, 6000);
        // 2. Open listings
        await page.goto(`${BASE_URL}/listings`, {
            waitUntil: "domcontentloaded"
        });
        await randomDelay(4000, 7000);
        const listingLinks =
            await page
                .locator('a[href^="/listings/"]')
                .evaluateAll(links =>
                    links
                        .map(link =>
                            link.getAttribute("href")
                        )
                        .filter(href =>
                            href &&
                            /^\/listings\/[a-f0-9]{24}$/.test(href)
                        )
                );
        const uniqueLinks = [
            ...new Set(listingLinks)
        ];
        console.log(
            "Listings found:",
            uniqueLinks.length
        );
        // 4. Randomly select listings
        const shuffledLinks =
            [...uniqueLinks].sort(
                () => Math.random() - 0.5
            );
        const numberOfListings =
            Math.min(
                randomInt(2, 4),
                shuffledLinks.length
            );
        const linksToVisit =
            shuffledLinks.slice(
                0,
                numberOfListings
            );
        // 5. Visit listings with realistic pauses
        for (const listingUrl of linksToVisit) {
            await page.goto(
                BASE_URL + listingUrl,
                {
                    waitUntil: "domcontentloaded"
                }
            );
            // Human-like reading time
            await randomDelay(5000, 10000);
            // Sometimes interact with map
            if (Math.random() < 0.5) {
                const map =
                    page.locator("#map");
                if (await map.count() > 0) {
                    await map.click({
                        position: {
                            x: randomInt(50, 250),
                            y: randomInt(50, 200)
                        }
                    });
                    await randomDelay(2000, 4000);
                }
            }
        }
        // 6. Search #1
        await page.goto(`${BASE_URL}/listings`, {
            waitUntil: "domcontentloaded"
        });
        await randomDelay(3000, 6000);
        const searchInput =
            page.locator("#searchInput");
        if (await searchInput.count() > 0) {
            const searches = [
                "Delhi",
                "Goa",
                "Mumbai",
                "Manali"
            ];
            const searchTerm =
                searches[
                randomInt(0, searches.length - 1)
                ];
            await searchInput.fill(searchTerm);
            await randomDelay(800, 1800);
            await page
                .locator("#searchForm")
                .evaluate(form => form.submit());
            await page.waitForLoadState(
                "domcontentloaded"
            );
            await randomDelay(4000, 8000);
        }
        // 7. Return to listings
        await page.goto(`${BASE_URL}/listings`, {
            waitUntil: "domcontentloaded"
        });
        await randomDelay(4000, 7000);
        // 8. Search #2
        const searchInput2 =
            page.locator("#searchInput");
        if (await searchInput2.count() > 0) {
            const searches = [
                "Paris",
                "London",
                "India",
                "Jaipur"
            ];
            const searchTerm =
                searches[
                randomInt(0, searches.length - 1)
                ];

            await searchInput2.fill(searchTerm);

            await randomDelay(1000, 2500);

            await page
                .locator("#searchForm")
                .evaluate(form => form.submit());

            await page.waitForLoadState(
                "domcontentloaded"
            );

            await randomDelay(4000, 8000);
        }

        // 9. Visit listings again
        await page.goto(`${BASE_URL}/listings`, {
            waitUntil: "domcontentloaded"
        });
        await randomDelay(3000, 6000);

        // 10. Optional category interaction
        const categoryLinks =
            await page
                .locator('a[href*="category="]')
                .evaluateAll(links =>
                    links
                        .map(link =>
                            link.getAttribute("href")
                        )
                        .filter(Boolean)
                );
        if (
            categoryLinks.length > 0 &&
            Math.random() < 0.7
        ) {
            const randomCategory =
                categoryLinks[
                randomInt(
                    0,
                    categoryLinks.length - 1
                )
                ];
            await page.goto(
                BASE_URL + randomCategory,
                {
                    waitUntil: "domcontentloaded"
                }
            );
            await randomDelay(4000, 7000);
        }

        // 11. Get session ID
        const sessionId =
            await page.evaluate(() => {
                return sessionStorage.getItem(
                    "wanderlust_behavior_session"
                );
            });
        console.log(
            "HUMAN-LIKE BOT SESSION ID:",
            sessionId
        );

        // 12. Final pause
        await randomDelay(3000, 6000);
        console.log(
            `HUMAN-LIKE BOT SESSION ${sessionNumber} COMPLETE`
        );
    } catch (error) {
        console.error(
            `Human-like bot session ${sessionNumber} failed:`,
            error.message
        );
    } finally {
        await context.close();
    }
}
async function main() {
    console.log(
        "\n============================================"
    );
    console.log(
        "Starting HUMAN-LIKE automated bot sessions"
    );
    console.log(
        "Existing sessions will NOT be deleted."
    );
    console.log(
        "============================================\n"
    );
    const browser =
        await chromium.launch({
            headless: false
        });
    for (let i = 1;i <= BOT_SESSIONS;i++) {
        await runBotSession(browser,i);
        // Pause between sessions
        await randomDelay(3000,7000
        );
    }
    await browser.close();
    console.log(
        "\n============================================"
    );
    console.log(
        "ALL HUMAN-LIKE BOT SESSIONS COMPLETED"
    );
    console.log(
        "============================================"
    );
}
main();