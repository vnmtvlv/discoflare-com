# Hero screenshots

The hero gallery in `app/components/ProductPreview.vue` shows one screenshot per
released workspace surface, in this order:

| Surface | File | Status |
| --- | --- | --- |
| Chat | `chat.jpg` | present |
| Mail | `mail.jpg` | pending |
| Agents | `agents.jpg` | pending |
| Tasks | `tasks.jpg` | pending |
| Databases | `databases.jpg` | pending |

## Adding one

1. Export at **1600x1000** (8:5). Other ratios letterbox instead of cropping.
2. Save as an optimized JPG under this directory using the exact filename above.
3. In `ProductPreview.vue`, delete the `pending: true` line from that surface.

Only surfaces with a real screenshot appear. A surface marked `pending` — or
one whose file fails to load at runtime — is left out of the gallery entirely,
so a visitor never clicks Mail and is shown Chat. While one screenshot exists
the tab strip is hidden and the hero shows that image alone; the strip returns
as soon as a second surface has a file.

Use the dark theme, a realistic but fictional workspace, and no real customer
data, real email addresses, or personal names.

## Unreferenced files

`design-review-thread.jpg`, `launch-coordination.jpg`, `campaign-assets.jpg`,
and `customer-story-files.jpg` are the previous chat-only gallery. `chat.jpg` is
currently a copy of `design-review-thread.jpg`. Delete the old four once the
five surface screenshots are in place.
