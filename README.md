# CSTI-Alert

## Overview
CSTI-Alert is a Node.js-based scanner that helps identify potential CSTI vulnerabilities in web applications. It leverages `playwright` for browser automation and `argparse` for command-line argument parsing.

## Features
- Scans a given URL for CSTI vulnerabilities.
- Supports different template engines for targeted testing.
- Can crawl additional links on the website.
- Provides options to skip certain interactions like forms, buttons, and links.
- Allows crawling of subdomains.
- Supports checking for class-based reflection.
- Can continue scanning even after detecting a vulnerability.

## Requirements
- Node.js (latest LTS recommended)
- Playwright
- argparse

## Installation

```sh
# Clone the repository
git clone https://github.com/lpisu98/CSTI-Alert
cd CSTI-Alert/tool

# Install dependencies
npm install
```

## Usage

```sh
node main.js -u <URL> [options]
```

## Docker Usage

### Build the Docker image
```sh
docker build -t csti-alert .
```

### Run the Docker container
```sh
docker run csti-alert -u http://testhtml5.vulnweb.com
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-u, --url` | URL to scan (Required) | - |
| `-t, --pred_template` | Specify template engine used by target (Optional) | - |
| `--crawl` | Crawl other links in the website | `false` |
| `--crawl-depth` | Define crawling depth | `1` |
| `--skip-forms` | Skip filling of forms | `false` |
| `--skip-buttons` | Skip clicking buttons | `false` |
| `--skip-links` | Skip clicking links | `false` |
| `--crawl-subdomains` | Crawl subdomains | `false` |
| `--check-class` | Check for class-based reflection | `false` |
| `--continue-when-positive` | Continue running even when vulnerability is found | `false` |
| `--skip-inputs` | Skip pressing enter on input fields | `false` |

## Example Commands

### Basic scan
```sh
node main.js -u https://example.com
```

### Scan with template engine specification
```sh
node main.js -u https://example.com -t "ejs"
```

### Crawl the website with depth 1
```sh
node main.js -u https://example.com --crawl --crawl-depth 1
```

### Skip forms and buttons during scan
```sh
node main.js -u https://example.com --skip-forms --skip-buttons
```

## Supported Template Engines
- Angular
- Vue
- Mavo
- Handlebars
- Regular
- Template7
- EJS
- Marko
- Tmpl
- Ember
- JsRender
- Dot
- Art-template
- Tempo
- Transparency
- Svelte
- Underscore
- Lit
- Mustache
- Twig
- Markup
- Dust
- Nunjucks
- Pug
- LoadTemplate
- Pure
- Squirrelly
- Swig
- Juicer
- Alpine
- Hogan
- Icanhaz

## Disclaimer
This tool is intended for security testing on websites you own or have explicit permission to test. Unauthorized scanning may violate legal and ethical guidelines.

