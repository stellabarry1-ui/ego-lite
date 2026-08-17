# Google Appetite Workflow

## Purpose

Search Google for appetite-related content: restaurants, recipes, nutrition information,
food blogs, and dining guides.

## Supported `type` hints

| `type` value | Aliases | Query suffix added |
|---|---|---|
| `recipe` | — | `recipe` |
| `restaurant` | — | `restaurant` |
| `nutrition` | — | `nutrition facts` |
| `herbs-and-spices` | `herbs`, `spices` | `herbs spices` |
| `rice` | — | `rice recipe` |
| `potatoes` | `potato` | `potato recipe` |
| `sausage` | `sausages` | `sausage recipe` |
| *(omitted)* | — | no suffix; plain query |

## Useful search patterns

- `"restaurants near me"` — local dining results with map pack
- `"best [cuisine] restaurants in [city]"` — restaurant roundups
- `"[dish] recipe"` — recipe results, often with rich snippet rating/time
- `"[ingredient] nutrition"` — knowledge panel with nutrition facts
- `"what to eat when [condition]"` — health/appetite guidance articles

## Page structure for food/recipe results

- Rich recipe snippets: `div.g` containing `[data-attrid="kc:/food/recipe"]` or a `g-review-stars` element
- Restaurant map pack: `div.uVQrge` or `div[data-hveid]` inside the local pack block
- Nutrition facts knowledge panel: `div[data-attrid*="nutrition"]`
- Standard organic result: `div.g` with `h3` title, `a[href]` link, snippet text

## Notes

- Google may display a one-box knowledge panel for well-known dishes above organic results.
- Recipe results often include structured data (rating, cook time, calories) in a sub-block
  below the title — query `[data-attrid]` on the enclosing `div.g` to check.
- Results vary by locale; use `gl` and `hl` query params (e.g. `&gl=us&hl=en`) for
  consistent English results.
