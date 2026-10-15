# Dropping your drawings into the front door

The front door's scroll show (`apps/split-flip-island/web/src/pages/FrontDoorFlow.tsx`) runs
on stand-in shapes. Each piece has a named slot, so a drawing replaces a stand-in without
touching the animation.

| Slot | What it is | Stand-in | Size | Pivot |
|---|---|---|---|---|
| `ball` | The ball that rolls down the page | `StandIns.Ball` | 22 x 22 px, square | Center (it spins) |
| `flipper-left` | Left flipper at the bottom | `StandIns.FlipperLeft` | 74 x 22 px | Left end, 11 px in, middle height |
| `flipper-right` | Right flipper at the bottom | `StandIns.FlipperRight` | 74 x 22 px | Right end, 11 px in, middle height |
| `ball-path` | The lane the ball follows | Worked out in `lanePath()` | Fits the page | Not a drawing |

## Steps

1. In Illustrator, draw each piece on an artboard with the size above. Put the flipper's pivot
   (the round end) where the table says.
2. Export as SVG: **Styling: Presentation Attributes**, **Responsive** unchecked.
3. Save into `apps/split-flip-island/web/src/assets/front-door/` as `ball.svg`,
   `flipper-left.svg` and `flipper-right.svg`.
4. In `FrontDoorFlow.tsx`, swap the stand-in for the file. For example, the ball:

   ```tsx
   import ballUrl from '../assets/front-door/ball.svg';
   // ...
   Ball: () => <img src={ballUrl} width={BALL} height={BALL} alt="" />,
   ```

   Do the same for `FlipperLeft` and `FlipperRight`. If you draw only the left flipper, the
   right one can reuse it with `style={{ transform: 'scaleX(-1)' }}`, like the stand-in does.
5. Leave the `data-slot` boxes alone. They are what GSAP moves.

## What moves what

- The title letters drop in once, when the page opens.
- The ball follows `ball-path` as you scroll, spinning three full turns on the way down.
- The flippers swing up once the ball is in the last 3% of the page, and back down if you
  scroll up.
- Calm mode and the phone's reduce-motion setting turn the whole show off. GSAP is not even
  downloaded then.
