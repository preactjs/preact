<p align="center">
<a href="https://preactjs.com" target="_blank">
	
![Preact](https://raw.githubusercontent.com/preactjs/preact/8b0bcc927995c188eca83cba30fbc83491cc0b2f/logo.svg?sanitize=true "Preact")

</a>
</p>
<p align="center">Fast <b>3kB</b> alternative to React with the same modern API.</p>

**All the power of Virtual DOM components, without the overhead:**

- Familiar React API & patterns: [ES6 Class] and [Functional Components]
- Extensive React compatibility via a simple [preact-compat] alias
- Everything you need: JSX, <abbr title="Virtual DOM">VDOM</abbr>, React DevTools, <abbr title="Hot Module Replacement">HMR</abbr>, <abbr title="Server-Side Rendering">SSR</abbr>..
- A highly optimized diff algorithm and seamless Server Side Rendering
- Transparent asynchronous rendering with a pluggable scheduler
- 🆕💥 **Instant no-config app bundling with [Preact CLI](https://github.com/preactjs/preact-cli)**

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
[![travis](https://travis-ci.org/preactjs/preact.svg?branch=master)](https://travis-ci.org/preactjs/preact)
[![coveralls](https://img.shields.io/coveralls/preactjs/preact/master.svg)](https://coveralls.io/github/preactjs/preact)
[![gzip size](http://img.badgesize.io/https://unpkg.com/preact/dist/preact.min.js?compression=gzip)](https://unpkg.com/preact/dist/preact.min.js)
[![install size](https://packagephobia.now.sh/badge?p=preact)](https://packagephobia.now.sh/result?p=preact)

Preact supports modern browsers and IE9+:

[![Browsers](https://saucelabs.com/browser-matrix/preact.svg)](https://saucelabs.com/u/preact)


---


## Demos

#### Real-World Apps

- [**Preact Hacker News**](https://hn.kristoferbaxter.com) _([GitHub Project](https://github.com/kristoferbaxter/preact-hn))_
- [**Play.cash**](https://play.cash) :notes: _([GitHub Project](https://github.com/feross/play.cash))_
- [**Songsterr**](https://www.songsterr.com) 🎼 Using Preact X in production since 10.0 alpha
- [**BitMidi**](https://bitmidi.com/) 🎹 Wayback machine for free MIDI files _([GitHub Project](https://github.com/feross/bitmidi.com))_
- [**Ultimate Guitar**](https://www.ultimate-guitar.com) 🎸speed boosted by Preact.
- [**ESBench**](http://esbench.com) is built using Preact.
- [**BigWebQuiz**](https://bigwebquiz.com) _([GitHub Project](https://github.com/jakearchibald/big-web-quiz))_
- [**Nectarine.rocks**](http://nectarine.rocks) _([GitHub Project](https://github.com/developit/nectarine))_ :peach:
- [**TodoMVC**](https://preact-todomvc.surge.sh) _([GitHub Project](https://github.com/developit/preact-todomvc))_
- [**OSS.Ninja**](https://oss.ninja) _([GitHub Project](https://github.com/developit/oss.ninja))_
- [**GuriVR**](https://gurivr.com) _([GitHub Project](https://github.com/opennewslabs/guri-vr))_
- [**Color Picker**](https://colors.now.sh) _([GitHub Project](https://github.com/lukeed/colors-app))_ :art:
- [**Offline Gallery**](https://use-the-platform.com/offline-gallery/) _([GitHub Project](https://github.com/vaneenige/offline-gallery/))_ :balloon:
- [**Periodic Weather**](https://use-the-platform.com/periodic-weather/) _([GitHub Project](https://github.com/vaneenige/periodic-weather/))_ :sunny:
- [**Rugby News Board**](http://nbrugby.com) _[(GitHub Project)](https://github.com/rugby-board/rugby-board-node)_
- [**Preact Gallery**](https://preact.gallery/) an 8KB photo gallery PWA built using Preact.
- [**Rainbow Explorer**](https://use-the-platform.com/rainbow-explorer/) Preact app to translate real life color to digital color _([Github project](https://github.com/vaneenige/rainbow-explorer))_.
- [**YASCC**](https://carlosqsilva.github.io/YASCC/#/) Yet Another SoundCloud Client _([Github project](https://github.com/carlosqsilva/YASCC))_.
- [**Journalize**](https://preact-journal.herokuapp.com/) 14k offline-capable journaling PWA using preact. _([Github project](https://github.com/jpodwys/preact-journal))_.
- [**Proxx**](https://proxx.app) A game of proximity by GoogleChromeLabs using preact. _([Github project](https://github.com/GoogleChromeLabs/proxx))_.
- [**Web Maker**](https://webmaker.app) An offline and blazing fast frontend playground built using Preact. _([Github project](https://github.com/chinchang/web-maker))_.


#### Runnable Examples

- [**Flickr Browser**](http://codepen.io/developit/full/VvMZwK/) (@ CodePen)
- [**Animating Text**](http://codepen.io/developit/full/LpNOdm/) (@ CodePen)
- [**60FPS Rainbow Spiral**](http://codepen.io/developit/full/xGoagz/) (@ CodePen)
- [**Simple Clock**](http://jsfiddle.net/developit/u9m5x0L7/embedded/result,js/) (@ JSFiddle)
- [**3D + ThreeJS**](http://codepen.io/developit/pen/PPMNjd?editors=0010) (@ CodePen)
- [**Stock Ticker**](http://codepen.io/developit/pen/wMYoBb?editors=0010) (@ CodePen)
- [*Create your Own!*](https://jsfiddle.net/developit/rs6zrh5f/embedded/result/) (@ JSFiddle)

### Starter Projects

- [**Preact Boilerplate**](https://preact-boilerplate.surge.sh) _([GitHub Project](https://github.com/developit/preact-boilerplate))_ :zap:
- [**Preact Offline Starter**](https://preact-starter.now.sh) _([GitHub Project](https://github.com/lukeed/preact-starter))_ :100:
- [**Preact PWA**](https://preact-pwa-yfxiijbzit.now.sh/) _([GitHub Project](https://github.com/ezekielchentnik/preact-pwa))_ :hamburger:
- [**Parcel + Preact + Unistore Starter**](https://github.com/hwclass/parcel-preact-unistore-starter)
- [**Preact Mobx Starter**](https://awaw00.github.io/preact-mobx-starter/) _([GitHub Project](https://github.com/awaw00/preact-mobx-starter))_ :sunny:
- [**Preact Redux Example**](https://github.com/developit/preact-redux-example) :star:
- [**Preact Redux/RxJS/Reselect Example**](https://github.com/continuata/preact-seed)
- [**V2EX Preact**](https://github.com/yanni4night/v2ex-preact)
- [**Preact Coffeescript**](https://github.com/crisward/preact-coffee)
- [**Preact + TypeScript + Webpack**](https://github.com/k1r0s/bleeding-preact-starter)
- [**0 config => Preact + Poi**](https://github.com/k1r0s/preact-poi-starter)
- [**Zero configuration => Preact + Typescript + Parcel**](https://github.com/aalises/preact-typescript-parcel-starter)

---

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
- :electric_plug: [**preact-routlet**](https://github.com/k1r0s/preact-routlet): Simple `Component Driven` Routing for Preact using ES7 Decorators
- :fax: [**preact-bind-group**](https://github.com/k1r0s/preact-bind-group): Preact Forms made easy, Group Events into a Single Callback
- :hatching_chick: [**preact-habitat**](https://github.com/zouhir/preact-habitat): Declarative Preact widgets renderer in any CMS or DOM host ([demo](https://codepen.io/zouhir/pen/brrOPB)).
- :tada: [**proppy-preact**](https://github.com/fahad19/proppy): Functional props composition for Preact components

#### UI Component Libraries

> Want to prototype something or speed up your development? Try one of these toolkits:

- [**preact-material-components**](https://github.com/prateekbh/preact-material-components): Material Design Components for Preact ([website](https://material.preactjs.com/))
- [**preact-mdc**](https://github.com/BerndWessels/preact-mdc): Material Design Components for Preact ([demo](https://github.com/BerndWessels/preact-mdc-demo))
- [**preact-mui**](https://git.io/v1aVO): The MUI CSS Preact library.
- [**preact-photon**](https://git.io/preact-photon): build beautiful desktop UI with [photon](http://photonkit.com)
- [**preact-mdl**](https://git.io/preact-mdl): [Material Design Lite](https://getmdl.io) for Preact
- [**preact-weui**](https://github.com/afeiship/preact-weui): [Weui](https://github.com/afeiship/preact-weui) for Preact
- [**preact-charts**](https://github.com/pmkroeker/preact-charts): Charts for Preact


---

## Getting Started

> 💁 _**Note:** You [don't need ES2015 to use Preact](https://github.com/developit/preact-in-es3)... but give it a try!_

The easiest way to get started with Preact is to install [Preact CLI](https://github.com/preactjs/preact-cli). This simple command-line tool wraps up the best possible Webpack and Babel setup for you, and even keeps you up-to-date as the underlying tools change. Best of all, it's easy to understand! It builds your app in a single command (`preact build`), doesn't need any configuration, and bakes in best-practises 🙌.

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
>
> **For Babel 7:**
>
> ```json
> {
>   "plugins": [
>     ["@babel/plugin-transform-react-jsx", { "pragma":"h" }]
>   ]
> }
> ```
> **For using Preact along with TypeScript add to `tsconfig.json`:**
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
		let time = new Date();
		return <time datetime={time.toISOString()}>{ time.toLocaleTimeString() }</time>;
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


Apache License
                           Version 2.0, January 2004
                        https://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2019 Rolando Gopez Lacuata.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       https://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.



[![Preact](http://i.imgur.com/YqCHvEW.gif)](https://preactjs.com)


[preact-compat]: https://github.com/developit/preact-compat
[ES6 Class]: https://facebook.github.io/react/docs/reusable-components.html#es6-classes
[Functional Components]: https://facebook.github.io/react/blog/2015/10/07/react-v0.14.html#stateless-functional-components
[hyperscript]: https://github.com/dominictarr/hyperscript
[preact-boilerplate]: https://github.com/developit/preact-boilerplate
[lifecycle methods]: https://facebook.github.io/react/docs/component-specs.html
