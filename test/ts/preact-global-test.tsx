import { createElement } from '../../src';

// Test that preact types are available via the global `preact` namespace.

let component: preact.ComponentChild;
component = <div>Hello World</div>;
