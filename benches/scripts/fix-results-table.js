import { readFile, writeFile } from 'fs/promises';
import stripAnsi from 'strip-ansi';

async function main(args) {
	if (args.length < 1) {
		throw new Error(`Please pass which paths to files to fix as arguments`);
	}

	for (let filePath of args) {
		let contents = await readFile(filePath, 'utf8');
		contents = contents
			.replace(/Γöé/g, '│')
			.replace(/ΓöÇ/g, '─')
			.replace(/Γöî/g, '┌')
			.replace(/Γö£/g, '├')
			.replace(/Γöö/g, '└')
			.replace(/Γö¼/g, '┬')
			.replace(/Γö╝/g, '┼')
			.replace(/Γö┤/g, '┴')
			.replace(/ΓöÉ/g, '┐')
			.replace(/Γöñ/g, '┤')
			.replace(/Γöÿ/g, '┘');

		contents = stripAnsi(contents);

		await writeFile(filePath, contents, 'utf8');
	}
}

main(process.argv.slice(2));
