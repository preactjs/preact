# Preact Async Rendering

This directory contains async rendering for Preact. 

## Usage

```
import { render, renderAsync, h } from 'preact/async';

// create main application component
const mainComponent = h(App, {});

// serial rendering
render(mainComponent, document.getElementById('root')); 
  
// async rendering - you can await it
renderAsync(mainComponent, document.getElementById('root-async')); 
```

There is also `hydrateAsync` with similar arguments to render. 
`render` and `renderAsync` can take an optional third parameter called `replaceNode`.
`replaceNode` can be used in cases where there is SSR, but it may be slightly different from CSR.
Use something like `document.getElementById('root').firstElementChild` in that case. 

## Minification

Due to the async nature of the module, certain variables need to remain unchanged. 
This list is exported from this module and can be used for minification purposes.
Below is example usage in webpack. 
If you minify the code without these reserved tokens you will get an error. 

```
...
optimization: {
	...
	minimize: true,
	minimizer: [ 
		new TerserPlugin({ 
			terserOptions: { 
				mangle: { 
					reserved: require('preact/async/reserved').minify.mangle.reserved 
				} 
			} 
		}) 
	]
},
```
