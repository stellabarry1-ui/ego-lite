function boundedInteger(value, fallback, max) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(number)));
}

/**
 * Append appetite-oriented qualifiers to a base query so Google surfaces
 * food/dining/recipe results more reliably.
 *
 * @param {string} query  - Raw query from the caller.
 * @param {string} [type] - Optional category hint: "restaurant", "recipe", or "nutrition".
 * @returns {string} Qualified search query string.
 */
function buildAppetiteQuery(query, type) {
  if (!query) throw new Error("query is required");
  switch ((type || "").toLowerCase()) {
    case "restaurant":
      return `${query} restaurant`;
    case "recipe":
      return `${query} recipe`;
    case "nutrition":
      return `${query} nutrition facts`;
    default:
      return query;
  }
}

/**
 * Extract appetite-relevant fields from a Google result element.
 *
 * In addition to the standard title/url/snippet, this pulls optional
 * recipe metadata (rating, review count, cook time, calories) when the
 * structured-data sub-block is present.
 */
function extractAppetiteResult(el) {
  const title = el.querySelector("h3")?.innerText?.trim() || "";
  const url = el.querySelector("a")?.getAttribute("href") || "";
  const snippet =
    el.querySelector("[data-sncf]")?.innerText?.trim() ||
    el.querySelector("span")?.innerText?.trim() ||
    "";

  const result = { title, url, snippet };
  if (!title) return null;

  // Recipe rich result extras
  const ratingEl = el.querySelector(".fG8Fp yt-formatted-string, [aria-label*='stars'], g-review-stars [aria-label]");
  if (ratingEl) {
    const raw = ratingEl.getAttribute("aria-label") || ratingEl.innerText || "";
    const match = raw.match(/[\d.]+/);
    if (match) result.rating = parseFloat(match[0]);
  }

  const detailRows = el.querySelectorAll(".zECGdd, .IMbR6, [data-attrid]");
  for (const row of detailRows) {
    const text = row.innerText?.trim() || "";
    if (/(\d+)\s*(min|hr|hour)/i.test(text)) result.cookTime = text;
    if (/(\d+)\s*cal/i.test(text)) result.calories = text;
  }

  return result;
}

export async function searchAppetite(ctx, args = {}) {
  const query = args.query || "";
  const type = args.type || "";
  const maxResults = boundedInteger(args.maxResults, 10, 50);

  const qualifiedQuery = buildAppetiteQuery(query, type);
  const url = `https://www.google.com/search?q=${encodeURIComponent(qualifiedQuery)}&gl=us&hl=en`;

  await ctx.browser.openOrReuseTab(url, { wait: true });
  await ctx.page.waitForLoadState("load");

  const results = await ctx.page
    .locator("div.g")
    .evaluateAll((items, limit) => {
      function extractAppetiteResult(el) {
        const title = el.querySelector("h3")?.innerText?.trim() || "";
        const url = el.querySelector("a")?.getAttribute("href") || "";
        const snippet =
          el.querySelector("[data-sncf]")?.innerText?.trim() ||
          el.querySelector("span")?.innerText?.trim() ||
          "";
        if (!title) return null;
        const result = { title, url, snippet };

        const ratingEl = el.querySelector(
          '[aria-label*="stars"], g-review-stars [aria-label]'
        );
        if (ratingEl) {
          const raw = ratingEl.getAttribute("aria-label") || "";
          const match = raw.match(/[\d.]+/);
          if (match) result.rating = parseFloat(match[0]);
        }

        const detailRows = el.querySelectorAll(".zECGdd, .IMbR6, [data-attrid]");
        for (const row of detailRows) {
          const text = row.innerText?.trim() || "";
          if (!result.cookTime && /\d+\s*(min|hr|hour)/i.test(text))
            result.cookTime = text;
          if (!result.calories && /\d+\s*cal/i.test(text))
            result.calories = text;
        }
        return result;
      }

      return items
        .slice(0, limit)
        .map(extractAppetiteResult)
        .filter(Boolean);
    }, maxResults);

  return results;
}
