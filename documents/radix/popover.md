# Popover

Displays rich content in a portal, triggered by a button.

## Features

- Can be controlled or uncontrolled.

- Customize side, alignment, offsets, collision handling.

- Optionally render a pointing arrow.

- Focus is fully managed and customizable.

- Supports modal and non-modal modes.

- Dismissing and layering behavior is highly customizable.

## [Anatomy](#anatomy)

Import all parts and piece them together.

```jsx
import { Popover } from "radix-ui";

export default () => (
  <Popover.Root>
    <Popover.Trigger />

    <Popover.Anchor />

    <Popover.Portal>
      <Popover.Content>
        <Popover.Close />

        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
```

## [API Reference](#api-reference)

### [Root](#root)

Contains all the parts of a popover.

| Prop           | Type       | Default          |
| -------------- | ---------- | ---------------- |
| `defaultOpen`  | `boolean`  | No default value |
| `open`         | `boolean`  | No default value |
| `onOpenChange` | `function` | No default value |
| `modal`        | `boolean`  | `false`          |

### [Trigger](#trigger)

The button that toggles the popover. By default, the `Popover.Content` will position itself against the trigger.

| Prop      | Type      | Default |
| --------- | --------- | ------- |
| `asChild` | `boolean` | `false` |

| Data attribute | Values               |
| -------------- | -------------------- |
| `[data-state]` | `"open" \| "closed"` |

### [Anchor](#anchor)

An optional element to position the `Popover.Content` against. If this part is not used, the content will position alongside the `Popover.Trigger`.

| Prop      | Type      | Default |
| --------- | --------- | ------- |
| `asChild` | `boolean` | `false` |

### [Portal](#portal)

When used, portals the content part into the `body`.

| Prop         | Type          | Default          |
| ------------ | ------------- | ---------------- |
| `forceMount` | `boolean`     | No default value |
| `container`  | `HTMLElement` | `document.body`  |

### [Content](#content)

The component that pops out when the popover is open.

| Prop                   | Type                | Default          |
| ---------------------- | ------------------- | ---------------- |
| `asChild`              | `boolean`           | `false`          |
| `onOpenAutoFocus`      | `function`          | No default value |
| `onCloseAutoFocus`     | `function`          | No default value |
| `onEscapeKeyDown`      | `function`          | No default value |
| `onPointerDownOutside` | `function`          | No default value |
| `onFocusOutside`       | `function`          | No default value |
| `onInteractOutside`    | `function`          | No default value |
| `forceMount`           | `boolean`           | No default value |
| `side`                 | `enum`              | `"bottom"`       |
| `sideOffset`           | `number`            | `0`              |
| `align`                | `enum`              | `"center"`       |
| `alignOffset`          | `number`            | `0`              |
| `avoidCollisions`      | `boolean`           | `true`           |
| `collisionBoundary`    | `Boundary`          | `[]`             |
| `collisionPadding`     | `number \| Padding` | `0`              |
| `arrowPadding`         | `number`            | `0`              |
| `sticky`               | `enum`              | `"partial"`      |
| `hideWhenDetached`     | `boolean`           | `false`          |

| Data attribute | Values                                   |
| -------------- | ---------------------------------------- |
| `[data-state]` | `"open" \| "closed"`                     |
| `[data-side]`  | `"left" \| "right" \| "bottom" \| "top"` |
| `[data-align]` | `"start" \| "end" \| "center"`           |

| CSS Variable                               | Description                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `--radix-popover-content-transform-origin` | The `transform-origin` computed from the content and arrow positions/offsets |
| `--radix-popover-content-available-width`  | The remaining width between the trigger and the boundary edge                |
| `--radix-popover-content-available-height` | The remaining height between the trigger and the boundary edge               |
| `--radix-popover-trigger-width`            | The width of the trigger                                                     |
| `--radix-popover-trigger-height`           | The height of the trigger                                                    |

### [Arrow](#arrow)

An optional arrow element to render alongside the popover. This can be used to help visually link the anchor with the `Popover.Content`. Must be rendered inside `Popover.Content`.

| Prop      | Type      | Default |
| --------- | --------- | ------- |
| `asChild` | `boolean` | `false` |
| `width`   | `number`  | `10`    |
| `height`  | `number`  | `5`     |

### [Close](#close)

The button that closes an open popover.

| Prop      | Type      | Default |
| --------- | --------- | ------- |
| `asChild` | `boolean` | `false` |

## [Examples](#examples)

### [Constrain the content size](#constrain-the-content-size)

