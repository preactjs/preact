import { Component, Fragment, createContext, render, h } from '../src';

render(<p>2</p>, document.getElementById('app'));
render(
	<p>3</p>,
	document.getElementById('app'),
	document.getElementById('app').firstChild
);
