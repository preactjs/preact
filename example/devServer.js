const path = require('path');
const exec = require('child_process').exec;
const Express = require('express');
const watch = require('node-watch');

const srcPath = __dirname.split('/example')[0] + '/src';
const examplePath = __dirname.split('/example')[0] + '/example';

// const hotBuild = () => exec('npm run transpile:main', (err, stdout, stderr) => {
// 	if (err) throw err;
// 	if (stdout) {
// 		console.log(`npm run build:dist --- ${stdout}`);
// 	}
// 	if (stderr) {
// 		console.log(`npm run build:dist --- ${stderr}`);
// 	}
// });

const hotBuildExample = () => exec('npm run transpile:example', (err, stdout, stderr) => {
	if (err) throw err;
	if (stdout) {
		console.log(`npm run build:dist --- ${stdout}`);
	}
	if (stderr) {
		console.log(`npm run build:dist --- ${stderr}`);
	}
});

watch([srcPath, examplePath], {
	recursive: true,
	filter(name) {
		return !/example\/index\.dev\.js/.test(name);
	}
},(evt, filename) => {
	console.log(`${filename} file has changed`);
	// hotBuild();
	hotBuildExample();
});

const app = new Express();
const port = 3000;

app.use(Express.static('./dist'));
app.use(Express.static('./example_tmp'));

app.get('/*', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});

// hotBuild();
hotBuildExample();

app.listen(port, error => {
  /* eslint-disable no-console */
	if (error) {
		console.error(error);
	} else {
		console.info(
      '🌎 Listening on port %s. Open up http://localhost:%s/ in your browser.',
      port,
      port
    );
	}
  /* eslint-enable no-console */
});
