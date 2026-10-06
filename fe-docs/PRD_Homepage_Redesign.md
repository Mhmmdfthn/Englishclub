# PRD — English Club UPB Homepage Redesign

## 1. Document Status

**Status:** Draft / Ready for visual implementation

**Scope:** Homepage redesign only

**Approach:** Redesign existing English Club UPB system without changing its core backend functionality.

**Principle:** Same system, new experience.

---

## 2. Product Direction

English Club UPB will be presented as a **modern community website that also hosts e-learning functions**, rather than as a traditional Learning Management System (LMS).

The redesign should feel:

- modern
- friendly
- youthful
- academic but not rigid
- playful without looking childish
- clean and intentional
- easy to navigate with minimal user movement

The homepage must make it immediately clear that English Club is a place to:

1. practice English,
2. discover activities and programs,
3. participate in the community,
4. access practical member functions such as attendance and learning materials.

---

## 3. Existing-System Constraint

This project is a **frontend/UX redesign of an existing repository**, not a replacement of the product logic.

The current repository already contains a landing page, program/proker content, Word Hunt, leaderboard, stories/testimonials, member registration/auth-related routes, and admin functionality. The repository uses Vue 3 + Vite on the frontend and Express on the backend. The current landing page also already contains profile/vision-mission, proker content, Word Hunt, and testimonials. 

### Redesign rule

> Preserve existing functions and routes wherever possible; improve how users see, understand, and access them.

Do not invent backend data requirements merely to make the UI look complete.

---

## 4. Goals

### Primary goals

- Make the homepage look and feel like a modern digital product.
- Reduce navigation friction for common member actions.
- Give English Club a stronger visual identity through Eli and the official branding.
- Improve information hierarchy and remove unnecessary homepage sections.
- Keep the public-facing homepage understandable for both guests and members.
- Build the visual foundation so future backend updates can add features without forcing a major redesign.

### UX goals

- A user should understand the site's purpose within a few seconds.
- A user should be able to reach the most important current actions with minimal movement.
- Public information should not be buried under LMS-style dashboard elements.
- The homepage should not feel like a collection of unrelated cards.

---

## 5. Non-Goals / Out of Scope

The following are **not part of this homepage PRD**:

- rebuilding the backend
- changing database structure
- creating a new course/progress system
- adding learning progress tracking
- implementing an Oxford Online English-style course engine
- redesigning the full admin area
- finalizing login/register UI
- defining the complete member dashboard
- creating new learning content

These may be addressed in separate PRDs/design documents later.

---

## 6. Homepage Information Architecture

### Current proposed order

```text
Sticky Navbar
↓
Hero
  ├── Eli
  ├── Headline
  ├── Supporting copy
  ├── Primary CTA
  └── Action Dock
       ├── Home
       ├── Absen
       ├── Materi
       └── Word Hunt
↓
What's Happening at English Club?
↓
About
↓
Stories
↓
Footer
```

This order is **provisional until visual review**. The content order should be evaluated by UX value, not by the order of existing Vue components.

---

# 7. Component Requirements

## 7.1 Sticky Navbar

### Purpose

Provide stable, low-friction navigation to the public sections of the website.

### Structure

```text
[ English Club UPB ]    Home   What's Happening   About   Stories   [ Login ]
```

### Requirements

- Sticky while scrolling.
- Clean and lightweight.
- No hamburger icon in the navbar.
- No secondary sidebar/global index on the homepage for the current version.
- Login remains the primary account action for guests.
- Login/register details are handled in a separate authentication PRD.
- Navbar should visually merge with the hero rather than look like an unrelated toolbar.

### Guest state

Primary account control:

`Login`

A user who needs an account will find the registration path from the Login page based on the existing system flow.

### Member state

The account area may later change to a dashboard/profile entry when session-aware behavior is finalized. Do not hard-code a new backend behavior in this homepage PRD.

---

## 7.2 Hero Section

### Purpose

Orient the user, establish the English Club identity, communicate the value proposition, and expose the most important actions immediately.

