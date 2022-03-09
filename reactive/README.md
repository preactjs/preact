# Reactive addon

## Summary

This PR adds a new addon called `reactive`, which is an alternative to `hooks` for managing state. It's main purpose is to decouple the rendering phase from state updates to ensure optimal rendering performance by default, even for complex apps. It comes with some DX improvements, such as that dependencies are tracked automatically and don't have to be specified by hand for effects.

## Basic Example

```jsx
import { signal } from 'preact/reactive';

// Won't re-render despite state being updated. The effect will
// trigger only when `count.value` changes, not when the component
// re-renders.
function App() {
	const [count, setCount] = signal(0);

	// Look, no dependency args
	effect(() => {
		console.log(`count: ${count.value}`);
	});

	return <NeverReRendered count={count} />;
}

// Will only render once during mounting, will not re-render
// when state is updated in <App />
function NeverReRendered({ count }) {
	return <Inner count={count} />;
}

// Whenever the button is clicked, only the <Inner /> component will rerender
function Inner({ count }) {
	return (
		<button onClick={() => setCount(count.value + 1)}>
			increment {count.value}
		</button>
	);
}
```

## Motivation

Since the introduction of hooks we've seen more and more developers pick that as their main way to manage state. This works great for smaller applications but becomes complex and can easily lead to performance issues in bigger projects. Hooks tie state updates to rendering itself and thereby cause unnecessary re-renders of large portions of the component tree whenever state is updated. One can avoid most of these issues by manually placing memoized calls at the correct spots, but these are hard to track down.

This has been a frequent source of performance issues in projects I've consulted for over the past few years. In one example just rendering the page took 500ms on my Macbook M1 Air and 2s on a slower Android phone. This is the sole time the framework spent rendering. The layout resembled a product list which displays a few filters and a carousel at the top.

Virtual-DOM-based frameworks typically render top down from the component which holds the state. But often the state is only used in components quite a bit further down the tree which means we'll spent a lot of time comparing components which didn't change.

```jsx
const MyContext = createContext(null);

function Foo(props) {
	const [data, setData] = useState(null);

	// Provider and all its children will be re-rendered on state changes,
	// unless they manually opted out.
	return (
		<MyContext.Provider value={{ data }}>{props.children}</MyContext.Provider>
	);
}
```

As applications grow the state of components becomes more intertwined and state often ends up being only triggered to fire an effect.

```jsx
// Example of where an effect triggers a state update to trigger
// another effect
function Foo(props) {
	const [foo, setFoo] = useState(null);
	const [bar, setBar] = useState(null);

	useEffect(() => {
		// Update foo, to trigger the other effect
		setFoo('foobar');
	}, []);

	useEffect(() => {
		console.log(foo);
	}, [foo]);

	// ...
}
```

Whilst memoization can help in improving the performance, it tends to be used incorrectly or is easily defeated by passing a value which changes on each render.

So let's fix that. Let's find a system which avoids these problems by design. A system that only re-renders components that depend on the state that was updated.

A couple of years back when IE11 was still a thing, I've made very good experiences with various reactive libraries that track either or both read and write access to state. One example of that is the excellent [MobX](https://github.com/mobxjs/mobx) library.

Due to the separation of state updates and rendering the framework knows which exact components need to be updated. Instead of passing values down, you're passing descriptions on how to get that value down the tree. Depending on the framework this can be a function, a getter on an object or another kind of "box". That allows frameworks to skip huge portions of the component tree and would not trigger accidental renders caused by state updates to trigger effects.

## Detailed design

One key goal of `preact/reactive` is to have a very lean API, similar to hooks. Frameworks based around observable primitives tend to have a rather large API surface with a lot of new concepts to learn. Our system should be minimal and allow users to compose complex features out of smaller building blocks. It should have a lot of familiar aspects and enough new ones to make the transition to it as beginner friendly as possible.

### Signals

The core primitive of this new system are signals. Signals are very similar to `useState`.

```jsx
function App() {
	const [count, setCount] = signal(0);
	// ...
}
```

But instead of `count` being the number `0`, it is an object on which the original value can be accessed via the `count.value`. That object reference stays the same throughout all re-renderings. By ensuring a stable reference we can safely pass it down to components and track which components read its `.value` property. Whenever it's read inside a component, we add this component as a dependency to that signal. When the value changes we can directly update only these components and skip everything else.

### Computed Signals (aka derived values)

Computed signals are a way to derive a single value from other signals. It is automatically updated whenever the signals it depends upon are updated.

```jsx
function App() {
	const [name, setName] = signal('Jane Doe');
	const [age, setAge] = signal(32);

	// Automatically updated whenever `name` or `age` changes.
	const text = computed(() => {
		return `Name: ${name.value}, age: ${age.value}`;
	});

	// ...
}
```

