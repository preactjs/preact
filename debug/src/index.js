import { initDebug } from './debug';
import { initDevTools } from './devtools';
export { getVNodeFromContainer, getLastRenderOutput, getDOMNode, getComponent } from './inspect';

if (process.env.NODE_ENV === 'development') {
	initDebug();
	initDevTools();
}
