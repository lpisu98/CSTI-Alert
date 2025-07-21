// CSTI Detection Tool - Main Entry Point
// This script orchestrates browser automation to detect client-side template injection vulnerabilities.
// It uses Playwright for browser control and custom modules for injection and reflection checks.

const playwright = require('playwright');
const crawl = require('./crawler');
const { injectPayload, injectGetParametersAndClick, injectClassPayload, injectUsingType } = require('./injector');
const { checkTemplateEngine, getTemplateEngine } = require('./engine_checker');
const { checkReflection, checkClassReflection } = require('./reflection_checker');
const assert = require('assert');
const { ArgumentParser } = require('argparse');

const browser_options = {
    channel: 'chrome',
    args: [
        '--no-sandbox',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-gpu',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--js-flags=--noexpose_wasm,--jitless'
    ]
};

/**
 * Attempt to submit all forms on the page and check for template injection vulnerabilities.
 */
async function checkForms(browser, page, engine) {
    let forms;
    const url = page.url();
    let isVulnerable = false;
    let navigationTriggered = false;

    try {
        forms = await Promise.race([
            page.$$('form'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        var num_forms = forms.length;
        console.log("NUM FORMS", num_forms);
    } catch (e) {
        console.log("ERROR GETTING FORMS", e);
        return false;
    }
    for (let j = 0; j < num_forms; j++) {
        console.log("FILLING INPUTS", j + 1, '/', num_forms);
        injectPayload(page, engine);
        console.log("INPUTS FILLED");
        forms = await Promise.race([
            page.$$('form'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        if (forms == undefined) {
            continue;
        }
        console.log("GOT FORM FROM PAGE, SUBMITTING");
        await Promise.race([
            forms[j].evaluate(form => Object.getPrototypeOf(form).submit.call(form)),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        console.log(`FORM ${j} SUBMITTED`);
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
            console.log("NAVIGATION TRIGGERED");
            navigationTriggered = true;
        } catch (e) {
            console.log("NO NAVIGATION FOR THIS FORM");
            navigationTriggered = false;
        }
        // Check for template injection vulnerability after form submission
        console.log("CHECKING IF VULNERABLE");
        try {
            isVulnerable = await checkReflection(page, engine);
        } catch (e) {
            console.log("ERROR CHECKING REFLECTION", e);
            continue;
        }
        console.log("FORM", j + 1, '/', num_forms, "RESULT:", isVulnerable);
        if (isVulnerable) {
            if (!args.continue_when_positive) {
                console.log("VULNERABILITY FOUND - EXITING");
                return true;
            } else {
                console.log("VULNERABILITY FOUND - CONTINUING");
            }
        }
        if (navigationTriggered) {
            await page.goBack({ waitUntil: 'networkidle0', timeout: 10000 });
        }
        console.log("LOCATION", page.url());
    }
}

/**
 * Attempt to inject payloads into input fields and check for template injection vulnerabilities.
 */
async function checkInputFields(browser, page, engine) {
    let inputs;
    const url = page.url();
    let isVulnerable = false;
    let navigationTriggered = false;

    try {
        inputs = await Promise.race([
            page.$$('input'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        var num_inputs = inputs.length;
        console.log("NUM INPUTS", num_inputs);
    } catch (e) {
        console.log("ERROR GETTING INPUT TAGS", e);
        return false;
    }
    for (let j = 0; j < num_inputs; j++) {
        console.log("FILLING INPUTS", j + 1, '/', num_inputs);
        await injectUsingType(engine, inputs[j]);
        console.log("INPUTS FILLED");
        inputs = await Promise.race([
            page.$$('input'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        if (inputs == undefined) {
            continue;
        }
        console.log("GOT INPUT FROM PAGE, SUBMITTING");
        await Promise.race([
            inputs[j].press('Enter'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        console.log(`INPUT ${j} - ENTER PRESSED`);
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
            console.log("NAVIGATION TRIGGERED");
            navigationTriggered = true;
        } catch (e) {
            console.log("NO NAVIGATION FOR THIS FORM");
            navigationTriggered = false;
        }
        // Check for template injection vulnerability after input submission
        console.log("CHECKING IF VULNERABLE");
        try {
            isVulnerable = await checkReflection(page, engine);
        } catch (e) {
            console.log("ERROR CHECKING REFLECTION", e);
            continue;
        }
        console.log("INPUT", j + 1, '/', num_inputs, "RESULT:", isVulnerable);
        if (isVulnerable) {
            if (!args.continue_when_positive) {
                console.log("VULNERABILITY FOUND - EXITING");
                return true;
            } else {
                console.log("VULNERABILITY FOUND - CONTINUING");
            }
        }
        if (navigationTriggered) {
            await page.goBack({ waitUntil: 'networkidle0', timeout: 10000 });
        }
        console.log("LOCATION", page.url());
    }
}

/**
 * Attempt to click all buttons on the page after payload injection and check for vulnerabilities.
 */
async function checkButtons(browser, page, engine) {
    let buttons;
    const url = page.url();
    let isVulnerable = false;
    let navigationTriggered = false;

    console.log("NO VULNERABILITY FOUND IN FORMS - CHECKING AND CLICKING BUTTONS");
    buttons = await Promise.race([
        page.$$('button'),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
        )
    ]).catch(error => {
        console.error(error.message);
    });
    if (buttons == undefined) {
        return false;
    }
    var num_buttons = buttons.length;
    console.log("NUM BUTTONS", num_buttons);
    for (let j = 0; j < num_buttons; j++) {
        await injectPayload(page, engine);
        console.log("PAYLOAD INJECTED");
        buttons = await Promise.race([
            page.$$('button'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        console.log("BUTTONS RETRIEVED", buttons.length);
        if (buttons == undefined) {
            continue;
        }
        console.log("CLICKING BUTTON", j + 1, '/', num_buttons);
        try {
            await Promise.race([
                page.evaluate((j) => {
                    document.querySelectorAll('button')[j].click();
                }, j),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
                )
            ]).catch(error => {
                console.log("Error clicking button", error.message);
            });
        } catch (e) {
            console.log("ERROR CLICKING BUTTON", e);
            continue;
        }
        console.log(`BUTTON ${j} CLICKED`);
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
            console.log("NAVIGATION TRIGGERED");
            navigationTriggered = true;
        } catch (e) {
            console.log("NO NAVIGATION FOR THIS BUTTON");
            navigationTriggered = false;
        }
        // Check for template injection vulnerability after button click
        console.log("CHECKING IF VULNERABLE");
        isVulnerable = await checkReflection(page, engine);
        console.log("BUTTON", j + 1, '/', num_buttons, "RESULT:", isVulnerable);
        if (isVulnerable) {
            if (!args.continue_when_positive) {
                console.log("VULNERABILITY FOUND - EXITING");
                return true;
            } else {
                console.log("VULNERABILITY FOUND - CONTINUING");
            }
        }
        if (navigationTriggered) {
            try {
                await page.goBack({ waitUntil: 'networkidle0', timeout: 10000 });
            } catch (e) {
                console.log("ERROR GOING BACK", e);
            }
        } else {
            try {
                await page.reload({ waitUntil: 'networkidle0', timeout: 10000 });
            } catch (e) {
                console.log("ERROR RELOADING", e);
            }
        }
        console.log("LOCATION", page.url());
        if (page.url() != url) {
            try {
                await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
            } catch (e) {
                console.log("ERROR GOING TO URL", e);
            }
        }
    }
}

/**
 * Attempt to click all anchor tags on the page after payload injection and check for vulnerabilities.
 */
async function checkATags(browser, page, engine) {
    let a_tags;
    const url = page.url();
    let isVulnerable = false;
    let navigationTriggered = false;

    console.log("NO VULNERABILITY FOUND IN BUTTONS - CHECKING AND CLICKING A TAGS");
    a_tags = await Promise.race([
        page.$$('a'),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
        )
    ]).catch(error => {
        console.error(error.message);
    });
    if (a_tags == undefined) {
        return false;
    }
    var num_a = a_tags.length;
    console.log("NUM A TAGS", num_a);
    for (let j = 0; j < num_a; j++) {
        a_tags = await Promise.race([
            page.$$('a'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        const href_handles = await Promise.all(
            a_tags.map(handle => handle.getProperty('href'))
        );
        const href = await Promise.all(
            href_handles.map(handle => handle.jsonValue())
        );
        console.log("CHECKING LINK", j + 1, '/', num_a, href[j]);
        // Optionally, filter links by domain if needed
        injectPayload(page, engine);
        console.log("CLICKING LINK AND INJECTING GET PARAMETERS (IF PRESENT)", j);
        try {
            injectGetParametersAndClick(page, engine, j);
        } catch (e) {
            console.log("ERROR CLICKING LINK", e);
            continue;
        }
        console.log(`LINK ${j} CLICKED`);
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
            console.log("NAVIGATION TRIGGERED");
            navigationTriggered = true;
        } catch (e) {
            console.log("NO NAVIGATION FOR THIS BUTTON");
            navigationTriggered = false;
        }
        // Check for template injection vulnerability after link click
        console.log("CHECKING IF VULNERABLE");
        isVulnerable = await checkReflection(page, engine);
        console.log("LINK", j, "RESULT:", isVulnerable);
        if (isVulnerable) {
            if (!args.continue_when_positive) {
                console.log("VULNERABILITY FOUND - EXITING");
                return true;
            } else {
                console.log("VULNERABILITY FOUND - CONTINUING");
            }
        }
        if (navigationTriggered) {
            try {
                await page.goBack({ waitUntil: 'networkidle0', timeout: 10000 });
            } catch (e) {
                console.log("ERROR GOING BACK", e);
            }
        } else {
            try {
                await page.reload({ waitUntil: 'networkidle0', timeout: 10000 });
            } catch (e) {
                console.log("ERROR RELOADING", e);
            }
        }
        console.log("LOCATION", page.url());
        if (page.url() != url) {
            try {
                await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
            } catch (e) {
                console.log("ERROR GOING TO URL", e);
            }
        }
    }
}

/**
 * Attempt to submit forms using class-based payloads and check for class-based reflection vulnerabilities.
 */
async function checkClass(page, engine) {
    let forms;
    const url = page.url();
    let isVulnerable = false;
    let navigationTriggered = false;

    try {
        forms = await Promise.race([
            page.$$('form'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        var num_forms = forms.length;
        console.log("NUM FORMS", num_forms);
    } catch (e) {
        console.log("ERROR GETTING FORMS", e);
        return false;
    }

    for (let j = 0; j < num_forms; j++) {
        console.log("FILLING INPUTS WITH CLASS PAYLOAD", j + 1, '/', num_forms);
        injectClassPayload(0, page);
        console.log("INPUTS FILLED");
        forms = await Promise.race([
            page.$$('form'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        if (forms == undefined) {
            continue;
        }
        console.log("GOT FORM FROM PAGE, SUBMITTING");
        await Promise.race([
            forms[j].evaluate(form => Object.getPrototypeOf(form).submit.call(form)),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: Evaluation took too long")), 10000)
            )
        ]).catch(error => {
            console.error(error.message);
        });
        console.log(`FORM ${j} SUBMITTED`);
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
            console.log("NAVIGATION TRIGGERED");
            navigationTriggered = true;
        } catch (e) {
            console.log("NO NAVIGATION FOR THIS FORM");
            navigationTriggered = false;
        }
        // Check for class-based reflection vulnerability
        console.log("CHECKING IF VULNERABLE");
        try {
            isVulnerable = await checkClassReflection(page, engine);
        } catch (e) {
            console.log("ERROR CHECKING CLASS REFLECTION", e);
            continue;
        }
        console.log("FORM", j + 1, '/', num_forms, "RESULT:", isVulnerable);
        if (isVulnerable) {
            if (!args.continue_when_positive) {
                console.log("VULNERABILITY FOUND - EXITING");
                return true;
            } else {
                console.log("VULNERABILITY FOUND - CONTINUING");
            }
        }
        if (navigationTriggered) {
            await page.goBack({ waitUntil: 'networkidle0', timeout: 10000 });
        }
        console.log("LOCATION", page.url());
    }
}

/**
 * Run all vulnerability checks for a given page and engine.
 * Returns true if any vulnerability is found, otherwise false.
 */
async function checkLink(browser, page, engine) {
    let vuln_found = false;

    if (args.skip_forms) {
        console.log("SKIPPING FORM CHECK");
    } else {
        if (await checkForms(browser, page, engine)) {
            if (!args.continue_when_positive) {
                return true;
            } else {
                console.log("VULN/S FOUND IN FORMS");
                vuln_found = true;
            }
        }
    }

    if (args.skip_inputs) {
        console.log("SKIPPING INPUT ENTER CHECK");
    } else {
        if (await checkInputFields(browser, page, engine)) {
            if (!args.continue_when_positive) {
                return true;
            } else {
                console.log("VULN/S FOUND IN INPUTS");
                vuln_found = true;
            }
        }
    }

    if (args.skip_buttons) {
        console.log("SKIPPING BUTTON CHECK");
    } else {
        if (await checkButtons(browser, page, engine)) {
            if (!args.continue_when_positive) {
                return true;
            } else {
                console.log("VULN/S FOUND IN BUTTONS");
                vuln_found = true;
            }
        }
    }

    if (args.skip_links) {
        console.log("SKIPPING LINK CHECK");
    } else {
        if (await checkATags(browser, page, engine)) {
            if (!args.continue_when_positive) {
                return true;
            } else {
                console.log("VULN/S FOUND IN LINKS");
                vuln_found = true;
            }
        }
    }

    if (args.check_class) {
        console.log("CHECKING CLASS BASED REFLECTION");
        if (await checkClass(page, engine)) {
            if (!args.continue_when_positive) {
                return true;
            } else {
                console.log("VULN/S FOUND IN CLASS BASED REFLECTION");
                vuln_found = true;
            }
        }
    }
    return vuln_found;
}

/**
 * Main entry point for scanning a website for CSTI vulnerabilities.
 * Handles engine detection, crawling, and orchestrates all checks.
 */
const checkWebsite = async (url, engine, doCrawl, crawl_depth) => {
    console.log("RUNNING BROWSER");
    const context = await playwright.chromium.launchPersistentContext('/tmp/temp_context', browser_options);
    const browser = context;
    let page = await context.newPage();
    let timeout_hit = false;

    console.log("VISITING: ", url);
    try {
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
    } catch (e) {
        console.log("ERROR LOADING PAGE", e);
        timeout_hit = true;
    }

    // Retry with/without www if initial navigation fails
    if (timeout_hit && url.includes("www.")) {
        console.log("TIMEOUT HIT - TRYING WITHOUT WWW");
        try {
            url = url.replace("www.", "");
            console.log("TRYING WITHOUT WWW", url);
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
        } catch (e) {
            console.log("ERROR LOADING PAGE", e);
            await browser.close();
            return;
        }
    } else if (timeout_hit && !url.includes("www.")) {
        console.log("TIMEOUT HIT - TRYING WITH WWW");
        try {
            let parsedUrl = new URL(url);
            parsedUrl.hostname = "www." + parsedUrl.hostname;
            url = parsedUrl.toString();
            console.log("TRYING WITH WWW", url);
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
        } catch (e) {
            console.log("ERROR LOADING PAGE WITH WWW", e);
            await browser.close();
            return;
        }
    }

    // Engine detection logic
    if (engine === undefined) {
        engine = await getTemplateEngine(page);
        console.log("ENGINE DETECTED:", engine);
        if (engine === "unknown") {
            console.log("UNKNOWN ENGINE - CHECK OUR LIST OF SUPPORTED ENGINES");
        }
    } else {
        console.log("CHECKING IF THE WEBSITE IS BASED ON ", engine);
        let engine_detected = await checkTemplateEngine(page, engine);
        console.log("ENGINE DETECTION RESULT:", engine_detected);
        if (!engine_detected) {
            console.log("NOT DETECTED - CHECKING ALL ENGINES AVAILABLE");
            engine = await getTemplateEngine(page);
            if (engine === "unknown") {
                console.log("UNKNOWN ENGINE - CHECK OUR LIST OF SUPPORTED ENGINES");
                await browser.close();
                return;
            } else {
                console.log("ENGINE DETECTED", engine);
            }
        } else {
            console.log("ENGINE DETECTED - CONTINUING");
        }
    }

    console.log("CHECKING PROVIDED LINK", url);
    if (engine !== "unknown") {
        if (await checkLink(browser, page, engine)) {
            if (!args.continue_when_positive) {
                await browser.close();
                return;
            }
        }
    }

    // Optionally crawl additional links if enabled
    if (!doCrawl) {
        await browser.close();
        return;
    } else {
        console.log("PROVIDED URL IS NOT VULNERABLE - CRAWLING OTHER LINKS");
        console.log("PERFORMING CRAWLING AT DEPTH", crawl_depth);
        const links = await crawl(url, crawl_depth, args.crawl_subdomains);
        console.log("LIST OF LINKS TO CHECK", links);
        links.shift(); // Remove the seed URL
        for (let i = 0; i < links.length; i++) {
            console.log("CHECKING LINK", links[i], i + '/' + links.length);
            try {
                await page.goto(links[i], { waitUntil: 'networkidle0', timeout: 10000 });
                console.log(page.url());
                console.log("PAGE LOADED, CHECKING TEMPLATE ENGINE");
                engine = await getTemplateEngine(page);
                console.log("ENGINE DETECTION RESULT:", engine);
                if (engine === "unknown") {
                    console.log("UNKNOWN ENGINE IN THIS PAGE - CONTINUING TO NEXT");
                    continue;
                }
            } catch (e) {
                console.log("ERROR LOADING PAGE", e);
                continue;
            }
            if (await checkLink(browser, page, engine)) {
                if (!args.continue_when_positive) {
                    break;
                }
            }
        }
        console.log("FINISHED");
        await browser.close();
        return;
    }
};

// Argument parsing and CLI entry point
const parser = new ArgumentParser({
    description: 'CSTI Detector Tool'
});

parser.add_argument('-u', '--url', { help: 'URL to scan', required: true });
parser.add_argument('-t', '--pred_template', { help: 'OPTIONAL - Which template engine is being used by the target' });
parser.add_argument('--crawl', { help: 'Crawl other links in the website (default false)', default: false, action: 'store_true' });
parser.add_argument('--crawl-depth', { help: 'Crawling depth (default 1)', default: 1, type: 'int' });
parser.add_argument('--skip-forms', { help: 'Skip the filling of forms inside the target', default: false, action: 'store_true' });
parser.add_argument('--skip-buttons', { help: 'Skip the clicking of buttons inside the target', default: false, action: 'store_true' });
parser.add_argument('--skip-links', { help: 'Skip clicking on links inside the target', default: false, action: 'store_true' });
parser.add_argument('--crawl-subdomains', { help: 'Crawl subdomains', default: false, action: 'store_true' });
parser.add_argument('--check-class', { help: 'Check for class based reflection', default: false, action: 'store_true' });
parser.add_argument('--continue-when-positive', { help: 'Continue running the tool when a vulnerability is found', default: false, action: 'store_true' });
parser.add_argument('--skip-inputs', { help: 'Skip pressing enter on each input field inside the page', default: false, action: 'store_true' });

const args = parser.parse_args();
checkWebsite(args.url, args.pred_template, args.crawl, args.crawl_depth);