### Content

**Brand context:**

`English Club UPB`

**Headline:**

`Learn. Connect. Grow.`

**Supporting copy:**

`A place to practice English, discover new activities, and grow together.`

**Primary CTA:**

`Explore English Club →`

The CTA label can be refined during visual testing, but there should remain only one primary CTA in the hero.

### Removed from current hero concept

- The large `ENGLISH CLUB` headline treatment as the main message.
- The Frank Smith quotation.
- Extra marketing copy that does not help the user understand or act.
- Decorative elements that compete with the headline or mascot.

### Mascot

Use **Eli the crocodile mascot** as the initial hero visual.

Important:

- Eli is a current visual direction, not a permanent technical dependency.
- The layout must still work if Eli is replaced in a later redesign.
- Eli should feel integrated into the composition instead of looking like a floating PNG.

### Hero background

The background will be supplied/refined separately.

Required visual behavior:

- A visual/environmental background behind Eli.
- Strongest background detail toward the right side where Eli sits.
- Background gradually becomes softer and more blurred toward the center-left.
- The text area must remain highly readable.
- Avoid excessive gradients, glows, floating shapes, or AI-style decorative noise.

### Layout

Desktop direction:

```text
Left: text + CTA
Right: Eli + environment/background
Bottom: Action Dock
```

Hero height should remain flexible and be tuned during implementation so the Action Dock can be discovered naturally without forcing unnecessary full-screen scrolling.

---

## 7.3 Action Dock

### Purpose

Provide direct access to the most important actions without forcing users to browse through long pages or secondary navigation.

### Current items

```text
Home | Absen | Materi | Word Hunt
```

### Important UX rule

The Action Dock is **not a second navbar**.

It should feel like a set of direct actions attached to the hero, not a duplicate site navigation bar.

### Behavior

- Horizontal interaction is allowed.
- On desktop, support trackpad/mouse drag or horizontal scrolling where appropriate.
- On mobile, natural horizontal swipe.
- Avoid a forced `>` pagination pattern as the primary mechanism.
- Future items can be added when backend capabilities expand.
- The component should be architected so adding more actions does not require redesigning the hero.

### Visual rule

- Keep iconography consistent.
- Use clear labels.
- Avoid oversized icon containers.
- Keep the dock visually lighter than the hero headline.
- No separate `Quick Access` heading above the dock unless later usability testing shows a real comprehension problem.

---

## 7.4 What's Happening at English Club?

### Purpose

Show what English Club is currently doing or has done, allowing visitors to discover program work without opening a separate page first.

### Section title

**What's Happening at English Club?**

### Content model

The section should accommodate existing program/proker data, including:

- upcoming programs
- ongoing programs
- completed programs

### Display

Start with **6 visible program cards/items**.

Additional items should be accessed through **horizontal scrolling/dragging**, not primarily through a `>` button.

Example:

```text
[ Program 01 ] [ Program 02 ] [ Program 03 ]
[ Program 04 ] [ Program 05 ] [ Program 06 ] → swipe/drag
```

The exact desktop arrangement can become one horizontal rail or a responsive two-row presentation depending on visual testing, but interaction should preserve the principle of direct horizontal exploration.

### Card content

Prefer only information that helps scanning:

- cover/image
- program title
- date or status when available
- short description/caption
- clear action affordance for details

Avoid stuffing full program descriptions into cards.

### Status/filter

The existing system supports program status concepts. A lightweight status indicator may be used, but filters should only be added if they improve findability without creating extra cognitive load.

Do not add filters simply because the backend can support them.

---

## 7.5 About

### Purpose

Explain who English Club is and what the organization does, using information already present in the system.

### Source of content

Use and redesign the existing material represented by:

- `Siapa Kami`
- organizational context
- vision
- mission
- description of what English Club does

### Recommended presentation

Keep it concise on the homepage.

Suggested conceptual structure:

```text
ABOUT ENGLISH CLUB

Who we are
What we do

[ concise explanation ]
[ concise explanation ]
```

