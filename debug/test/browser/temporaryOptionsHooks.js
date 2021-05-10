// import { options } from 'preact';

// const storedOptions = Object.assign({}, options);
// console.log('storedOptions: ', storedOptions);
// let revisedOptions;

// function set(obj, newObj) {
// 	for (let i in obj) if (!(i in newObj)) delete obj[i];
// 	Object.assign(obj, newObj);
// }

// export function withTemporaryOptions() {
// 	before(() => {
// 		if (!revisedOptions) {
// 			revisedOptions = Object.assign({}, options);
// 		} else {
// 			set(options, revisedOptions);
// 		}
// 	});

// 	after(() => {
// 		set(options, storedOptions);
// 	});
// }

export function withTemporaryOptions() {}
