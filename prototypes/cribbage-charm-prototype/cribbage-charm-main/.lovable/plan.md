

## Add Smooth Peg Movement Animations to Cribbage Board

Currently the peg circles in the SVG jump instantly to new positions when scores change. SVG elements don't respond to CSS `transition` on `cx`/`cy` attributes, so we need a different approach.

### Approach

Add inline `style` with CSS `transition` on the `cx` and `cy` properties for each peg `<circle>`. Modern browsers support transitioning SVG presentation attributes when set via the `style` prop rather than as direct SVG attributes.

### Changes

**File: `src/components/game/CribbageBoard.tsx`**

Update the `renderPegs` function to apply `cx`, `cy` via the `style` prop with CSS transitions instead of as direct SVG attributes:

- For the **back peg** (smaller, dimmer): apply `transition: cx 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), cy 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)` via inline style, and set `cx`/`cy` through the style object.
- For the **front peg glow** (large faint circle): same transition.
- For the **front peg** (main solid circle): same transition with slightly longer duration (0.6s) for a satisfying "clicky leapfrog" feel.

The cubic-bezier curve `(0.34, 1.56, 0.64, 1)` gives a slight overshoot/bounce that mimics a physical peg being pushed into a hole.

This is a small, focused change -- only the `renderPegs` function inside `CribbageBoard.tsx` needs updating. No other files are affected.

### Technical Details

```text
Before (direct SVG attributes, no animation):
  <circle cx={hole.x} cy={hole.y} r={4.5} ... />

After (style-driven with transitions):
  <circle r={4.5} ...
    style={{
      cx: hole.x,
      cy: hole.y,
      transition: 'cx 0.6s cubic-bezier(0.34,1.56,0.64,1), cy 0.6s cubic-bezier(0.34,1.56,0.64,1)'
    }}
  />
```

All three peg circles (back peg, front glow, front peg) get this treatment. The back peg uses 0.5s and the front peg uses 0.6s so the front peg "lands" slightly after, creating the leapfrog visual.

