import babel from 'rollup-plugin-babel';
import path from 'path';
import fs from 'fs';

export default {
	sourceMapFile: path.resolve(JSON.parse(fs.readFileSync('./package.json')).main),
	plugins: [
		babel({
			sourceMap: true
		})
	]
};
