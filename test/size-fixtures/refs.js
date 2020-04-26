import { render, createElement, createRef } from '../../';

/* @jsx createElement */

const ref = createRef();

render(<div ref={ref}>Hello World</div>, document.getElementById('root'));
