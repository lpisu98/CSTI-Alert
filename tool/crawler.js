/**
 * This script provides web crawling functionality to discover links on a website,
 * which are then used for security scanning. It uses Playwright to navigate pages
 * and extract all relevant anchor tags.
 */
const playwright = require('playwright');
const url = require('url');

const browser_options = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        // Optimize JS engine for security and performance by disabling wasm and JIT compilation.
        '--js-flags=--noexpose_wasm,--jitless'
    ]
};

/**
 * Normalizes and validates a URL.
 * @param {string} link The URL to normalize.
 * @param {string} baseUrl The base URL to resolve relative links.
 * @returns {string|null} The normalized URL or null if invalid.
 */
function normalizeUrl(link, baseUrl) {
    try {
        return new URL(link, baseUrl).href;
    } catch (e) {
        return null;
    }
}

/**
 * Extracts all links from the current page that belong to the same domain.
 * @param {import('playwright').Page} page The Playwright page object.
 * @param {string} domain The target domain to filter links.
 * @returns {Promise<string[]>} A promise that resolves to an array of links.
 */
async function extractLinksWithoutSubdomains(page, domain) {
    await page.waitForSelector('a');
    return await page.evaluate((domain) => {
        return Array.from(document.querySelectorAll('a'))
            .map(anchor => anchor.href.split("?")[0].split("#")[0]) // Remove query strings and fragments
            .filter(href => {
                try {
                    const linkDomain = new URL(href).hostname;
                    return linkDomain === domain || linkDomain === 'www.' + domain;
                } catch (e) {
                    return false;
                }
            });
    }, domain);
}

/**
 * Extracts all links from the current page, including links to subdomains of the target domain.
 * @param {import('playwright').Page} page The Playwright page object.
 * @param {string} domain The target parent domain to filter links.
 * @returns {Promise<string[]>} A promise that resolves to an array of links, including subdomains.
 */
async function extractLinksWithSubdomains(page, domain) {
    await page.waitForSelector('a');
    return await page.evaluate((domain) => {
        return Array.from(document.querySelectorAll('a'))
            .map(anchor => anchor.href.split("?")[0].split("#")[0])
            .filter(href => {
                try {
                    const linkDomain = new URL(href).hostname;
                    return linkDomain === domain || linkDomain === 'www.' + domain || linkDomain.endsWith(`.${domain}`);
                } catch (e) {
                    return false;
                }
            });
    }, domain);
}

/**
 * Crawls a website starting from a seed URL to a specified depth.
 * @param {string} seedUrl The URL to start crawling from.
 * @param {number} maxDepth The maximum depth to crawl.
 * @param {boolean} crawlSubdomains Whether to include subdomains in the crawl.
 * @returns {Promise<string[]>} A promise that resolves to a unique array of discovered links.
 */
async function crawl(seedUrl, maxDepth, crawlSubdomains) {
    const browser = await playwright.chromium.launch(browser_options);
    const page = await browser.newPage();

    const visited = new Set();
    const results = [];
    const domain = new URL(seedUrl).hostname;

    async function crawlPage(currentUrl, depth) {
        if (depth === 0) return;
        if (visited.has(currentUrl)) return;

        console.log(`Crawling: ${currentUrl} (Depth: ${depth})`);
        visited.add(currentUrl);

        try {
            await page.goto(currentUrl, { waitUntil: 'networkidle0', timeout: 10000 });
            let links;
            if (crawlSubdomains) {
                links = await extractLinksWithSubdomains(page, domain);
            } else {
                links = await extractLinksWithoutSubdomains(page, domain);
            }
            console.log(`Found ${links.length} links on ${currentUrl} - ${page.url()}`);
            console.log(links);
            const uniqueLinks = [...new Set(links)];
            console.log(`Total links after deduplication ${uniqueLinks.length} - ${currentUrl}`);

            results.push({
                url: currentUrl,
                links: uniqueLinks
            });

            for (let link of uniqueLinks) {
                const normalizedLink = normalizeUrl(link, currentUrl);
                if (normalizedLink && !visited.has(normalizedLink)) {
                    await crawlPage(normalizedLink, depth - 1);
                }
            }
        } catch (error) {
            console.error(`Error while crawling ${currentUrl}:`, error);
        }
    }

    await crawlPage(seedUrl, maxDepth);

    const allLinks = results.flatMap(result => result.links);
    await browser.close();
    return [...new Set(allLinks)];
}

module.exports = crawl;