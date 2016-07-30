<a href="https://preactjs.com">
<img alt="Preact" title="Preact" src="https://cdn.rawgit.com/developit/b4416d5c92b743dbaec1e68bc4c27cda/raw/3235dc508f7eb834ebf48418aea212a05df13db1/preact-logo-trans.svg" width="550">
</a>

**Preact is a fast, `3kb` alternative to React, with the same ES2015 API.**

Preact retains a large amount of compatibility with React, but only the modern ([ES6 Classes] and [stateless functional components](https://facebook.github.io/react/blog/2015/10/07/react-v0.14.html#stateless-functional-components)) interfaces.
As one would expect coming from React, Components are simple building blocks for composing a User Interface.

### :information_desk_person: Full documentation is available at the [Preact Website ➞](https://preactjs.com)

[![npm](https://img.shields.io/npm/v/preact.svg)](http://npm.im/preact)
[![travis](https://travis-ci.org/developit/preact.svg?branch=master)](https://travis-ci.org/developit/preact)
[![gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/developit/preact)

[![Browsers](https://saucelabs.com/browser-matrix/preact.svg)](https://saucelabs.com/u/preact)


---


## Demos

- [**ESBench**](http://esbench.com) is built using Preact.
- [**Nectarine.rocks**](http://nectarine.rocks) _([Github Project](https://github.com/developit/nectarine))_ :peach:
- [**Documentation Viewer**](https://documentation-viewer.firebaseapp.com) _([Github Project](https://github.com/developit/documentation-viewer))_
- [**TodoMVC**](http://developit.github.io/preact-todomvc/) _([Github Project](https://github.com/developit/preact-todomvc))_
- [**Hacker News Minimal**](https://developit.github.io/hn_minimal/) _([Github Project](https://github.com/developit/hn_minimal))_
- [**Preact Boilerplate**](https://preact-boilerplate.surge.sh) _([Github Project](https://github.com/developit/preact-boilerplate))_ :zap:
- [**Preact Redux Example**](https://github.com/developit/preact-redux-example) :star:
- [**Flickr Browser**](http://codepen.io/developit/full/VvMZwK/) (@ CodePen)
- [**Animating Text**](http://codepen.io/developit/full/LpNOdm/) (@ CodePen)
- [**60FPS Rainbow Spiral**](http://codepen.io/developit/full/xGoagz/) (@ CodePen)
- [**Simple Clock**](http://jsfiddle.net/developit/u9m5x0L7/embedded/result,js/) (@ JSFiddle)
- [**3D + ThreeJS**](http://codepen.io/developit/pen/PPMNjd?editors=0010) (@ CodePen)
- [**Stock Ticker**](http://codepen.io/developit/pen/wMYoBb?editors=0010) (@ CodePen)
- [**Create your Own!**](https://jsfiddle.net/developit/rs6zrh5f/embedded/result/) (@ JSFiddle)
- [**Preact Coffeescript**](https://github.com/crisward/preact-coffee)
- [**GuriVR**](https://gurivr.com) _([Github Project](https://github.com/opennewslabs/guri-vr))_

## Libraries & Add-ons

- :earth_americas: [**preact-router**](https://git.io/preact-router): URL routing for your components.
- :page_facing_up: [**preact-render-to-string**](https://git.io/preact-render-to-string): Universal rendering.
- :raised_hands: [**preact-compat**](https://git.io/preact-compat): use any React library with Preact. *([full example](http://git.io/preact-compat-example))*
- :rocket: [**preact-photon**](https://git.io/preact-photon): build beautiful desktop UI with [photon](http://photonkit.com).
- :microscope: [**preact-jsx-chai**](https://git.io/preact-jsx-chai): JSX assertion testing _(no DOM, right in Node)_
- :bookmark_tabs: [**preact-markup**](https://git.io/preact-markup): Render HTML & Custom Elements as JSX & Components
- :pencil: [**preact-richtextarea**](https://git.io/preact-richtextarea): Simple HTML editor component
- :repeat: [**preact-cycle**](https://git.io/preact-cycle): Functional-reactive paradigm for Preact.
- :satellite: [**preact-portal**](https://git.io/preact-portal): Render Preact components into (a) SPACE :milky_way:
- :construction: [**preact-classless-component**](https://github.com/ld0rman/preact-classless-component): A utility method to create components without the `class` keyword
- :hammer: [**preact-hyperscript**](https://github.com/queckezz/preact-hyperscript): Hyperscript-like syntax for creating elements


## Getting Started

> :information_desk_person: You [don't _have_ to use ES2015 to use Preact](https://github.com/developit/preact-without-babel)... but you should.

The following guide assumes you have some sort of ES2015 build set up using babel and/or webpack/browserify/gulp/grunt/etc.  If you don't, start with [preact-boilerplate] or a [CodePen Template](http://codepen.io/developit/pen/pgaROe?editors=0010).


### Import what you need

The `preact` module provides both named and default exports, so you can either import everything under a namespace of your choosing, or just what you need as locals:

##### Named:

```js
import { h, render, Component } from 'preact';

// Tell Babel to transform JSX into h() calls:
/** @jsx h */
```

##### Default:

```js
import preact from 'preact';

// Tell Babel to transform JSX into preact.h() calls:
/** @jsx preact.h */
```

> Named imports work well for highly structured applications, whereas the default import is quick and never needs to be updated when using different parts of the library.
>
> Instead of declaring the `@jsx` pragma in your code, it's best to configure it globally in a `.babelrc`:
>
> **For Babel 5 and prior:**
>
> ```json
> { "jsxPragma": "h" }
> ```
>
> **For Babel 6:**
>
> ```json
> {
>   "plugins": [
>     ["transform-react-jsx", { "pragma":"h" }]
>   ]
> }
> ```


### Rendering JSX

Out of the box, Preact provides an `h()` function that turns your JSX into Virtual DOM elements _([here's how](http://jasonformat.com/wtf-is-jsx))_. It also provides a `render()` function that creates a DOM tree from that Virtual DOM.

To render some JSX, just import those two functions and use them like so:

```js
import { h, render } from 'preact';

render((
	<div id="foo">
		<span>Hello, world!</span>
		<button onClick={ e => alert("hi!") }>Click Me</button>
	</div>
), document.body);
```

This should seem pretty straightforward if you've used [hyperscript] or one of its many friends.

Rendering hyperscript with a virtual DOM is pointless, though. We want to render components and have them updated when data changes - that's where the power of virtual DOM diffing shines. :star2:


### Components

Preact exports a generic `Component` class, which can be extended to build encapsulated, self-updating pieces of a User Interface.  Components support all of the standard React [lifecycle methods], like `shouldComponentUpdate()` and `componentWillReceiveProps()`.  Providing specific implementations of these methods is the preferred mechanism for controlling _when_ and _how_ components update.

Components also have a `render()` method, but unlike React this method is passed `(props, state)` as arguments. This provides an ergonomic means to destructure `props` and `state` into local variables to be referenced from JSX.

Let's take a look at a very simple `Clock` component, which shows the current time.

```js
import { h, render, Component } from 'preact';

class Clock extends Component {
	render() {
		let time = new Date().toLocaleTimeString();
		return <span>{ time }</span>;
	}
}

// render an instance of Clock into <body>:
render(<Clock />, document.body);
```


That's great. Running this produces the following HTML DOM structure:

```html
<span>10:28:57 PM</span>
```

In order to have the clock's time update every second, we need to know when `<Clock>` gets mounted to the DOM. _If you've used HTML5 Custom Elements, this is similar to the `attachedCallback` and `detachedCallback` lifecycle methods._ Preact invokes the following lifecycle methods if they are defined for a Component:

| Lifecycle method            | When it gets called                              |
|-----------------------------|--------------------------------------------------|
| `componentWillMount`        | before the component gets mounted to the DOM     |
| `componentDidMount`         | after the component gets mounted to the DOM      |
| `componentWillUnmount`      | prior to removal from the DOM                    |
| `componentDidUnmount`       | after removal from the DOM                       |
| `componentWillReceiveProps` | before new props get accepted                    |
| `shouldComponentUpdate`     | before `render()`. Return `false` to skip render |
| `componentWillUpdate`       | before `render()`                                |
| `componentDidUpdate`        | after `render()`                                 |



So, we want to have a 1-second timer start once the Component gets added to the DOM, and stop if it is removed. We'll create the timer and store a reference to it in `componentDidMount`, and stop the timer in `componentWillUnmount`. On each timer tick, we'll update the component's `state` object with a new time value. Doing this will automatically re-render the component.

```js
import { h, render, Component } from 'preact';

class Clock extends Component {
	constructor() {
		super();
		// set initial time:
		this.state.time = Date.now();
	}

	componentDidMount() {
		// update time every second
		this.timer = setInterval(() => {
			this.setState({ time: Date.now() });
		}, 1000);
	}

	componentWillUnmount() {
		// stop when not renderable
		clearInterval(this.timer);
	}

	render(props, state) {
		let time = new Date(state.time).toLocaleTimeString();
		return <span>{ time }</span>;
	}
}

// render an instance of Clock into <body>:
render(<Clock />, document.body);
```

Now we have [a ticking clock](http://jsfiddle.net/developit/u9m5x0L7/embedded/result,js/)!


### Props & State

The concept (and nomenclature) for `props` and `state` is the same as in React. `props` are passed to a component by defining attributes in JSX, `state` is internal state. Changing either triggers a re-render, though by default Preact re-renders Components asynchronously for `state` changes and synchronously for `props` changes.  You can tell Preact to render `prop` changes asynchronously by setting `options.syncComponentUpdates` to `false`.


---


## Linked State

One area Preact takes a little further than React is in optimizing state changes. A common pattern in ES2015 React code is to use Arrow functions within a `render()` method in order to update state in response to events.  Creating functions enclosed in a scope on every render is inefficient and forces the garbage collector to do more work than is necessary.

One solution to this is to bind component methods declaratively.
Here is an example using [decko](http://git.io/decko):

```js
class Foo extends Component {
	@bind
	updateText(e) {
		this.setState({ text: e.target.value });
	}
	render({ }, { text }) {
		return <input value={text} onInput={this.updateText} />;
	}
}
```

While this achieves much better runtime performance, it's still a lot of unnecessary code to wire up state to UI.

Fortunately there is a solution, in the form of `linkState()`. Calling `component.linkState('text')` returns a function that accepts an Event and uses it's associated value to update the given property in your component's state. Calls to linkState() with the same state property are cached, so there is no performance penalty.  Here is the previous example rewritten using _Linked State_:

```js
class Foo extends Component {
	render({ }, { text }) {
		return <input value={text} onInput={this.linkState('text')} />;
	}
}
```

Simple and effective. It handles linking state from any input type, or an optional second parameter can be used to explicitly provide a keypath to the new state value.


## Examples

Here is a somewhat verbose Preact `<Link>` component:

```js
class Link extends Component {
	render(props, state) {
		return <a href={ props.href }>{ props.children }</a>;
	}
}
```

Since this is ES6/ES2015, we can further simplify:

```js
class Link extends Component {
	render({ href, children }) {
		return <a {...{ href, children }} />;
	}
}

// or, for wide-open props support:
class Link extends Component {
	render(props) {
		return <a {...props} />;
	}
}

// or, as a stateless functional component:
const Link = ({ children, ...props }) => (
	<a {...props}>{ children }</a>
);
```


## Extensions

It is likely that some projects based on Preact would wish to extend Component with great new functionality.

Perhaps automatic connection to stores for a Flux-like architecture, or mixed-in context bindings to make it feel more like `React.createClass()`.  Just use ES2015 inheritance:

```js
class BoundComponent extends Component {
	constructor(props) {
		super(props);
		this.bind();
	}
	bind() {
		this.binds = {};
		for (let i in this) {
			this.binds[i] = this[i].bind(this);
		}
	}
}

// example usage
class Link extends BoundComponent {
	click() {
		open(this.href);
	}
	render() {
		let { click } = this.binds;
		return <span onclick={ click }>{ children }</span>;
	}
}
```


The possibilities are pretty endless here. You could even add support for rudimentary mixins:

```js
class MixedComponent extends Component {
	constructor() {
		super();
		(this.mixins || []).forEach( m => Object.assign(this, m) );
	}
}
```


## License

MIT



[![Preact](http://i.imgur.com/YqCHvEW.gif)](https://preactjs.com)



[ES6 Classes]: https://facebook.github.io/react/docs/reusable-components.html#es6-classes
[hyperscript]: https://github.com/dominictarr/hyperscript
[preact-boilerplate]: https://github.com/developit/preact-boilerplate
[lifecycle methods]: https://facebook.github.io/react/docs/component-specs.html
