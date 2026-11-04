# CalcDaily

Static, English-language calculator and utility website for **https://www.calcdaily.com**.

## Deploy with GitHub + Netlify (recommended for this release)

This is a static HTML/CSS/JavaScript site. It has no framework build step, package installation, or application server requirement.

1. Extract the ZIP and place the **contents of `calcdaily_currentfix/` at the repository root**. The repository root must contain `index.html`, `netlify.toml`, `robots.txt`, `sitemap.xml`, `calculators/`, `css/`, `js/`, and `assets/`. Do not leave the entire `calcdaily_currentfix` folder nested as the only directory unless you also change Netlify's base and publish settings.
2. Push the repository to GitHub.
3. In Netlify, choose **Add new project → Import an existing project**, connect the GitHub repository, and deploy from the intended branch.
4. `netlify.toml` sets the publish directory to the repository root (`.`). No build command is needed for this static release. Confirm that Netlify uses the root as the base directory.
5. In Netlify's domain settings, add `www.calcdaily.com` and `calcdaily.com`, set `www.calcdaily.com` as the primary domain, and configure the DNS records Netlify displays at your DNS provider. Enable HTTPS and verify that HTTP and the apex domain resolve to the primary `www` host.
6. Test the root page, one page from every category, the `/index.html` redirect, legacy `/ferramentas/` redirects, contact flow, QR download, external currency-rate failure state, mobile navigation, and calculator interactions.

Netlify processes the forced permanent redirects in `netlify.toml`. The old `/ferramentas/` routes and the obsolete standard-calculator route are redirected to their current English URLs. The `/index.html` homepage alias redirects to `/`.

## Alternative static hosts

- **Cloudflare Pages:** supports `_redirects`; verify the redirect behavior after deployment.
- **GitHub Pages:** does not process `_redirects` or `netlify.toml`. The legacy HTML files provide instant meta-refresh fallbacks there, but server-side 301 redirects are preferable. The included `CNAME` file is for GitHub Pages domain configuration and does not configure a Netlify custom domain.

The canonical host in page metadata and the XML sitemap is `https://www.calcdaily.com`. Set the hosting platform's primary domain to match it.

## Project structure

- `index.html` — homepage and global search.
- `calculators/` — current calculator pages, grouped by category.
- `css/` and `js/` — shared styles and browser-side functionality.
- `assets/` — social card and touch icon.
- `sitemap.xml` and `robots.txt` — search engine discovery.
- `sitemap-page.html` — visitor-facing directory.
- `THIRD-PARTY-LICENSES/` — third-party license notices, including the local QR encoder.
- `LAUNCH-CHECKLIST.txt` — required operator configuration and launch checks.
- `REDIRECT-MAPPING.csv` — old-to-current URL mapping.

## Privacy and third-party services

The QR Code Generator creates the QR image in the visitor's browser; the entered QR content is not sent to a QR-generation API. The Currency Converter retrieves reference rates from `https://open.er-api.com/v6/latest/USD`; the site's privacy policy and launch checklist disclose this external dependency.

The Contact Us form uses a `mailto:` flow and does not store messages on a CalcDaily server. The configured support address is `zaofrabusiness@gmail.com`; verify that this mailbox is monitored before launch. The Privacy Policy identifies CalcDaily as the public-facing publisher and explains GitHub Pages IP logging. The site owner must verify that the mailbox is monitored, confirm whether a registered business name, registration number, or postal address is required in the target jurisdiction; the individual operator is identified as Marcelo Frazão, and update the policy if a different host/CDN is selected. GitHub states that Pages visitor IP addresses are logged and stored for security, but its public Pages documentation does not specify a fixed retention period.

## Financial and health scope

Some tools provide estimates based on user-entered assumptions rather than country-specific tax rules, clinical assessment, or professional engineering calculations. Review the visible method, exclusions, sources, and limitations on each relevant page before relying on results.

## Licensing

Preserve `THIRD-PARTY-LICENSES/QR-CODE-GENERATOR-LICENSE.txt` when distributing this project.

### Contact form behavior

The current Contact Us form is intentionally backend-free. It validates the visitor's fields and opens the visitor's own email application with a prefilled message to `zaofrabusiness@gmail.com`; the visitor reviews and presses Send. CalcDaily does not receive or store the submission through the website. A server-side backend would instead receive a secure form submission, apply spam protection, and deliver or store the message. That service is not included in this static release and can be added later if automatic web-form delivery is needed.
