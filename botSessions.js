const { chromium } = require("playwright");
const BASE_URL = "http://localhost:1000";
const BOT_SESSIONS = 10;

// Small delay between automated actions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function runBotSession(browser, sessionNumber) {
    console.log(
        `\n========== BOT SESSION ${sessionNumber} ==========`
    );
    // New browser context = fresh sessionStorage
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        // Open Wanderlust
        await page.goto(BASE_URL, {
            waitUntil: "domcontentloaded"
        });
        await delay(100);
        // Open listings
        await page.goto(
            `${BASE_URL}/listings`,
            {
                waitUntil: "domcontentloaded"
            }
        );
        await delay(100);
        // Find listing links
        const listingLinks =
            await page
                .locator('a[href^="/listings/"]')
                .evaluateAll(links =>
                    links
                        .map(link => link.getAttribute("href"))
                        .filter(href =>
                            href &&
                            /^\/listings\/[a-f0-9]{24}$/.test(href)
                        )
                );
        const uniqueLinks = [...new Set(listingLinks)];
        console.log("Listings found:",uniqueLinks.length);
        // Open first 5 listings very quickly
        const linksToVisit =uniqueLinks.slice(0, 5);
        for (const listingUrl of linksToVisit) {
            await page.goto(BASE_URL + listingUrl,{waitUntil:"domcontentloaded"});
            await delay(100);
        }
        // Search 1
        const searchInput =page.locator("#searchInput");
        if (await searchInput.count() > 0) {
            await searchInput.fill("Delhi");
            await page.locator("#searchForm").evaluate(form => form.submit());
            await page.waitForLoadState("domcontentloaded");
            await delay(100);
        }
        // Search 2
        await page.goto(`${BASE_URL}/listings`,{ waitUntil: "domcontentloaded" });
        const searchInput2 = page.locator("#searchInput");
        if (await searchInput2.count() > 0 ) { 
            await searchInput2.fill("Goa"); 
            await page.locator( "#searchForm" ).evaluate(form => form.submit()); 
            await page.waitForLoadState( "domcontentloaded");
            await delay(100);
        }
        // Return to listings
        await page.goto( `${BASE_URL}/listings`,{waitUntil:"domcontentloaded"});
        await delay(100);
        // Get current session ID
        const sessionId =
            await page.evaluate(() => {

                return sessionStorage.getItem(
                    "wanderlust_behavior_session"
                );

            });
        console.log(
            "BOT SESSION ID:",
            sessionId
        );
        // Give analytics requests time to reach server
        await delay(2000);
        console.log(
            `BOT SESSION ${sessionNumber} COMPLETE`
        );

    } catch (error) {
        console.error(
            `Bot session ${sessionNumber} failed:`,
            error.message
        );
    } finally {
        await context.close();
    }
}

async function main() {
    console.log(
        "Starting automated bot sessions..."
    );

    const browser =await chromium.launch({headless: false});

    for (let i = 1;i <= BOT_SESSIONS;i++) {
        await runBotSession(browser,i);
        // Small gap between sessions
        await delay(1000);
    }
    await browser.close();
    console.log(
        "\n================================"
    );
    console.log(
        "ALL BOT SESSIONS COMPLETED"
    );
    console.log(
        "================================"
    );
}
main();