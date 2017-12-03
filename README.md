<p align="center">
<a href="https://preactjs.com" target="_blank">
<img alt="Preact" title="Preact" src="https://cdn.rawgit.com/developit/b4416d5c92b743dbaec1e68bc4c27cda/raw/3235dc508f7eb834ebf48418aea212a05df13db1/preact-logo-trans.svg" width="550">
</a>
</p>
<p align="center">Fast <b>3kB</b> alternative to React, with the same ES2015 API.</p>

**All the power of Virtual DOM components, without the overhead:**

- Familiar React API & patterns: [ES6 Class] and [Functional Components]
- Extensive React compatibility via a simple [preact-compat] alias
- Everything you need: JSX, <abbr title="Virtual DOM">VDOM</abbr>, React DevTools, <abbr title="Hot Module Replacement">HMR</abbr>, <abbr title="Server-Side Rendering">SSR</abbr>..
- A highly optimized diff algorithm and seamless Server Side Rendering
- Transparent asynchronous rendering with a pluggable scheduler
- 🆕💥 **Instant no-config app bundling with [Preact CLI](https://github.com/developit/preact-cli)**

### 💁 More information at the [Preact Website ➞](https://preactjs.com)


---

<!-- TOC depthFrom:2 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Demos](#demos)
- [Libraries & Add-ons](#libraries--add-ons)
- [Getting Started](#getting-started)
	- [Import what you need](#import-what-you-need)
	- [Rendering JSX](#rendering-jsx)
	- [Components](#components)
	- [Props & State](#props--state)
- [Linked State](#linked-state)
- [Examples](#examples)
- [Extensions](#extensions)
- [Debug Mode](#debug-mode)
- [Backers](#backers)
- [Sponsors](#sponsors)
- [License](#license)

<!-- /TOC -->


# Preact

[![npm](https://img.shields.io/npm/v/preact.svg)](http://npm.im/preact)
[![CDNJS](https://img.shields.io/cdnjs/v/preact.svg)](https://cdnjs.com/libraries/preact)
[![Preact Slack Community](https://preact-slack.now.sh/badge.svg)](https://preact-slack.now.sh)
[![OpenCollective Backers](https://opencollective.com/preact/backers/badge.svg)](#backers)
[![OpenCollective Sponsors](https://opencollective.com/preact/sponsors/badge.svg)](#sponsors)
[![travis](https://travis-ci.org/developit/preact.svg?branch=master)](https://travis-ci.org/developit/preact)
[![coveralls](https://img.shields.io/coveralls/developit/preact/master.svg)](https://coveralls.io/github/developit/preact)
[![gzip size](http://img.badgesize.io/https://unpkg.com/preact/dist/preact.min.js?compression=gzip)](https://unpkg.com/preact/dist/preact.min.js)

Preact supports modern browsers and IE9+:

[![Browsers](https://saucelabs.com/browser-matrix/preact.svg)](https://saucelabs.com/u/preact)


---


## Demos

- [**ESBench**](http://esbench.com) is built using Preact.
- [**Nectarine.rocks**](http://nectarine.rocks) _([GitHub Project](https://github.com/developit/nectarine))_ :peach:
- [**Documentation Viewer**](https://documentation-viewer.firebaseapp.com) _([GitHub Project](https://github.com/developit/documentation-viewer))_
- [**TodoMVC**](https://preact-todomvc.surge.sh) _([GitHub Project](https://github.com/developit/preact-todomvc))_
- [**Hacker News Minimal**](https://developit.github.io/hn_minimal/) _([GitHub Project](https://github.com/developit/hn_minimal))_
- [**Preact Boilerplate**](https://preact-boilerplate.surge.sh) _([GitHub Project](https://github.com/developit/preact-boilerplate))_ :zap:
- [**Preact Offline Starter**](https://preact-starter.now.sh) _([GitHub Project](https://github.com/lukeed/preact-starter))_ :100:
- [**Preact PWA**](https://preact-pwa.appspot.com/) _([GitHub Project](https://github.com/ezekielchentnik/preact-pwa))_ :hamburger:
- [**Preact Mobx Starter**](https://awaw00.github.io/preact-mobx-starter/) _([GitHub Project](https://github.com/awaw00/preact-mobx-starter))_ :sunny:
- [**Preact Redux Example**](https://github.com/developit/preact-redux-example) :star:
- [**Flickr Browser**](http://codepen.io/developit/full/VvMZwK/) (@ CodePen)
- [**Animating Text**](http://codepen.io/developit/full/LpNOdm/) (@ CodePen)
- [**60FPS Rainbow Spiral**](http://codepen.io/developit/full/xGoagz/) (@ CodePen)
- [**Simple Clock**](http://jsfiddle.net/developit/u9m5x0L7/embedded/result,js/) (@ JSFiddle)
- [**3D + ThreeJS**](http://codepen.io/developit/pen/PPMNjd?editors=0010) (@ CodePen)
- [**Stock Ticker**](http://codepen.io/developit/pen/wMYoBb?editors=0010) (@ CodePen)
- [**Create your Own!**](https://jsfiddle.net/developit/rs6zrh5f/embedded/result/) (@ JSFiddle)
- [**Preact Coffeescript**](https://github.com/crisward/preact-coffee)
- [**GuriVR**](https://gurivr.com) _([GitHub Project](https://github.com/opennewslabs/guri-vr))_
- [**V2EX Preact**](https://github.com/yanni4night/v2ex-preact)
- [**BigWebQuiz**](https://bigwebquiz.com/) _([GitHub Project](https://github.com/jakearchibald/big-web-quiz))_
- [**Color Picker**](https://colors.now.sh) _([GitHub Project](https://github.com/lukeed/colors-app))_ :art:
- [**Rainbow Explorer**](https://use-the-platform.com/rainbow-explorer/) _([GitHub Project](https://github.com/vaneenige/rainbow-explorer/))_ :rainbow:
- [**Offline Gallery**](https://use-the-platform.com/offline-gallery/) _([GitHub Project](https://github.com/vaneenige/offline-gallery/))_ :balloon:
- [**Periodic Weather**](https://use-the-platform.com/periodic-weather/) _([GitHub Project](https://github.com/vaneenige/periodic-weather/))_ :sunny:
- [**Play.cash**](https://play.cash) :notes:
- [**Rugby News Board**](http://nbrugby.com) _[(GitHub Project)](https://github.com/rugby-board/rugby-board-node)_

## Libraries & Add-ons

- :raised_hands: [**preact-compat**](https://git.io/preact-compat): use any React library with Preact *([full example](http://git.io/preact-compat-example))*
- :page_facing_up: [**preact-render-to-string**](https://git.io/preact-render-to-string): Universal rendering.
- :eyes: [**preact-render-spy**](https://github.com/mzgoddard/preact-render-spy): Enzyme-lite: Renderer with access to the produced virtual dom for testing.
- :loop: [**preact-render-to-json**](https://git.io/preact-render-to-json): Render for Jest Snapshot testing.
- :earth_americas: [**preact-router**](https://git.io/preact-router): URL routing for your components
- :bookmark_tabs: [**preact-markup**](https://git.io/preact-markup): Render HTML & Custom Elements as JSX & Components
- :satellite: [**preact-portal**](https://git.io/preact-portal): Render Preact components into (a) SPACE :milky_way:
- :pencil: [**preact-richtextarea**](https://git.io/preact-richtextarea): Simple HTML editor component
- :bookmark: [**preact-token-input**](https://github.com/developit/preact-token-input): Text field that tokenizes input, for things like tags
- :card_index: [**preact-virtual-list**](https://github.com/developit/preact-virtual-list): Easily render lists with millions of rows ([demo](https://jsfiddle.net/developit/qqan9pdo/))
- :repeat: [**preact-cycle**](https://git.io/preact-cycle): Functional-reactive paradigm for Preact
- :triangular_ruler: [**preact-layout**](https://download.github.io/preact-layout/): Small and simple layout library
- :thought_balloon: [**preact-socrates**](https://github.com/matthewmueller/preact-socrates): Preact plugin for [Socrates](http://github.com/matthewmueller/socrates)
- :rowboat: [**preact-flyd**](https://github.com/xialvjun/preact-flyd): Use [flyd](https://github.com/paldepind/flyd) FRP streams in Preact + JSX
- :speech_balloon: [**preact-i18nline**](https://github.com/download/preact-i18nline): Integrates the ecosystem around [i18n-js](https://github.com/everydayhero/i18n-js) with Preact via [i18nline](https://github.com/download/i18nline).
- :microscope: [**preact-jsx-chai**](https://git.io/preact-jsx-chai): JSX assertion testing _(no DOM, right in Node)_
- :tophat: [**preact-classless-component**](https://github.com/ld0rman/preact-classless-component): create preact components without the class keyword
- :hammer: [**preact-hyperscript**](https://github.com/queckezz/preact-hyperscript): Hyperscript-like syntax for creating elements
- :white_check_mark: [**shallow-compare**](https://github.com/tkh44/shallow-compare): simplified `shouldComponentUpdate` helper.
- :shaved_ice: [**preact-codemod**](https://github.com/vutran/preact-codemod): Transform your React code to Preact.
- :construction_worker: [**preact-helmet**](https://github.com/download/preact-helmet): A document head manager for Preact
- :necktie: [**preact-delegate**](https://github.com/NekR/preact-delegate): Delegate DOM events
- :art: [**preact-stylesheet-decorator**](https://github.com/k1r0s/preact-stylesheet-decorator): Add Scoped Stylesheets to your Preact Components

#### UI Component Libraries

> Want to prototype something or speed up your development? Try one of these toolkits:

- [**preact-material-components**](https://github.com/prateekbh/preact-material-components): Material Design Components for Preact ([website](https://material.preactjs.com/))
- [**preact-mdc**](https://github.com/BerndWessels/preact-mdc): Material Design Components for Preact ([demo](https://github.com/BerndWessels/preact-mdc-demo))
- [**preact-mui**](https://git.io/v1aVO): The MUI CSS Preact library.
- [**preact-photon**](https://git.io/preact-photon): build beautiful desktop UI with [photon](http://photonkit.com)
- [**preact-mdl**](https://git.io/preact-mdl): [Material Design Lite](https://getmdl.io) for Preact
- [**preact-weui**](https://github.com/afeiship/preact-weui): [Weui](https://github.com/afeiship/preact-weui) for Preact


---

## Getting Started

> 💁 _**Note:** You [don't need ES2015 to use Preact](https://github.com/developit/preact-in-es3)... but give it a try!_

The easiest way to get started with Preact is to install [Preact CLI](https://github.com/developit/preact-cli). This simple command-line tool wraps up the best possible Webpack and Babel setup for you, and even keeps you up-to-date as the underlying tools change. Best of all, it's easy to understand! It builds your app in a single command (`preact build`), doesn't need any configuration, and bakes in best-practises 🙌.

The following guide assumes you have some sort of ES2015 build set up using babel and/or webpack/browserify/gulp/grunt/etc.

You can also start with [preact-boilerplate] or a [CodePen Template](http://codepen.io/developit/pen/pgaROe?editors=0010).


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
> **Using Preact along with TypeScript:**
>
> ```json
> {
>   "jsx": "react",
>   "jsxFactory": "h",
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

This should seem pretty straightforward if you've used hyperscript or one of its many friends. If you're not, the short of it is that the `h()` function import gets used in the final, transpiled code as a drop in replacement for `React.createElement()`, and so needs to be imported even if you don't explicitly use it in the code you write. Also note that if you're the kind of person who likes writing your React code in "pure JavaScript" (you know who you are) you will need to use `h()` wherever you would otherwise use `React.createElement()`.

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
| `componentWillReceiveProps` | before new props get accepted                    |
| `shouldComponentUpdate`     | before `render()`. Return `false` to skip render |
| `componentWillUpdate`       | before `render()`                                |
| `componentDidUpdate`        | after `render()`                                 |



So, we want to have a 1-second timer start once the Component gets added to the DOM, and stop if it is removed. We'll create the timer and store a reference to it in `componentDidMount()`, and stop the timer in `componentWillUnmount()`. On each timer tick, we'll update the component's `state` object with a new time value. Doing this will automatically re-render the component.

```js
import { h, render, Component } from 'preact';

class Clock extends Component {
	constructor() {
		super();
		// set initial time:
		this.state = {
			time: Date.now()
		};
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

Fortunately there is a solution, in the form of a module called [linkstate](https://github.com/developit/linkstate). Calling `linkState(component, 'text')` returns a function that accepts an Event and uses its associated value to update the given property in your component's state. Calls to `linkState()` with the same arguments are cached, so there is no performance penalty.  Here is the previous example rewritten using _Linked State_:

```js
import linkState from 'linkstate';

class Foo extends Component {
	render({ }, { text }) {
		return <input value={text} onInput={linkState(this, 'text')} />;
	}
}
```

Simple and effective. It handles linking state from any input type, or an optional second parameter can be used to explicitly provide a keypath to the new state value.

> **Note:** In Preact 7 and prior, `linkState()` was built right into Component. In 8.0, it was moved to a separate module. You can restore the 7.x behavior by using linkstate as a polyfill - see [the linkstate docs](https://github.com/developit/linkstate#usage).



## Examples

Here is a somewhat verbose Preact `<Link>` component:

```js
class Link extends Component {
	render(props, state) {
		return <a href={props.href}>{props.children}</a>;
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

## Debug Mode

You can inspect and modify the state of your Preact UI components at runtime using the
[React Developer Tools](https://github.com/facebook/react-devtools) browser extension.

1. Install the [React Developer Tools](https://github.com/facebook/react-devtools) extension
2. Import the "preact/debug" module in your app
3. Set `process.env.NODE_ENV` to 'development'
4. Reload and go to the 'React' tab in the browser's development tools


```js
import { h, Component, render } from 'preact';

// Enable debug mode. You can reduce the size of your app by only including this
// module in development builds. eg. In Webpack, wrap this with an `if (module.hot) {...}`
// check.
require('preact/debug');
```

### Runtime Error Checking

To enable debug mode, you need to set `process.env.NODE_ENV=development`. You can do this
with webpack via a builtin plugin.

```js
// webpack.config.js

// Set NODE_ENV=development to enable error checking
new webpack.DefinePlugin({
  'process.env': {
    'NODE_ENV': JSON.stringify('development')
  }
});
```

When enabled, warnings are logged to the console when undefined components or string refs
are detected.

### Developer Tools

If you only want to include devtool integration, without runtime error checking, you can
replace `preact/debug` in the above example with `preact/devtools`. This option doesn't
require setting `NODE_ENV=development`.



## Backers
Support us with a monthly donation and help us continue our activities. [[Become a backer](https://opencollective.com/preact#backer)]

<a href="https://opencollective.com/preact/backer/0/website" target="_blank"><img src="https://opencollective.com/preact/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/1/website" target="_blank"><img src="https://opencollective.com/preact/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/2/website" target="_blank"><img src="https://opencollective.com/preact/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/3/website" target="_blank"><img src="https://opencollective.com/preact/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/4/website" target="_blank"><img src="https://opencollective.com/preact/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/5/website" target="_blank"><img src="https://opencollective.com/preact/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/6/website" target="_blank"><img src="https://opencollective.com/preact/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/7/website" target="_blank"><img src="https://opencollective.com/preact/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/8/website" target="_blank"><img src="https://opencollective.com/preact/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/9/website" target="_blank"><img src="https://opencollective.com/preact/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/10/website" target="_blank"><img src="https://opencollective.com/preact/backer/10/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/11/website" target="_blank"><img src="https://opencollective.com/preact/backer/11/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/12/website" target="_blank"><img src="https://opencollective.com/preact/backer/12/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/13/website" target="_blank"><img src="https://opencollective.com/preact/backer/13/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/14/website" target="_blank"><img src="https://opencollective.com/preact/backer/14/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/15/website" target="_blank"><img src="https://opencollective.com/preact/backer/15/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/16/website" target="_blank"><img src="https://opencollective.com/preact/backer/16/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/17/website" target="_blank"><img src="https://opencollective.com/preact/backer/17/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/18/website" target="_blank"><img src="https://opencollective.com/preact/backer/18/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/19/website" target="_blank"><img src="https://opencollective.com/preact/backer/19/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/20/website" target="_blank"><img src="https://opencollective.com/preact/backer/20/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/21/website" target="_blank"><img src="https://opencollective.com/preact/backer/21/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/22/website" target="_blank"><img src="https://opencollective.com/preact/backer/22/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/23/website" target="_blank"><img src="https://opencollective.com/preact/backer/23/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/24/website" target="_blank"><img src="https://opencollective.com/preact/backer/24/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/25/website" target="_blank"><img src="https://opencollective.com/preact/backer/25/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/26/website" target="_blank"><img src="https://opencollective.com/preact/backer/26/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/27/website" target="_blank"><img src="https://opencollective.com/preact/backer/27/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/28/website" target="_blank"><img src="https://opencollective.com/preact/backer/28/avatar.svg"></a>
<a href="https://opencollective.com/preact/backer/29/website" target="_blank"><img src="https://opencollective.com/preact/backer/29/avatar.svg"></a>


## Sponsors
Become a sponsor and get your logo on our README on GitHub with a link to your site. [[Become a sponsor](https://opencollective.com/preact#sponsor)]

<a href="https://opencollective.com/preact/sponsor/0/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/1/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/2/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/3/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/4/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/5/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/6/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/7/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/8/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/9/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/9/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/10/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/10/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/11/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/11/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/12/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/12/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/13/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/13/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/14/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/14/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/15/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/15/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/16/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/16/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/17/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/17/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/18/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/18/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/19/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/19/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/20/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/20/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/21/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/21/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/22/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/22/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/23/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/23/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/24/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/24/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/25/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/25/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/26/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/26/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/27/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/27/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/28/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/28/avatar.svg"></a>
<a href="https://opencollective.com/preact/sponsor/29/website" target="_blank"><img src="https://opencollective.com/preact/sponsor/29/avatar.svg"></a>

## License

MIT



[![Preact](http://i.imgur.com/YqCHvEW.gif)](https://preactjs.com)


[preact-compat]: https://github.com/developit/preact-compat
[ES6 Class]: https://facebook.github.io/react/docs/reusable-components.html#es6-classes
[Functional Components]: https://facebook.github.io/react/blog/2015/10/07/react-v0.14.html#stateless-functional-components
[hyperscript]: https://github.com/dominictarr/hyperscript
[preact-boilerplate]: https://github.com/developit/preact-boilerplate
[lifecycle methods]: https://facebook.github.io/react/docs/component-specs.html
