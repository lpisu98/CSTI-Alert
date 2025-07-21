/**
 * This script is responsible for detecting the specific client-side template engine
 * used by a web page. It checks for the presence of global objects or functions
 * that are characteristic of popular template engines.
 */

// A mapping of template engine names to the global JavaScript objects they expose.
const templates = {
    angular: "angular.version",
    vue: "Vue",
    mavo: "Mavo",
    handlebars: "Handlebars",
    regular: "Regular",
    template7: "Template7",
    ejs: "ejs",
    marko: "Marko",
    tmpl: "$.tmpl",
    ember: "Ember",
    jsrender: "jsrender",
    dot: "doT",
    "art-template": "template",
    tempo: "Tempo",
    transparency: "Transparency",
    svelte: "__svelte",
    underscore: "_.template",
    lit: "litHtmlVersions",
    mustache: "Mustache",
    hogan: "Hogan",
    twig: "Twig",
    markup: "Markup",
    dust: "dust",
    nunjucks: "nunjucks",
    pug: "pug",
    loadTemplate: "loadTemplate",
    pure: "$p",
    squirrelly: "Sqrl",
    swig: "swig",
    icanhaz: "ich",
    "micro-template": "template",
    juicer: "Juicer",
    alpine: "Alpine"
};

/**
 * Iterates through a list of known template engines and checks for their
 * presence on the page.
 * @param {import('playwright').Page} page The Playwright page object.
 * @returns {Promise<string>} A promise that resolves to the name of the detected
 * template engine or "unknown" if no engine is found.
 */
async function getTemplateEngine(page) {
    for (let template in templates) {
        let template_detected = await Promise.race([
            page.evaluate((pred_template) => {
                return (typeof window.eval(pred_template) !== 'undefined');
            }, templates[template]),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            if (!(error instanceof ReferenceError)) {
                console.error("ERROR DETECTING ENGINE", error.message);
            }
            return false;
        });
        if (template_detected) {
            return template;
        }
    }
    return "unknown";
}

/**
 * Checks if a specific template engine is present on the page.
 * @param {import('playwright').Page} page The Playwright page object.
 * @param {string} pred_template The name of the template engine to check for.
 * @returns {Promise<boolean>} A promise that resolves to true if the engine is
 * detected, otherwise false.
 */
async function checkTemplateEngine(page, pred_template) {
    try {
        return await page.evaluate((template) => {
            return (typeof window.eval(template) !== 'undefined');
        }, templates[pred_template]);
    } catch (error) {
        return false;
    }
}

module.exports = {
    checkTemplateEngine,
    getTemplateEngine
};