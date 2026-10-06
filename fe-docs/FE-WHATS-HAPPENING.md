# What's Happening — FE Design Brief

> Implementation brief for the public homepage's program/activity section.
>
> Status: Applied to `frontend/src/components/home/HappeningSection.vue`
> Scope: Public homepage only; existing proker API, routes, and detail behavior stay unchanged.

---

## 1. Goal

Make program work easy to scan by status, while preserving the real activity photography and existing card width. The section should feel like a compact English Club activity index, not a generic event marketplace.

## 2. Reference Review

Reviewed the supplied `Gambar What's happening.png` and event-discovery patterns on [Eventbrite](https://www.eventbrite.com/d/online/events/), [Meetup](https://www.meetup.com/find/events/), [Ticket Tailor](https://www.tickettailor.com/events), and [Fever](https://www.feverup.com/).

Transferable observations:

- Eventbrite groups discoverable event collections and surfaces date/status details close to the event title.
- Meetup surfaces category and event filters before its results, reducing the work needed to narrow a mixed list.
- Ticket Tailor organizes discovery around event categories and repeats a compact title/location/date/action pattern.
- Fever makes location and curated experience categories prominent; that taxonomy is useful for discovery, but would be excessive for this smaller club section.
- Across the examples, consistent card anatomy, real event imagery, concise metadata, and a clear detail affordance make listings easier to scan.

These are pattern references, not templates to copy. The supplied image determines this section's compact status-filter and two-row composition; English Club's existing brand tokens, real content, and current interaction contract remain authoritative.

## 3. Locked Design Decisions

### Section header

- Keep the existing heading: **What's Happening at English Club?**
- Keep supporting copy short and descriptive.
- Place the status filter directly below the header, before the program list.

### Filters

- Provide **All**, **Upcoming**, **Ongoing**, and **Completed** filter chips, matching the supplied visual reference.
- Filter the already-loaded `/api/proker` data in the client; do not add or assume a backend endpoint.
- Use a dark English Club blue fill for the active chip; inactive chips remain quiet, outlined surfaces.
- Keep the controls semantic buttons with visible focus and `aria-pressed` state.
- If a selected filter has no matching records, show a clear empty result message and a way to select another filter.

### Program cards

- Preserve the existing card width: `clamp(260px, 30vw, 330px)` on desktop and the current `min(78vw, 300px)` mobile sizing.
- Keep every real program image. Present it as a visible, compact photo crop at the right side of the tinted title panel; do not remove it or replace it with illustration/gradient.
- Use a restrained status-tinted title panel: warm pale yellow for upcoming, pale green for ongoing, pale blue for completed. The status text badge remains visible in the white content area, so meaning is not conveyed by color alone.
- Keep the lower white area scannable: status, available date, short real caption/description, and a **View** detail action.
- Clamp title and summary text to avoid changing card dimensions across a row.
- Keep the existing card click behavior and emit the same selected program object.

### Layout and responsive behavior

- Desktop: wrapping grid, 3 cards per row; rows extend downward as records grow.
- Tablet (≤1020px): 2 columns. Mobile (≤640px): single column.
- No horizontal rail, drag, or arrow-key paging; all programs are reachable by normal vertical scroll.
- Keep loading, API error, and no-program states. Filter-empty is a distinct state from API-empty.

## 4. Content and Data Constraints

- Use only the proker records returned by the existing API.
- Continue resolving covers from `imageUrl`, `image_url`, `photos[0]`, with the existing local fallback.
- Continue formatting dates from the actual record; omit missing dates.
- Do not add sample programs, counts, attendee numbers, or fabricated dates.
- Retain Indonesian status labels inside cards (`Akan datang`, `Berlangsung`, `Selesai`); filter labels follow the supplied English reference.

## 5. Interaction and Accessibility

- Filter selection updates the visible cards without reloading the page or making a new request.
- Keep each filter keyboard-operable, with visible focus and a programmatically exposed selected state.
- Keep the card as a semantic button and preserve meaningful image alt text.
- The horizontal rail remains keyboard-operable; swipe/drag is an enhancement, not the only way to browse.
- Support reduced motion through the existing design-system behavior.

## 6. Acceptance Checklist

- [x] Status chips appear between the section introduction and cards.
- [x] Each chip filters only the relevant real records; **All** restores the full list.
- [x] Cards retain their existing width at desktop and mobile breakpoints.
- [x] Real cover images remain visible in every card.
- [x] The compact colored title panel and clear white details area echo the supplied reference without copying it pixel-for-pixel.
- [x] Missing dates/descriptions do not create awkward blank rows.
- [x] No-match, API-empty, loading, and error states remain understandable.
- [x] Desktop grid shows 3 columns per row and wraps downward; tablet 2, mobile 1.
- [x] No API, routing, package, or unrelated component changes are introduced.

## 7. Source Links

- Supplied visual reference: `fe-docs/Gambar What's happening.png`
- Existing homepage requirements: `fe-docs/PRD_Homepage_Redesign.md` §7.4
- Shared visual and component rules: `fe-docs/FE-DESIGN-SYSTEM.md`
- Public homepage behavior: `fe-docs/FE-FLOW.md`
- Live pattern references: [Eventbrite online events](https://www.eventbrite.com/d/online/events/), [Meetup events](https://www.meetup.com/find/events/), [Ticket Tailor events](https://www.tickettailor.com/events), [Fever](https://www.feverup.com/)
