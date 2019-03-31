import render from '../src';
import { VNode, h } from 'preact';

let vdom: VNode = <div class="foo">content</div>;

let html = render(vdom);
console.log(html);