You may want to constrain the width of the content so that it matches the trigger width. You may also want to constrain its height to not exceed the viewport.

We expose several CSS custom properties such as `--radix-popover-trigger-width` and `--radix-popover-content-available-height` to support this. Use them to constrain the content dimensions.

```jsx
// index.jsx

import { Popover } from "radix-ui";

import "./styles.css";

export default () => (
  <Popover.Root>
    <Popover.Trigger>…</Popover.Trigger>

    <Popover.Portal>
      <Popover.Content className="PopoverContent" sideOffset={5}>
        …
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
```

```css
/* styles.css */

.PopoverContent {
  width: var(--radix-popover-trigger-width);

  max-height: var(--radix-popover-content-available-height);
}
```

### [Origin-aware animations](#origin-aware-animations)

We expose a CSS custom property `--radix-popover-content-transform-origin`. Use it to animate the content from its computed origin based on `side`, `sideOffset`, `align`, `alignOffset` and any collisions.

```jsx
// index.jsx

import { Popover } from "radix-ui";

import "./styles.css";

export default () => (
  <Popover.Root>
    <Popover.Trigger>…</Popover.Trigger>

    <Popover.Portal>
      <Popover.Content className="PopoverContent">…</Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
```

```css
/* styles.css */

.PopoverContent {
  transform-origin: var(--radix-popover-content-transform-origin);

  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;

    transform: scale(0);
  }

  to {
    opacity: 1;

    transform: scale(1);
  }
}
```

### [Collision-aware animations](#collision-aware-animations)

We expose `data-side` and `data-align` attributes. Their values will change at runtime to reflect collisions. Use them to create collision and direction-aware animations.

```jsx
// index.jsx

import { Popover } from "radix-ui";

import "./styles.css";

export default () => (
  <Popover.Root>
    <Popover.Trigger>…</Popover.Trigger>

    <Popover.Portal>
      <Popover.Content className="PopoverContent">…</Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
```

```css
/* styles.css */

.PopoverContent {
  animation-duration: 0.6s;

  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.PopoverContent[data-side="top"] {
  animation-name: slideUp;
}

.PopoverContent[data-side="bottom"] {
  animation-name: slideDown;
}

@keyframes slideDown {
  from {
    opacity: 0;

    transform: translateY(-10px);
  }

  to {
    opacity: 1;

    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;

    transform: translateY(10px);
  }

  to {
    opacity: 1;

    transform: translateY(0);
  }
}
```

### [With custom anchor](#with-custom-anchor)

You can anchor the content to another element if you do not want to use the trigger as the anchor.

```jsx
// index.jsx

import { Popover } from "radix-ui";

import "./styles.css";

export default () => (
  <Popover.Root>
    <Popover.Anchor asChild>
      <div className="Row">
        Row as anchor <Popover.Trigger>Trigger</Popover.Trigger>
      </div>
    </Popover.Anchor>

    <Popover.Portal>
      <Popover.Content>…</Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
```

```css
/* styles.css */

.Row {
  background-color: gainsboro;

  padding: 20px;
}
```

## [Accessibility](#accessibility)

Adheres to the [Dialog WAI-ARIA design pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal).

### [Keyboard Interactions](#keyboard-interactions)

| Key           | Description                                              |
| ------------- | -------------------------------------------------------- |
| `Space`       | Opens/closes the popover.                                |
| `Enter`       | Opens/closes the popover.                                |
| `Tab`         | Moves focus to the next focusable element                |
| `Shift + Tab` | Moves focus to the previous focusable element            |
| `Esc`         | Closes the popover and moves focus to `Popover.Trigger`. |

## [Custom APIs](#custom-apis)

Create your own API by abstracting the primitive parts into your own component.

#### Abstract the arrow and set default configuration

This example abstracts the `Popover.Arrow` part and sets a default `sideOffset` configuration.

#### Usage

```jsx
import { Popover, PopoverTrigger, PopoverContent } from "./your-popover";

export default () => (
  <Popover>
    <PopoverTrigger>Popover trigger</PopoverTrigger>

    <PopoverContent>Popover content</PopoverContent>
  </Popover>
);
```

#### Implementation

```jsx
// your-popover.jsx

import * as React from "react";

import { Popover as PopoverPrimitive } from "radix-ui";

export const Popover = PopoverPrimitive.Root;

export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = React.forwardRef(({ children, ...props }, forwardedRef) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content sideOffset={5} {...props} ref={forwardedRef}>
      {children}

      <PopoverPrimitive.Arrow />
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
));
```

<!--$-->

<!--/$-->