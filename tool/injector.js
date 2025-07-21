/**
 * This script provides functions for injecting template-specific payloads into web page elements.
 * These injectors are used to test for Client-Side Template Injection (CSTI) vulnerabilities
 * by inserting malicious strings into input fields, URL parameters, and other injectable locations.
 */
const templates = {
    angular: "{{12345*54321}}", 
    vue: "{{12345*54321}}", 
    mavo: "[12345*54321]", 
    handlebars: "{{this}}", 
    regular: "{12345*54321}", 
    template7: "{{js \"12345*54321\"}}", 
    ejs: "<%=12345*54321%>", 
    marko: "${12345*54321}", 
    tmpl: "${12345*54321}", 
    ember: "{{12345*54321}}", 
    jsrender: "{{:12345*54321}}", 
    dot: "{{=12345*54321}}", 
    "art-template": "{{12345*54321}}", 
    tempo: "{{this}}", 
    transparency: "Transparency", 
    svelte: "{12345*54321}", 
    underscore: "<%=12345*54321%>", 
    lit: "${12345*54321}", 
    mustache: "{{.}}", 
    twig: "{{12345*54321}}", 
    markup: "{{.}}", 
    dust: "{{.}}", 
    nunjucks: "{{12345*54321}}", 
    pug: "#{12345*54321}", 
    loadTemplate: "$('test').loadTemplate", 
    pure: "#{12345*54321}", 
    squirrelly: "Sqrl", 
    swig: "{{12345*54321}}", 
    juicer: "${12345*54321}}", 
    alpine: "12345*54321", 
    hogan: "6705{{!comment}}92745", 
    icanhaz: "6705{{!comment}}92745", 
};

/**
 * Injects a template payload into the URL parameters of an anchor tag and clicks it.
 * @param {import('playwright').Page} page The Playwright page object.
 * @param {string} engine The detected template engine.
 * @param {number} index The index of the anchor tag to target.
 */
async function injectGetParametersAndClick(page, engine, index) {
    await Promise.race([
        page.evaluate(({ engine, index, templates }) => {
            try {
                const urlObj = new URL(document.querySelectorAll("a")[index].href);
                const params = urlObj.searchParams;
                for (const key of params.keys()) {
                    params.set(key, templates[engine]);
                }
                document.querySelectorAll('a')[index].href = urlObj.toString();
                document.querySelectorAll('a')[index].click();
            } catch (error) {
                console.log(error);
            }
        }, { engine, index, templates }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
        )
    ]).catch(error => {
        console.error(error.message);
    });
}

/**
 * Injects a template payload into all input fields on the page.
 * @param {import('playwright').Page} page The Playwright page object.
 * @param {string} engine The detected template engine.
 */
async function injectPayload(page, engine) {
    console.log("Injecting payload: " + templates[engine]);
    await Promise.race([
        page.evaluate((payload) => {
            let items = document.querySelectorAll('input');
            for (let i = 0; i < items.length; i++) {
                // Skip file inputs to avoid DOM exceptions.
                if (items[i].type === 'file') {
                    continue;
                }
                if (items[i].type === 'email') {
                    items[i].value = payload + '@test.com';
                } else if (items[i].type !== 'submit') {
                    items[i].value = payload;
                }
            }
        }, templates[engine]),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
        )
    ]).catch(error => {
        console.error(error.message);
    });
}

/**
 * Types a template payload into a specific input element.
 * @param {string} engine The detected template engine.
 * @param {import('playwright').ElementHandle} input The Playwright element handle for the input.
 */
async function injectUsingType(engine, input) {
    await input.type(templates[engine]);
}

/**
 * Injects a non-template, random string payload for class-based reflection checks.
 * @param {number} technique The injection technique to use (currently only one is implemented).
 * @param {import('playwright').Page} page The Playwright page object.
 */
async function injectClassPayload(technique, page) {
    const RANDOM_STRING = 'uoihpojskx';
    if (technique === 0) {
        console.log("Injecting class payload: ");
        await Promise.race([
            page.evaluate((RANDOM_STRING) => {
                let items = document.querySelectorAll('input');
                for (let i = 0; i < items.length; i++) {
                    // Skip file inputs to avoid DOM exceptions.
                    if (items[i].type === 'file') {
                        continue;
                    }
                    if (items[i].type === 'email') {
                        items[i].value = RANDOM_STRING + '@test.com';
                    } else if (items[i].type !== 'submit') {
                        items[i].value = RANDOM_STRING;
                    }
                }
            }, RANDOM_STRING),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
    }
}

module.exports = {
    injectPayload,
    injectGetParametersAndClick,
    injectClassPayload,
    injectUsingType
};