Potential supporting visual:

- English Club branding
- Eli or another club visual
- simple supporting photography/illustration

Avoid turning About into a long wall of text.

---

## 7.6 Stories

### Purpose

Keep community voice and visitor/member experiences as part of the homepage.

Stories are considered important and should **remain in the homepage concept**.

### Naming

Use a user-facing title such as:

**Stories from English Club**

Avoid internal UX terminology such as `social proof` in the interface.

### Content

Use the existing Stories/Testimonials data and functionality from the repository.

### Presentation direction

Preferred initial concept:

- 1–2 strong stories visible at a time
- horizontal exploration or carousel-like movement when needed
- strong quote/text hierarchy
- author/member identity where data is available
- no dense wall of testimonials

The section should feel like a community editorial moment, not a product-review panel.

---

## 7.7 Footer

### Purpose

Close the page while providing secondary navigation and organizational identity.

### Content

Potential items:

- English Club UPB branding
- short identity statement
- secondary page links
- social links
- contact/organization information that already exists

Because the homepage no longer uses a sidebar/global index, the footer may carry some secondary navigation responsibilities.

Do not duplicate every navbar item unnecessarily.

---

# 8. Navigation Strategy

The homepage uses two different navigation concepts:

### Navbar = browse the website

Examples:

- Home
- What's Happening
- About
- Stories
- Login

### Action Dock = perform important actions

Examples:

- Home
- Absen
- Materi
- Word Hunt

This separation must be preserved.

### Sidebar / Global Index

**Not used in the current homepage design.**

It may be reconsidered later if authenticated/member functionality grows enough to justify a dedicated application navigation pattern.

---

# 9. Responsive Requirements

## Desktop

- Hero uses a strong left/right composition.
- Eli occupies a large visual area on the right.
- Action Dock sits naturally within the lower hero area.
- Program content is horizontally explorable.
- Sticky navbar remains readable without dominating the page.

## Tablet

- Reduce hero typography and mascot scale.
- Preserve left/right relationship where practical.
- Action Dock remains easy to interact with.
- Avoid turning every section into a multi-column dense grid.

## Mobile

- Navbar condenses cleanly.
- Hero becomes a vertically balanced composition.
- Eli may move below or beside the text depending on viewport.
- Action Dock becomes horizontally swipeable.
- Program cards become horizontally swipeable or single-column where appropriate.
- Text remains readable without excessive font reduction.
- Touch targets must remain comfortable.

---

# 10. Accessibility Requirements

Accessibility is treated as a core UX requirement, not a finishing step.

- Navigation elements must have clear labels.
- Icons must not be the sole source of meaning when a text label is necessary.
- Action Dock items must have adequate touch/click targets.
- Contrast must remain readable over the hero background.
- Horizontal scrolling sections must not depend on visual cues alone.
- Keyboard navigation must remain possible on desktop.
- Focus states must be visible.
- Reduced-motion preferences should be respected when animations are added.
- Decorative mascot/background elements must not interfere with content comprehension.

---

# 11. Visual Direction

## Brand foundation

Base the interface on the existing English Club UPB identity and its existing brand colors rather than inventing a completely new palette.

The repository currently references a royal-blue and yellow foundation. The visual redesign can soften and modernize those colors through tints, surfaces, spacing, and typography while preserving brand recognition.

## Visual tone

Target:

> Modern + friendly + academic + playful + clean

Avoid:

- excessive glassmorphism
- excessive neon/glow
- random floating decorations
- overly rounded everything
- dense dashboard-like card layouts
- generic AI-generated visual noise

The interface should look intentionally designed, not "AI decorated".

---

# 12. Content Strategy

The redesign should reuse current content whenever possible.

### Reuse

- English Club identity/about content
- program/proker content
- Stories/Testimonials
- Word Hunt entry point
- existing login flow
- existing member/admin functionality

### Do not invent yet

- learning progress percentages
- course completion metrics
- certificates
- new course taxonomy
- fictional schedules
- fictional member data
- new backend-specific states not agreed with the backend developer

