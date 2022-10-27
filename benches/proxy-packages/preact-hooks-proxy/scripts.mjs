import path from 'path';
import { fileURLToPath } from 'url';
import { preinstall as localPreinstall } from '../preact-local-proxy/scripts.mjs';

export const preinstall = () =>
	localPreinstall(
		(...args) =>
			path.join(path.dirname(fileURLToPath(import.meta.url)), ...args),
		`[preact-hooks-proxy preinstall] `
	);
