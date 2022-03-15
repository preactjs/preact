# preact-render-to-string

[![NPM](http://img.shields.io/npm/v/preact-render-to-string.svg)](https://www.npmjs.com/package/preact-render-to-string)
[![Build status](https://github.com/preactjs/preact-render-to-string/actions/workflows/ci.yml/badge.svg)](https://github.com/preactjs/preact-render-to-string/actions/workflows/ci.yml)

Render JSX and [Preact] components to an HTML string.

Works in Node & the browser, making it useful for universal/isomorphic rendering.

\>\> **[Cute Fox-Related Demo](http://codepen.io/developit/pen/dYZqjE?editors=001)** _(@ CodePen)_ <<


---


### Render JSX/VDOM to HTML

```js
import render from 'preact-render-to-string';
import { h } from 'preact';
/** @jsx h */

let vdom = <div class="foo">content</div>;

let html = render(vdom);
console.log(html);
// <div class="foo">content</div>
```


### Render Preact Components to HTML

```js
import render from 'preact-render-to-string';
import { h, Component } from 'preact';
/** @jsx h */

// Classical components work
class Fox extends Component {
	render({ name }) {
		return <span class="fox">{ name }</span>;
	}
}

// ... and so do pure functional components:
const Box = ({ type, children }) => (
	<div class={`box box-${type}`}>{ children }</div>
);

let html = render(
	<Box type="open">
		<Fox name="Finn" />
	</Box>
);

console.log(html);
// <div class="box box-open"><span class="fox">Finn</span></div>
```


---


### Render JSX / Preact / Whatever via Express!

```js
import express from 'express';
import { h } from 'preact';
import render from 'preact-render-to-string';
/** @jsx h */

// silly example component:
const Fox = ({ name }) => (
	<div class="fox">
		<h5>{ name }</h5>
		<p>This page is all about {name}.</p>
	</div>
);

// basic HTTP server via express:
const app = express();
app.listen(8080);

// on each request, render and return a component:
app.get('/:fox', (req, res) => {
	let html = render(<Fox name={req.params.fox} />);
	// send it back wrapped up as an HTML5 document:
	res.send(`<!DOCTYPE html><html><body>${html}</body></html>`);
});
```


---


### License

[MIT]


[Preact]: https://github.com/developit/preact
[MIT]: http://choosealicense.com/licenses/mit/
