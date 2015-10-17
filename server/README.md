# preact-render-to-string

[![NPM](http://img.shields.io/npm/v/preact-render-to-string.svg)](https://www.npmjs.com/package/preact-render-to-string)
[![travis-ci](https://travis-ci.org/developit/preact-render-to-string.svg)](https://travis-ci.org/developit/preact-render-to-string)

Render JSX and [Preact] components to an HTML string.

Works in Node & the browser, making it useful for universal/isomorphic rendering.


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


### License

[MIT]


[Preact]: https://github.com/developit/preact
[MIT]: http://choosealicense.com/licenses/mit/
