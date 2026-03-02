// @ts-nocheck

import { pipeline, Writable } from 'stream';
import zlib from 'zlib';
import tar from 'tar-stream';

/**
 * @param {Writable} outputStream
 * @param {(packageJSON: any) => any} cb
 */
export function modifyPackageJSON(outputStream, cb) {
	const inputStream = zlib.createGunzip();
	const extract = tar.extract();
	const pack = tar.pack();
	const gzip = zlib.createGzip();

	(async () => {
		for await (const entry of extract) {
			if (
				entry.header.type === 'file' &&
				entry.header.name === 'package/package.json'
			) {
				const chunks = [];
				for await (const chunk of entry) {
					chunks.push(chunk);
				}
				const content = Buffer.concat(chunks).toString('utf8');
				pack.entry(
					entry.header,
					JSON.stringify(cb(JSON.parse(content)), null, 2)
				);
			} else {
				entry.pipe(pack.entry(entry.header));
			}
		}

		pack.finalize();
	})();

	inputStream.pipe(extract);
	pack.pipe(gzip);
	gzip.pipe(outputStream);

	return inputStream;
}
