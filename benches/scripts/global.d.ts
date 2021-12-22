interface TachometerOptions {
	browser: string | string[];
	framework: string | string[];
	'window-size': string;
	'sample-size': number;
	horizon: string;
	timeout: number;
	trace: boolean;
}

interface DeoptOptions {
	framework: string;
	timeout: number;
	open: boolean;
}
