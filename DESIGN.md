# Design System: Drafter Tracker

## 1. Product and Surface Brief

Drafter Tracker is an internal workspace for PT Rokindo Jaya Mandiri. It connects project control, drafting tasks, schedules, material calculations, heat-load calculations, product references, users, and permissions.

- Visitor modes: **Persuade** for sign-in, **Operate** for authenticated tools.
- Primary user: RJM drafting and engineering team members.
- Primary action: open or create the next project task with minimal scanning cost.
- Preserve: Firebase data flow, Google sign-in, permissions, navigation labels, form fields, project statuses, theme selection, and existing business logic.
- Representative viewports: 1440 x 900 desktop, 1024 x 768 compact desktop, 390 x 844 mobile.

## 2. Visual Theme and Atmosphere

A calm technical fieldbook for cold-storage engineering. The interface should feel measured, durable, and exact, with the restraint of a well-organized drafting desk.

- Design variance: 7 for sign-in, 5 for operational screens.
- Motion intensity: 6 for the sign-in story, 3 for operational screens.
- Visual density: 5. Data remains compact, but controls and touch targets stay comfortable.
- Material language: matte paper, galvanized steel, insulated panel details, blueprint photography, and thin structural rules.
- Theme lock: one selected theme applies to the entire app. Sections may vary surface depth without changing theme family.

## 3. Color Palette and Roles

The theme engine remains authoritative. These values define the default visual target.

- **Field Canvas** (`#F1F4F5`): page ground.
- **Working Surface** (`#F8FAFA`): grouped operational content.
- **Raised Surface** (`#FCFDFD`): dialogs, menus, and selected work areas.
- **Graphite Ink** (`#172126`): primary text.
- **Steel Copy** (`#526168`): secondary text.
- **Muted Measurement** (`#7D8A90`): metadata and helper text.
- **Structural Hairline** (`rgba(23, 33, 38, 0.14)`): dividers and input boundaries.
- **Mineral Blue** (`#2B6F88`): the single default accent for primary actions, focus, and active navigation.

Semantic success, warning, and error colors may appear only when they communicate actual state. Decorative gradients, neon, outer glows, and pure black are not part of this system.

## 4. Typography Rules

- **Display and UI:** Outfit, with weight and whitespace carrying hierarchy.
- **Measurement and data:** IBM Plex Mono, limited to values, units, dates, project codes, and technical metadata.
- Display tracking never tighter than `-0.04em`.
- Body copy stays between 65 and 75 characters per line.
- Headings are concise, naturally wrapped, and never depend on an eyebrow label.
- Dashboard headings remain sans-serif. Serif faces are not used in product UI.

## 5. Shape, Border, and Elevation

- Controls: 10px radius.
- Panels and dialogs: 14px radius.
- Pills are reserved for compact status or segmented controls.
- Prefer whitespace and one hairline divider over cards.
- A component uses either a border or a shadow for separation, not both by default.
- Shadows are rare, neutral, offset, and limited to overlays that need a clear layer.

## 6. Layout Principles

- Desktop container: maximum 1536px with responsive 16px to 32px gutters.
- Operational grids use 12 columns and collapse to one column below 768px.
- The sign-in interest bento uses one 7 by 2 cell plus two 5 by 1 cells, filling two complete 12-column rows.
- Avoid three equal feature cards, nested cards, and unnecessary modal workflows.
- Navigation labels and information architecture remain unchanged.
- Mobile uses a clear app bar, 44px minimum targets, and a bottom navigation pattern for the most important destinations.

## 7. Components and States

- **Buttons:** primary mineral-blue fill, secondary flat neutral, tactile 1px active movement, visible focus ring, no glow.
- **Inputs:** label above, helper below when needed, error below the field, minimum 44px height.
- **Data groups:** mono values, aligned units, sparse dividers, no decorative progress tracks.
- **Loading:** skeletons match final layout dimensions and respect reduced motion.
- **Empty:** state names the missing content and the next useful action.
- **Error:** state names the problem and a recovery action.
- **Permission:** preserve the 403 flow and offer a clear route back or sign-out action.
- **Icons:** one consistent outline family and weight. Existing icons remain until the approved library can be installed safely.

## 8. Imagery

Photography is functional material, not proof or decoration. Use it for cold-room panel construction, drafting plans, refrigeration components, and physical engineering texture. Core controls, text, diagrams, and calculations remain semantic code.

Production assets:

- `/images/cold-room-panel-joint.webp`: macro insulated-panel joint with clean negative space.
- `/images/refrigeration-drafting-desk.webp`: refrigeration plan, ruler, caliper, pencil, and compressor component.

Both assets were generated specifically for this interface with a cool mineral-blue and graphite grade, matte off-white surfaces, realistic studio light, and no text, people, claims, logos, or watermarks.

## 9. Motion and Interaction

- Motion communicates hierarchy, feedback, or state change.
- The sign-in surface may use one authored sticky progression and one slow module marquee.
- Operational screens use short state transitions only.
- Animate transform and opacity. Avoid layout-property animation.
- Every automatic animation pauses or becomes static under `prefers-reduced-motion`.
- Animation effects are isolated in leaf components with cleanup.

## 10. Responsive and Accessibility Commitments

- No horizontal page overflow at 320px and above.
- Touch targets are at least 44 by 44px on mobile.
- Body and placeholder contrast meet WCAG AA.
- Keyboard focus is always visible and never hidden under sticky chrome.
- Mobile menus keep keyboard focus inside the drawer, restore it on close, and close by Escape, explicit button, or backdrop action.
- Text remains readable at browser zoom and with long Indonesian labels.
- Images include useful alternative text or empty alt text when decorative.

## 11. Anti-Patterns

- No emojis, neon, outer glow, gradient text, or decorative glass.
- No pure black, generic purple-blue AI palette, or unbounded accent colors.
- No eyebrow above every heading, section numbering, scroll cues, or version stamps.
- No three equal cards, cards inside cards, fake dashboards, or invented proof.
- No decorative status dots, meaningless badges, fake-precise metrics, or filler copy.
- No generic names, testimonials, or customer logos.
- No em dash characters in visible UI copy.
- No backend, permission, navigation, or form-contract changes during visual redesign.