This also works for conditional logic where new signals need to be subscribed to on the fly and old subscriptions need to be discarded.

```jsx
function App() {
  const [count, setCount] = signal(0);
  const [foo, setFoo] = signal('foo');
  const [bar, setBar] = signal('bar');

  // Automatically updated whenever `name` or `age` changes.
  const text = computed(() => {
    if (count > 10) {
      return foo.value;
    }

    return bar.value;
  });
});
```

### Effects

The way effects are triggered is basically a combination of `useEffect` and the tracking abilities of `computed()`. The effect will only run when the component is mounted or when the effect dependencies changes.

```jsx
function App() {
	const [count, setCount] = signal(0);

	effect(() => console.log(count.value));

	// ...
}
```

Similar to `useEffect` we can return a cleanup function that is called whenever the effect is updated or the component is unmounted.

```jsx
function App() {
	const [userId, setUserId] = signal(1);

	effect(() => {
		const id = userId.value;
		api.subscribeUser(id);

		return () => {
			api.unsubscribeUser(id);
		};
	});

	// ...
}
```

### Readonly: Reacting to prop changes

Because the `props` of a component are a plain object and not reactive by default, effects or derived signals would not be updated whenever props change. We can use the `readonly()` function to create a readonly signal that always updates when the passed value changes.

```jsx
function App(props) {
	// Signal is a stable reference. Value always updates
	// when `props.name` has changed.
	const name = readonly(props.name);
	const text = computed(() => `My name is: ${name.value}`);
	// ...
}
```

### Inject: Subscribing to context

The `inject()` function can be used to subscribe to context. It works similar to `useContext` with the sole difference that the return value is wrapped in a signal.

```jsx
const ThemeCtx = createContext('light');

function App(props) {
	const theme = inject(ThemeCtx);

	return <p>Theme: {theme.value}</p>;
}
```

### Debugging

Due to the nature of the system of being able to track signal reads, we can better show in devtools why a value was updated and how state relates to each component. This work has not yet started.

### Error handling

Errors can be caught via typicall Error boundaries. Since we track the component context a signal was created in, we rethrow the error on that component.

```js
function Foo() {
	const [foo, setFoo] = signal('foo');

	const text = computed(() => {
		if (foo.value !== 'foo') {
			// Errors thrown inside a computed signal can be caught
			// with error boundaries
			throw new Error('fail');
		}

		return foo.value;
	});

	// ...
}
```

## Drawbacks

With hooks developers had to learn about closures in depth. With a reactive system one needs to now about how variables are passed around in JavaScript (pass by value vs by reference).

Similar to hooks the callsite order must be consistent. This means that you cannot conditionally create signals on the fly.

## Alternatives

Libraries like [`MobX`](https://github.com/mobxjs/mobx) track read access of observables via getters.

```js
// Psuedo code:
// Turns object properties into observables
const obj = reactive({ foo: 1, bar: true });

// Read access is tracked via getters
const text = computed(() => obj.foo);
```

Whilst tracking reactivity via getters makes the code more brief, it poses a few considerable downsides. For them to work one must preserve the getters and destructuring prevents reads from being registered properly.

```js
// Pseudo code
// Turns object properties into observables
const { foo } = reactive({ foo: 1, bar: true });

// This breaks...
const text = computed(() => foo);
```

Consider the use case of reacting to changes to `props`. Making them reactive would only be possible by keeping `props` as an object.

```jsx
// This would work
function App(props) {
	const $props = reactive(props);
	// ...
}

// But how to track this? This is much better solved by readonly()
function App({ foo = 1, bar = true }) {
	// ...
}
```

Another use case to consider are other types than `Objects`. In a system based on tracking read access via getters we'd need to support `.entries()`, `.values()` and other iterable methods. And not just for objects, but also collection primitives like `Array`, `Map` and `Set` have to be intercepted.

Debugging is also made a bit trickier, because from the output of `console.log` can easily lead to infinite loop due to invoking all getters, if the collection object is not serialized manually beforehand.

I think this approach would introduce too many rabbit holes and complex issues, that I'd rather avoid entirely.

## Adoption Strategy

With the addition of the new addon developers can introduce reactive components on a component bases in their existing projects. Adoption can therefore happen incrementally and the system happily co-exists with all current solutions.

The current plan is to leverage this module in our devtools extension as the first real world project.

## Unresolved questions

This is mostly bikeshedding:

1. Should it be `foo.value` or `foo.$` ?

```jsx
<button onClick={() => setCount(count.value + 1)}>{count.value}</button>
```

vs

```jsx
<button onClick={() => setCount(count.$ + 1)}>{count.$}</button>
```

2. `inject` is not a good name for reading from context.
3. Do we have a better name for `readonly`?
4. How to work with refs?
