import render from '../src';
import { createElement } from 'preact';

let vdom = <div class="foo">content</div>;

let html = render(vdom);
console.log(html);