---

# 13. User Flows — Homepage

## Guest

```text
Open homepage
    ↓
Understand English Club
    ↓
See Hero
    ↓
Choose:
  Explore English Club
  Login
  Explore program content
    ↓
Discover What's Happening
    ↓
Read About / Stories
```

## Member

```text
Open homepage
    ↓
See Hero
    ↓
Use Action Dock
  ├── Absen
  ├── Materi
  └── Word Hunt
```

The Action Dock is intentionally optimized for direct task access rather than broad information browsing.

---

# 14. Success Criteria

The redesign can be considered successful when:

### Visual

- The homepage is recognizably English Club UPB.
- Eli supports the design rather than dominating it.
- Typography, spacing, buttons, cards, and navigation feel like one coherent system.
- The page does not resemble a generic LMS dashboard.

### UX

- Users can understand the site's purpose quickly.
- Important actions are discoverable without excessive scrolling.
- Action Dock does not feel like duplicate navbar navigation.
- Program content can be explored without opening a dedicated page first.
- About and Stories provide context without overwhelming the page.

### Technical/implementation

- Existing routes and backend capabilities remain usable.
- The new UI can be implemented incrementally.
- Future Action Dock items can be added without restructuring the Hero.
- The redesign does not depend on backend features that do not yet exist.

---

# 15. Open Questions for Later Review

These are intentionally left open for visual/UX review:

1. Final Hero CTA label.
2. Exact hero height.
3. Exact navbar spacing and mobile behavior.
4. Exact layout for the 6 program cards.
5. Whether program status filters are needed.
6. Final placement of About vs Stories after visual composition review.
7. Final Stories interaction pattern.
8. Final footer structure.
9. Final typography and component tokens.
10. Whether authenticated pages eventually need a dedicated sidebar/application navigation.

---

# 16. Design Decision Log

| Decision | Status |
|---|---|
| Redesign existing system, do not rebuild core functionality | Locked |
| Homepage feels like a modern website, not a conventional LMS | Locked |
| Sticky navbar | Locked |
| No hamburger/sidebar on current homepage | Locked |
| Login in navbar | Locked |
| Hero headline = `Learn. Connect. Grow.` | Locked |
| Frank Smith quote removed from Hero | Locked |
| Supporting copy = `A place to practice English, discover new activities, and grow together.` | Locked |
| Eli used as temporary hero mascot | Locked for current iteration |
| Hero background handled separately | Locked |
| Action Dock is not a second navbar | Locked |
| Action Dock items = Home, Absen, Materi, Word Hunt | Locked for current iteration |
| Action Dock supports horizontal interaction | Locked |
| Learning/progress section removed from homepage | Locked |
| What's Happening section retained | Locked |
| Section title = `What's Happening at English Club?` | Locked for current iteration |
| Six initial program cards/items | Locked for current iteration |
| Additional program items are horizontally explored | Locked |
| Word Hunt moved from homepage section into Action Dock | Locked |
| Stories retained on homepage | Locked |
| About uses existing `Siapa Kami` + activity/mission context | Locked |
| Login/register redesign handled later | Deferred |
| Course/Learning system handled later | Deferred |
| Admin redesign handled later | Deferred |

---

## 17. Reference Baseline

This PRD is based on the existing English Club UPB repository and deployed site reviewed during the redesign discussion.

Repository:
https://github.com/Mhmmdfthn/Englishclub

Current deployed site:
https://englishclub-one.vercel.app/

Relevant current implementation:
`frontend/src/components/LandingView.vue`

The repository currently documents the landing page, proker/program content, Word Hunt, stories/testimonials, member-related flows, and admin-related functionality. Exact implementation details may evolve independently of this visual redesign.

---

## 18. Next Step

The next artifact should be a **visual homepage mockup** based strictly on the locked decisions in this PRD.

After visual review:

1. critique composition and hierarchy,
2. revise the mockup,
3. lock the homepage layout,
4. update the broader `Design.md`,
5. create component/implementation notes for the frontend developer.
