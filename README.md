# Jewelry — Premium Jewellery Storefront

An in-place upgrade of the supplied **Online Jewellery Shopping** project. The nine original page routes, Jewelry identity, good product photographs and HTML/CSS/JavaScript architecture are retained. The supplied project had no backend, database, authentication or payment integration.

## Run on Windows (VS Code)

1. Extract the entire ZIP.
2. Open the **Jewellery-Premium** folder in VS Code — the folder containing this README and `Setup`.
3. Open **Terminal → New Terminal** and run:

```powershell
py -3.11 -m http.server 5500 --bind 127.0.0.1 --directory Setup
```

4. Open **http://localhost:5500** in Chrome or Edge.
5. Keep the terminal running. Press **Ctrl+C** to stop.

No `npm install`, database import or build is required. If port 5500 is busy, use 5501 and open http://localhost:5501. Keep using the same host and port if you want the same saved cart and wishlist; browser storage is separate for each origin.

Alternative: right-click `Setup/index.html` and choose **Open with Live Server** if you already use that VS Code extension. Do not open `Original-Setup/index.html` unless you want the old design. Avoid double-clicking HTML files (`file://`) because browser-local storage can behave differently.

macOS/Linux:

```bash
python3 -m http.server 5500 --bind 127.0.0.1 --directory Setup
```

## What works

- 17 jewellery products with existing local photography; INR prices and six category views, including bridal jewellery.
- Search with suggestions, category/finish/price/offer filters, sort options, pagination and shareable catalogue query URLs.
- Product details, original-image gallery, image enlargement, quick view, size selection, quantity limits, information tabs and local review drafts.
- Persistent shopping bag, wishlist, save-for-later and comparison of up to three products.
- Consistent calculations, demo stock limits, `WELCOME10` demo discount and PIN-format validation.
- Demo checkout with delivery validation, review step, local demo history and downloadable sample summaries.
- Guest preferences, journal search, local journal notes, care/size guides and downloadable contact enquiry drafts.
- Responsive CSS, mobile navigation, native modal focus handling, keyboard-operable tabs, visible focus indicators, reduced-motion support, lightweight CSS/IntersectionObserver animations and supported-browser page transitions.

## What is explicitly a demo

All prices, materials, stock, size labels, discounts, bestseller labels, ratings and illustrative reviews are **sample data**. No metal/gemstone certification has been verified. Original images are illustrative and are not proof of a particular material or specification.

There is **no real payment, order submission, authentication, database, admin dashboard, email subscription or fulfilment service**. No login or registration system existed in the source. The guest space is not a secure account. No passwords or payment details are collected. Delivery addresses/contact fields remain only in page memory; local order history stores product choices, sample totals, date and reference. Contact forms download drafts; they do not send messages.

Demo shipping is ₹149, or ₹0 at a discounted merchandise subtotal of ₹5,000. Sample prices are treated as inclusive; the demo adds no separate tax. This is a calculation example, not a real seller's policy.

## Project map

| Path | Purpose |
|---|---|
| `Setup/` | Updated website — serve this directory |
| `Setup/css/luxury.css` | Shared luxury design system, layouts, responsive rules and motion |
| `Setup/js/catalog.js` | Product/collection/article data and shared filtering |
| `Setup/js/store.js` | Validated local shopping state, totals and demo order records |
| `Setup/js/ui.js` | Cards, quick view, dialogs, search, bag drawer and shared interactions |
| `Setup/js/pages.js` | Page-specific catalogue, detail, cart, checkout and account behaviour |
| `Setup/img/` | Preserved original photography plus a small SVG favicon |
| `Original-Setup/` | Every supplied website file, unchanged |
| `Project Report/`, `Screen shots/` | Supplied supporting material, unchanged |
| `docs/ANALYSIS.md` | Audit completed before editing |
| `docs/CHANGELOG.md` | Changes and modified/added file list |
| `docs/TESTING.md` | Executed checks, limitations and manual verification steps |
| `docs/original-manifest.json` | SHA-256 inventory of the original files |
| `tests/` | Dependency-free business, presentation and integrity checks |

The old CSS/vendor JavaScript/icon fonts are retained, but the updated pages load only Bootstrap's CSS base, the luxury stylesheet and the four new plain-JavaScript modules. No new runtime package or framework was added. The legacy JavaScript is not required for the updated interactions.

## Edit the catalogue

Edit `Setup/js/catalog.js`. Each product has a stable `id`, name, category, image, price, optional oldPrice, finish, stone, sizes, stock, tags, description and illustrative rating. Put new local images in `Setup/img/` and use their actual relative paths. All page views share this catalogue. Keep demo disclosures until real verified data and services exist.

## Run the checks

From the `Jewellery-Premium` folder:

```powershell
node --test tests/store.test.cjs tests/presentation.test.cjs
py -3.11 tests/check_project.py
```

25 automated source/business/presentation tests passed. All 12 routes passed link/asset integrity checks. **Final visual browser and end-to-end UI verification could not be completed because the browser approval-review service reached its usage limit.** See `docs/TESTING.md`; do not treat these source tests as production acceptance.

## Publishing later

This is a static frontend. To host it, publish **only the contents of `Setup/`** as a static website. Do not publish the root ZIP contents: they include personal college reports and archival material. Any real commerce deployment still needs a server, authoritative product/stock/pricing data, authentication where needed and a properly integrated payment provider.

## Original attribution

The supplied template identifies TemplatesOnWeb in its CSS and A2it online in its footer. These attributions and all original files have been retained. Asset ownership and licence permissions have not been independently verified; retain the original notices and verify rights before public commercial use.
