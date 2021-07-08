import { h } from '../../src/index.js';
import { useRef } from './index.js';

const Component = () => {
	const ref = useRef<HTMLDivElement>();
	return h('div', { ref });
};
