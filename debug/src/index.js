import { initDebug } from './debug';
import { initDevTools } from './devtools';

if (process.env.NODE_ENV==='development') {
	initDebug();
	initDevTools();
}
