# Crucial changes — not just yet

Park these until more frontend work is done or before FYP demo / Rameen’s backend is fully wired. Revisit so **Generate** + **upload** do not break on large images.

---

## SessionStorage / `QuotaExceededError` (`realizeme:sketchImage`, `realizeme:generatedImage`)

### Problem

- `sessionStorage` has a small per-origin quota (often ~5MB; stricter on some browsers / private mode).
- Values are full **base64 data URLs** (`data:image/...;base64,...`), which are ~**4/3** larger than raw binary.
- Two large strings (sketch + generated) plus other keys can exceed quota.
- **Uploading a high-res photo** then **Generate** makes this very likely.

### Backend note

Connecting Rameen’s backend **does not** remove this by itself if the frontend still saves huge base64 strings into `sessionStorage`.

### Fix directions (choose later)

1. **Best (production):** Do not store full images in `sessionStorage`. Use **IndexedDB**, **short-lived backend URLs** (e.g. signed URLs), or a **job id** and fetch on the results page.
2. **Interim:** **Resize/compress** canvas export before storing (e.g. max long edge ~1024px, WebP/JPEG quality ~0.85). Cap upload size in the Import UI. **try/catch** `QuotaExceededError`, clear stale keys, retry once, then show a clear message.
3. **Rough safe budget if staying on sessionStorage:** Aim for **~1–1.5 MB per stored string** after compression, with headroom for two keys + notices.

### UX

- Replace or supplement raw `alert` with **inline** error copy for quota and oversized files.

---

## Quick grep / touch points (when implementing)

- `components/tldraw/DesignerCanvas.tsx` — `sessionStorage.setItem` for sketch / generated images
- `app/designer/results/page.tsx` — reads the same keys

---

_Last updated: reminder from QuotaExceededError investigation (large uploads + generate)._
