---
name: Neo-Industrial Mono
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#303030'
  inverse-on-surface: '#f2f0f0'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#b71511'
  on-secondary: '#ffffff'
  secondary-container: '#db3327'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001551'
  on-tertiary-container: '#537aff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4a9'
  on-secondary-fixed: '#410001'
  on-secondary-fixed-variant: '#930004'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b6c4ff'
  on-tertiary-fixed: '#001551'
  on-tertiary-fixed-variant: '#0039b3'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 24px
  margin: 32px
---

# Design System: Neo-Industrial Mono

## Brand & Style
The brand personality is authoritative, technical, and high-performance. It draws heavily from **Minimalism** and **Brutalism**, utilizing a stark monochrome foundation punctuated by high-intensity functional colors. The target audience includes developers, engineers, and data analysts who value precision over decoration. The UI should evoke a sense of focused efficiency, resembling a high-end command-line interface or a modern industrial control system. Bold borders, generous whitespace, and sharp typographic hierarchy are the primary tools for establishing brand identity.

## Colors
The color palette is built on a high-contrast foundation.
- **Primary (#1a1a1a):** A deep, near-black used for headers, primary actions, and structural elements to provide maximum groundedness.
- **Secondary (#e63b2e):** A vivid "Alert Red" used for critical actions, errors, and high-priority status indicators.
- **Tertiary (#0055ff):** A technical "Electric Blue" used for links, informational highlights, and secondary interactive states.
- **Neutral (#4a4a4a):** A sophisticated mid-grey used for secondary text, borders, and UI scaffolding.

The overall scheme is high-contrast, ensuring all interactive elements are immediately identifiable against the clean, light background.

## Typography
The typography uses a duo-font system to balance technical character with readability.
- **Space Grotesk** is used for headlines and labels. Its geometric, slightly quirky letterforms provide a "tech-forward" and industrial aesthetic.
- **Inter** is used for body copy to ensure maximum legibility and comfort for long-form reading and data-heavy tables.

Headlines should utilize tight letter spacing and heavy weights to create a strong visual impact. Labels are often rendered in uppercase to emphasize their functional role.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy, aligning content to a rigid structural framework. A 12-column system is used for desktop environments to maintain order and predictability. 

- **Spacing Rhythm:** Based on an 8px baseline grid (1rem = 16px).
- **Margins:** Consistent 32px outer margins ensure the content feels contained and professional.
- **Gutters:** 24px gutters provide clear separation between data columns and UI modules.

Mobile layouts transition to a single-column flow with reduced 16px margins to maximize screen real estate.

## Elevation & Depth
In alignment with the Neo-Industrial style, depth is conveyed through **Bold Borders** and **Tonal Layers** rather than soft shadows.
- **Borders:** 1px or 2px solid strokes in Primary or Neutral colors define the boundaries of elements.
- **Tonal Layers:** Subtle grey fills are used to distinguish container backgrounds from the main page surface.
- **Interaction:** Hover states are indicated by color inversions (e.g., background becoming primary color and text becoming white) rather than elevation lifts, maintaining a flat, architectural feel.

## Shapes
The shape language is disciplined and professional. **Soft (1)** roundedness is applied consistently across the system. 
- UI elements like buttons and input fields use a 0.25rem (4px) corner radius. 
- Larger containers like cards or modals use 0.5rem (8px). 

This slight softening prevents the UI from feeling overly aggressive or dated, providing a modern touch to the otherwise rigid industrial aesthetic.

## Components
- **Buttons:** Primary buttons are solid #1a1a1a with white text. Secondary buttons use a bold 2px border. All buttons have a 4px corner radius.
- **Inputs:** Clean, outlined boxes with a 1px #4a4a4a border. On focus, the border thickens to 2px Primary or Tertiary.
- **Cards:** Defined by a 1px border and a very subtle grey background. Headers within cards should use Space Grotesk.
- **Chips/Badges:** Small, rectangular shapes with 4px radius. Use Secondary (#e63b2e) for errors and Tertiary (#0055ff) for info.
- **Data Tables:** High-density, using Inter for data and Space Grotesk for headers. Use horizontal dividers only to maintain a clean vertical flow.