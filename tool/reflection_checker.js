/**
 * This script provides functions to check for reflections of injected payloads
 * in a web page's content. It is a critical step in verifying whether a
 * Client-Side Template Injection (CSTI) vulnerability is present and exploitable.
 */

/**
 * Checks if a template injection payload is reflected in the page's HTML.
 * @param {import('playwright').Page} page The Playwright page object.
 * @param {string} engine The detected template engine.
 * @returns {Promise<boolean>} A promise that resolves to true if the payload is reflected, otherwise false.
 */
async function checkReflection(page, engine) {
    // Defines the expected reflection for each template engine's payload.
    const templates = {
        angular: "670592745",
        vue: "670592745",
        mavo: "670592745",
        handlebars: "\\[object Object\\]",
        regular: "670592745",
        template7: "670592745",
        ejs: "670592745",
        marko: "670592745",
        tmpl: "670592745",
        ember: "670592745",
        jsrender: "670592745",
        dot: "670592745",
        "art-template": "670592745",
        tempo: "\\[object Object\\]",
        transparency: "670592745",
        svelte: "670592745",
        underscore: "670592745",
        lit: "670592745",
        mustache: "\\[object Object\\]",
        twig: "670592745",
        markup: "\\[object Object\\]",
        dust: "\\[object Object\\]",
        nunjucks: "670592745",
        pug: "670592745",
        "art-template": "670592745",
        squirrelly: "670592745",
        swig: "670592745",
        juicer: "670592745",
        alpine: "670592745",
        hogan: "670592745",
        icanhaz: "670592745",
        pure: "670592745",
        loadTemplate: "\\[object Object\\]",
    };

    const isVulnerable = await Promise.race([
        page.evaluate((sus_string) => {
            return document.documentElement.outerHTML.match(sus_string) !== null;
        }, templates[engine]),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
        )
    ]).catch(error => {
        console.error(error.message);
        return false;
    });

    if (isVulnerable) {
        console.log(`Vulnerability detected at: ${await page.url()}`);
    }
    return isVulnerable;
}

/**
 * Checks if a random string is reflected inside a class attribute anywhere on the page.
 * @param {import('playwright').Page} page The Playwright page object.
 * @param {string} engine The detected template engine (unused in this function but kept for consistency).
 * @returns {Promise<boolean>} A promise that resolves to true if the string is found in a class attribute.
 */
async function checkClassReflection(page, engine) {
    const RANDOM_STRING = "uoihpojskx";
    const isVulnerable = await Promise.race([
        page.evaluate((RANDOM_STRING) => {
            const allElements = document.querySelectorAll('*');
            for (const element of allElements) {
                if (element.classList && element.classList.value.includes(RANDOM_STRING)) {
                    return true;
                }
            }
            return false;
        }, RANDOM_STRING),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
        )
    ]).catch(error => {
        console.error(error.message);
        return false;
    });

    if (isVulnerable) {
        console.log(`Class-based reflection detected at: ${await page.url()}`);
    }
    return isVulnerable;
}

module.exports = {
    checkReflection,
    checkClassReflection
};