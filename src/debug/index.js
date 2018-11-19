import { initDevTools } from '../devtools';

if (process.env.NODE_ENV==='development') {
	require('./debug');
	initDevTools();
}
