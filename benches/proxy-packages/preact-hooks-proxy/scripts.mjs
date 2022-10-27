import path from 'path';
import { fileURLToPath } from 'url';
import {
	preinstall as localPreinstall,
	postinstall as localPostInstall
} from '../preact-local-proxy/scripts.mjs';

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = (...args) => path.join(__dirname, ...args);

export const preinstall = () =>
	localPreinstall(pkgRoot, `[preact-hooks preinstall] `);

export const postinstall = () =>
	localPostInstall(pkgRoot, `[preact-hooks postinstall] `);
