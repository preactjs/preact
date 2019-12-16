import { initDebug } from './debug';
import { initDevTools } from './devtools';

/* istanbul ignore else */
if (process.env.NODE_ENV === 'development') {
	initDebug();
	initDevTools();
}
