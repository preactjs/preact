import { Component, h, render } from '../src';

/**
 * react中应该是这样
 * import React,{Component} from 'react'
 * import {render} from 'react-dom'
 */

render(<p>2</p>, document.getElementById('app'));
render(
	<p>3</p>,
	document.getElementById('app'),
	document.getElementById('app').firstChild
);
