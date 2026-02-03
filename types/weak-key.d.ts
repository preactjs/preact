declare global {
	export interface WeakKeyTypes {
		object: object;
	}

	export type WeakKey = WeakKeyTypes[keyof WeakKeyTypes];
}

export {};
