# Adding a Component

A component is one interface element with a value, a look and a behavior. It is written as a `Component` block with a `type`. Use `ADDING_CANVAS_OBJECT.md` for new kinds of block. A new type of component needs none of that, because it only describes itself.

## What a component is made of

The description of a component is a `ComponentDescriptor` in `src/model/component`. It names the type, its group, the type and default of its value, its properties with defaults and limits, how the user operates it, and its default size. The reader checks the properties against this description, so a value that is out of range falls back to its default and a color that is not a color is ignored.

The drawing is a function that returns scene nodes. It lives in `src/renderScene/artifacts/component` and uses only the scene primitives, so it renders without a DOM and every export can use it. The first node is the hit area. It is transparent and covers the whole component, and the object is selected and operated through it.

## A component of the library

1. Add the description to `builtIns.ts`.
2. Add the drawing as a file next to `switch.ts` and register it in `registry.ts`.
3. Test the drawing with `render()`, and the behavior with `createBindingRuntime()`. A component that the user operates also gets a test in `test-dom`.

How the user operates the component follows from `interaction` in the description. A `toggle` changes a boolean value on a tap and on Enter or Space, and a `press` fires `onTap` only. The state of a component in the runtime is `pressed`, `hovered`, `focused` and `value`.

## A component of an application

```ts
import { defineComponent } from 'stickyflow'

const remove = defineComponent({
  type: 'dot',
  group: 'readout',
  properties: { fill: { type: 'color', default: '#00aa00' } },
  interaction: 'none',
  pointerScale: false,
  size: { width: 20, height: 20 },
  scene: (component, { order }) => [/* scene nodes */],
})
```

`defineComponent` registers the description and the drawing and returns a function that removes them again. A type that is already defined is refused, and so is a name that is not a plain word. A document that names a type that is not defined draws a dashed placeholder and reports `unsupported-component-type`.

## Before it is done

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:dom` pass.
- The documentation lists the component with its properties.
