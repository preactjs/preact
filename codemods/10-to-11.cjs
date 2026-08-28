const MOVED_JSX_TYPES = new Set([
	'DOMCSSProperties',
	'AllCSSProperties',
	'CSSProperties',
	'SignalLike',
	'Signalish',
	'UnpackSignal',
	'SVGAttributes',
	'PathAttributes',
	'TargetedEvent',
	'TargetedAnimationEvent',
	'TargetedClipboardEvent',
	'TargetedCommandEvent',
	'TargetedCompositionEvent',
	'TargetedDragEvent',
	'TargetedFocusEvent',
	'TargetedInputEvent',
	'TargetedKeyboardEvent',
	'TargetedMouseEvent',
	'TargetedPointerEvent',
	'TargetedSnapEvent',
	'TargetedSubmitEvent',
	'TargetedTouchEvent',
	'TargetedToggleEvent',
	'TargetedTransitionEvent',
	'TargetedUIEvent',
	'TargetedWheelEvent',
	'TargetedPictureInPictureEvent',
	'EventHandler',
	'AnimationEventHandler',
	'ClipboardEventHandler',
	'CommandEventHandler',
	'CompositionEventHandler',
	'DragEventHandler',
	'ToggleEventHandler',
	'FocusEventHandler',
	'GenericEventHandler',
	'InputEventHandler',
	'KeyboardEventHandler',
	'MouseEventHandler',
	'PointerEventHandler',
	'SnapEventHandler',
	'SubmitEventHandler',
	'TouchEventHandler',
	'TransitionEventHandler',
	'UIEventHandler',
	'WheelEventHandler',
	'PictureInPictureEventHandler',
	'DOMAttributes',
	'AriaAttributes',
	'WAIAriaRole',
	'DPubAriaRole',
	'AriaRole',
	'AllHTMLAttributes',
	'HTMLAttributes',
	'HTMLAttributeReferrerPolicy',
	'HTMLAttributeAnchorTarget',
	'AnchorHTMLAttributes',
	'AreaHTMLAttributes',
	'AudioHTMLAttributes',
	'BaseHTMLAttributes',
	'BlockquoteHTMLAttributes',
	'ButtonHTMLAttributes',
	'CanvasHTMLAttributes',
	'ColHTMLAttributes',
	'ColgroupHTMLAttributes',
	'DataHTMLAttributes',
	'DelHTMLAttributes',
	'DetailsHTMLAttributes',
	'DialogHTMLAttributes',
	'EmbedHTMLAttributes',
	'FieldsetHTMLAttributes',
	'FormHTMLAttributes',
	'IframeHTMLAttributes',
	'HTMLAttributeCrossOrigin',
	'ImgHTMLAttributes',
	'HTMLInputTypeAttribute',
	'InputHTMLAttributes',
	'InsHTMLAttributes',
	'KeygenHTMLAttributes',
	'LabelHTMLAttributes',
	'LiHTMLAttributes',
	'LinkHTMLAttributes',
	'MapHTMLAttributes',
	'MarqueeHTMLAttributes',
	'MediaHTMLAttributes',
	'MenuHTMLAttributes',
	'MetaHTMLAttributes',
	'MeterHTMLAttributes',
	'ObjectHTMLAttributes',
	'OlHTMLAttributes',
	'OptgroupHTMLAttributes',
	'OptionHTMLAttributes',
	'OutputHTMLAttributes',
	'ParamHTMLAttributes',
	'ProgressHTMLAttributes',
	'QuoteHTMLAttributes',
	'ScriptHTMLAttributes',
	'SelectHTMLAttributes',
	'SlotHTMLAttributes',
	'SourceHTMLAttributes',
	'StyleHTMLAttributes',
	'TableHTMLAttributes',
	'TdHTMLAttributes',
	'TextareaHTMLAttributes',
	'ThHTMLAttributes',
	'TimeHTMLAttributes',
	'TrackHTMLAttributes',
	'VideoHTMLAttributes',
	'DetailedHTMLProps',
	'MathMLAttributes',
	'AnnotationMathMLAttributes',
	'AnnotationXmlMathMLAttributes',
	'MActionMathMLAttributes',
	'MathMathMLAttributes',
	'MEncloseMathMLAttributes',
	'MErrorMathMLAttributes',
	'MFencedMathMLAttributes',
	'MFracMathMLAttributes',
	'MiMathMLAttributes',
	'MmultiScriptsMathMLAttributes',
	'MNMathMLAttributes',
	'MOMathMLAttributes',
	'MOverMathMLAttributes',
	'MPaddedMathMLAttributes',
	'MPhantomMathMLAttributes',
	'MPrescriptsMathMLAttributes',
	'MRootMathMLAttributes',
	'MRowMathMLAttributes',
	'MSMathMLAttributes',
	'MSpaceMathMLAttributes',
	'MSqrtMathMLAttributes',
	'MStyleMathMLAttributes',
	'MSubMathMLAttributes',
	'MSubsupMathMLAttributes',
	'MSupMathMLAttributes',
	'MTableMathMLAttributes',
	'MTdMathMLAttributes',
	'MTextMathMLAttributes',
	'MTrMathMLAttributes',
	'MUnderMathMLAttributes',
	'MUnderoverMathMLAttributes',
	'SemanticsMathMLAttributes'
]);

// Kept in sync with the Preact 10 core style matcher. Numeric values for
// properties not matching this expression received an automatic `px` suffix.
const IS_NON_DIMENSIONAL =
	/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;

const TYPESCRIPT_EXTENSION = /\.(?:cts|mts|ts|tsx)$/i;

function getImportedName(specifier) {
	return (
		specifier.imported && (specifier.imported.name || specifier.imported.value)
	);
}

function getLocalName(specifier) {
	return specifier.local && specifier.local.name;
}

function isNamedImport(specifier, name) {
	return (
		specifier.type === 'ImportSpecifier' && getImportedName(specifier) === name
	);
}

function propertyName(property) {
	if (property.computed) return null;
	if (property.key.type === 'Identifier') return property.key.name;
	return property.key.value;
}

function migratedDistributionPath(source) {
	if (/^preact\/dist\/[^/]+$/.test(source)) return 'preact';

	const match = source.match(
		/^preact\/(compat|debug|devtools|hooks|jsx-runtime|test-utils)\/dist\/[^/]+$/
	);
	return match ? `preact/${match[1]}` : source;
}

function isReference(path, bindingScope, name) {
	if (path.scope.lookup(name) !== bindingScope) return false;

	const parent = path.parent && path.parent.node;
	if (!parent) return true;

	if (
		parent.type === 'ImportSpecifier' ||
		parent.type === 'ImportDefaultSpecifier' ||
		parent.type === 'ImportNamespaceSpecifier'
	) {
		return false;
	}

	if (
		(parent.type === 'MemberExpression' ||
			parent.type === 'OptionalMemberExpression') &&
		path.name === 'property' &&
		!parent.computed
	) {
		return false;
	}

	if (
		(parent.type === 'Property' || parent.type === 'ObjectProperty') &&
		path.name === 'key' &&
		!parent.computed
	) {
		return false;
	}

	return true;
}

function transform(file, api) {
	const isTypeScript = TYPESCRIPT_EXTENSION.test(file.path || '');
	const j = api.jscodeshift.withParser(isTypeScript ? 'tsx' : 'babylon');
	const root = j(file.source);
	const programPath = root.find(j.Program).paths()[0];
	const reservedNames = new Set(Object.keys(programPath.scope.getBindings()));
	const importsToClean = new Set();
	for (const declarationType of [
		j.TSTypeAliasDeclaration,
		j.TSInterfaceDeclaration,
		j.TSEnumDeclaration,
		j.TSModuleDeclaration
	]) {
		root.find(declarationType).forEach(path => {
			if (path.node.id && path.node.id.name)
				reservedNames.add(path.node.id.name);
		});
	}

	function stat(name) {
		if (api.stats) api.stats(name);
	}

	function insertImport(declaration, source) {
		const body = root.get().node.program.body;
		let index = -1;

		for (let i = 0; i < body.length; i++) {
			if (
				body[i].type === 'ImportDeclaration' &&
				body[i].source.value === source
			) {
				index = i;
			}
		}

		if (index === -1) {
			for (let i = 0; i < body.length; i++) {
				if (body[i].type === 'ImportDeclaration' || body[i].directive)
					index = i;
			}
		}

		body.splice(index + 1, 0, declaration);
	}

	function findImportedLocal(source, importedName, typeOnly) {
		let localName = null;
		root
			.find(j.ImportDeclaration, { source: { value: source } })
			.forEach(path => {
				for (const specifier of path.node.specifiers || []) {
					if (
						isNamedImport(specifier, importedName) &&
						(typeOnly ||
							(path.node.importKind !== 'type' &&
								specifier.importKind !== 'type'))
					) {
						localName = getLocalName(specifier);
						return;
					}
				}
			});
		return localName;
	}

	function availableLocalName(importedName) {
		let localName = importedName;
		if (reservedNames.has(localName)) localName = `Preact${importedName}`;
		let suffix = 2;
		while (reservedNames.has(localName)) {
			localName = `Preact${importedName}${suffix++}`;
		}
		reservedNames.add(localName);
		return localName;
	}

	function addNamedImport(source, importedName, localName, typeOnly) {
		let target = null;
		root
			.find(j.ImportDeclaration, { source: { value: source } })
			.forEach(path => {
				if (target) return;
				const declaration = path.node;
				const hasNamespace = (declaration.specifiers || []).some(
					specifier => specifier.type === 'ImportNamespaceSpecifier'
				);
				if (
					!hasNamespace &&
					(typeOnly
						? declaration.importKind === 'type'
						: declaration.importKind !== 'type')
				) {
					target = declaration;
				}
			});

		const specifier = j.importSpecifier(
			j.identifier(importedName),
			j.identifier(localName)
		);
		if (typeOnly) specifier.importKind = 'value';

		if (target) {
			target.specifiers.push(specifier);
		} else {
			const declaration = j.importDeclaration([specifier], j.literal(source));
			if (typeOnly) declaration.importKind = 'type';
			insertImport(declaration, source);
		}
	}

	function ensureNamedImport(source, importedName, typeOnly = false) {
		const existing = findImportedLocal(source, importedName, typeOnly);
		if (existing) return existing;

		const localName = availableLocalName(importedName);
		addNamedImport(source, importedName, localName, typeOnly);
		return localName;
	}

	function rewriteModuleLiteral(literal) {
		if (!literal || typeof literal.value !== 'string') return;
		literal.value = migratedDistributionPath(literal.value);
		if (literal.extra) {
			delete literal.extra.raw;
			delete literal.extra.rawValue;
		}
	}

	// Preact 11 no longer ships public files below `dist`. Standardize direct
	// ESM imports and re-exports before collecting bindings for later transforms.
	root.find(j.ImportDeclaration).forEach(path => {
		rewriteModuleLiteral(path.node.source);
	});
	root.find(j.ExportNamedDeclaration).forEach(path => {
		if (path.node.source) {
			rewriteModuleLiteral(path.node.source);
		}
	});
	root.find(j.ExportAllDeclaration).forEach(path => {
		rewriteModuleLiteral(path.node.source);
	});
	root.find(j.CallExpression).forEach(path => {
		const callee = path.node.callee;
		const source = path.node.arguments[0];
		const isDynamicImport = callee.type === 'Import';
		const isGlobalRequire =
			callee.type === 'Identifier' &&
			callee.name === 'require' &&
			path.scope.lookup('require') === null;
		if (
			(isDynamicImport || isGlobalRequire) &&
			source &&
			(source.type === 'StringLiteral' || source.type === 'Literal')
		) {
			rewriteModuleLiteral(source);
			if (isGlobalRequire && source.value.startsWith('preact')) {
				stat('manual review: CommonJS import');
			}
		}
	});

	const forwardRefBindings = [];
	const useRefBindings = [];
	const renderBindings = [];
	const jsxBindings = [];

	root.find(j.ImportDeclaration).forEach(importPath => {
		const source = importPath.node.source.value;
		for (const specifier of importPath.node.specifiers || []) {
			const localName = getLocalName(specifier);
			if (!localName) continue;
			const bindingScope = importPath.scope.lookup(localName);

			if (
				source === 'preact/compat' &&
				isNamedImport(specifier, 'forwardRef')
			) {
				forwardRefBindings.push({
					bindingScope,
					importPath,
					localName,
					specifier,
					transformed: false
				});
			}

			if (
				(source === 'preact/hooks' || source === 'preact/compat') &&
				isNamedImport(specifier, 'useRef')
			) {
				useRefBindings.push({ bindingScope, localName });
			}

			if (source === 'preact' && isNamedImport(specifier, 'render')) {
				renderBindings.push({ bindingScope, localName });
			}

			if (source === 'preact' && isNamedImport(specifier, 'JSX')) {
				jsxBindings.push({ bindingScope, importPath, localName, specifier });
			}
		}
	});

	function renderablePropsType(call, firstParameter) {
		const typeParameters = call.typeParameters && call.typeParameters.params;
		let propsType = null;
		let refType = null;

		if (typeParameters && typeParameters.length) {
			refType = typeParameters[0];
			propsType = typeParameters[1] || j.tsTypeLiteral([]);
		} else if (firstParameter.typeAnnotation) {
			propsType = firstParameter.typeAnnotation.typeAnnotation;
		}

		const localName = ensureNamedImport('preact', 'RenderableProps', true);
		const parameters = [];
		if (propsType) parameters.push(propsType);
		if (refType) parameters.push(refType);

		return j.tsTypeReference(
			j.identifier(localName),
			parameters.length ? j.tsTypeParameterInstantiation(parameters) : null
		);
	}

	function refProperty(refName) {
		const property = j.property(
			'init',
			j.identifier('ref'),
			j.identifier(refName)
		);
		property.shorthand = refName === 'ref';
		return property;
	}

	function unwrapForwardRef(call, callback) {
		if (
			(!isTypeScript &&
				callback.params.some(parameter => parameter.typeAnnotation)) ||
			(callback.type === 'FunctionExpression' &&
				j(callback).find(j.Identifier, { name: 'arguments' }).size() > 0)
		) {
			return null;
		}
		if (callback.params.length === 0) return callback;
		if (callback.params.length > 2) return null;

		const first = callback.params[0];
		const second = callback.params[1];
		if (second && second.type !== 'Identifier') return null;

		let pattern;
		if (first.type === 'Identifier') {
			if (!second) return null;
			pattern = j.objectPattern([
				refProperty(second.name),
				j.restElement(j.identifier(first.name))
			]);
		} else if (first.type === 'ObjectPattern') {
			const hasRest = first.properties.some(
				property => property.type === 'RestElement'
			);
			const hasRef = first.properties.some(
				property =>
					(property.type === 'Property' ||
						property.type === 'ObjectProperty') &&
					propertyName(property) === 'ref'
			);

			if (hasRef || (!second && hasRest)) return null;
			if (!second) {
				pattern = first;
			} else {
				const properties = first.properties.slice();
				const restIndex = properties.findIndex(
					property => property.type === 'RestElement'
				);
				properties.splice(
					restIndex === -1 ? properties.length : restIndex,
					0,
					refProperty(second.name)
				);
				pattern = j.objectPattern(properties);
			}
		} else {
			return null;
		}

		if (isTypeScript) {
			pattern.typeAnnotation = j.tsTypeAnnotation(
				renderablePropsType(call, first)
			);
		}

		callback.params = [pattern];
		return callback;
	}

	for (const binding of forwardRefBindings) {
		root
			.find(j.CallExpression, {
				callee: { type: 'Identifier', name: binding.localName }
			})
			.forEach(path => {
				if (path.scope.lookup(binding.localName) !== binding.bindingScope)
					return;

				const call = path.node;
				const callback = call.arguments.length === 1 && call.arguments[0];
				if (
					!callback ||
					(callback.type !== 'ArrowFunctionExpression' &&
						callback.type !== 'FunctionExpression')
				) {
					stat('manual review: non-inline forwardRef');
					return;
				}

				const replacement = unwrapForwardRef(call, callback);
				if (!replacement) {
					stat('manual review: complex forwardRef parameters');
					return;
				}

				replacement.comments = call.comments || replacement.comments;
				j(path).replaceWith(replacement);
				binding.transformed = true;
			});
	}

	for (const binding of useRefBindings) {
		root
			.find(j.CallExpression, {
				callee: { type: 'Identifier', name: binding.localName }
			})
			.forEach(path => {
				if (
					path.node.arguments.length === 0 &&
					path.scope.lookup(binding.localName) === binding.bindingScope
				) {
					path.node.arguments.push(j.identifier('undefined'));
				}
			});
	}

	for (const binding of renderBindings) {
		root
			.find(j.CallExpression, {
				callee: { type: 'Identifier', name: binding.localName }
			})
			.forEach(path => {
				if (
					path.scope.lookup(binding.localName) !== binding.bindingScope ||
					path.node.arguments.length !== 3
				) {
					return;
				}

				const createRootFragment = ensureNamedImport(
					'preact-root-fragment',
					'createRootFragment'
				);
				const [, parent, replaceNode] = path.node.arguments;
				path.node.arguments = [
					path.node.arguments[0],
					j.callExpression(j.identifier(createRootFragment), [
						parent,
						replaceNode
					])
				];
			});
	}

	// Only numeric literals can be rewritten without changing expression
	// evaluation. Dynamic values are intentionally left for manual review.
	root.find(j.JSXAttribute, { name: { name: 'style' } }).forEach(path => {
		const value = path.node.value;
		if (
			!value ||
			value.type !== 'JSXExpressionContainer' ||
			value.expression.type !== 'ObjectExpression'
		) {
			return;
		}

		for (const property of value.expression.properties) {
			if (property.type !== 'Property' && property.type !== 'ObjectProperty') {
				continue;
			}
			const name = propertyName(property);
			if (!name || name[0] === '-' || IS_NON_DIMENSIONAL.test(name)) continue;

			let number = null;
			if (
				(property.value.type === 'NumericLiteral' ||
					property.value.type === 'Literal') &&
				typeof property.value.value === 'number'
			) {
				number = property.value.value;
			} else if (
				property.value.type === 'UnaryExpression' &&
				(property.value.operator === '-' || property.value.operator === '+') &&
				(property.value.argument.type === 'NumericLiteral' ||
					property.value.argument.type === 'Literal') &&
				typeof property.value.argument.value === 'number'
			) {
				number =
					property.value.operator === '-'
						? -property.value.argument.value
						: property.value.argument.value;
			}

			if (number !== null) property.value = j.literal(`${number}px`);
		}
	});

	for (const binding of jsxBindings) {
		root
			.find(j.TSQualifiedName, {
				left: { type: 'Identifier', name: binding.localName }
			})
			.forEach(path => {
				if (
					path.scope.lookup(binding.localName) !== binding.bindingScope ||
					!MOVED_JSX_TYPES.has(path.node.right.name)
				) {
					return;
				}

				const localName = ensureNamedImport(
					'preact',
					path.node.right.name,
					true
				);
				j(path).replaceWith(j.identifier(localName));
			});
	}

	// `createPortal` remains available from compat, but core is now the smaller
	// native entry point. Preserve aliases when moving imports and re-exports.
	root
		.find(j.ImportDeclaration, { source: { value: 'preact/compat' } })
		.forEach(path => {
			const originalLength = (path.node.specifiers || []).length;
			const retained = [];
			for (const specifier of path.node.specifiers || []) {
				if (isNamedImport(specifier, 'createPortal')) {
					addNamedImport(
						'preact',
						'createPortal',
						getLocalName(specifier),
						false
					);
				} else {
					retained.push(specifier);
				}
			}
			path.node.specifiers = retained;
			if (originalLength && retained.length === 0)
				importsToClean.add(path.node);
		});

	root
		.find(j.ExportNamedDeclaration, { source: { value: 'preact/compat' } })
		.forEach(path => {
			const moved = [];
			const retained = [];
			for (const specifier of path.node.specifiers || []) {
				const exported = specifier.local || specifier.exported;
				if (exported && (exported.name || exported.value) === 'createPortal') {
					moved.push(specifier);
				} else {
					retained.push(specifier);
				}
			}

			if (!moved.length) return;
			if (!retained.length) {
				path.node.source = j.literal('preact');
			} else {
				path.node.specifiers = retained;
				j(path).insertAfter(
					j.exportNamedDeclaration(null, moved, j.literal('preact'))
				);
			}
		});

	function hasReferences(binding) {
		return (
			root
				.find(j.Identifier, { name: binding.localName })
				.filter(path =>
					isReference(path, binding.bindingScope, binding.localName)
				)
				.size() > 0
		);
	}

	for (const binding of forwardRefBindings) {
		if (binding.transformed && !hasReferences(binding)) {
			binding.importPath.node.specifiers =
				binding.importPath.node.specifiers.filter(
					specifier => specifier !== binding.specifier
				);
			if (binding.importPath.node.specifiers.length === 0) {
				importsToClean.add(binding.importPath.node);
			}
		}
	}

	for (const binding of jsxBindings) {
		if (!hasReferences(binding)) {
			binding.importPath.node.specifiers =
				binding.importPath.node.specifiers.filter(
					specifier => specifier !== binding.specifier
				);
			if (binding.importPath.node.specifiers.length === 0) {
				importsToClean.add(binding.importPath.node);
			}
		}
	}

	root.find(j.ImportDeclaration).forEach(path => {
		if (importsToClean.has(path.node)) {
			j(path).remove();
		}
	});

	root
		.find(j.AssignmentExpression, {
			left: { type: 'MemberExpression', property: { name: 'defaultProps' } }
		})
		.forEach(() => stat('manual review: defaultProps'));
	root
		.find(j.MemberExpression, {
			object: { type: 'ThisExpression' },
			property: { name: 'base' }
		})
		.forEach(() => stat('manual review: Component.base'));
	root
		.find(j.ImportSpecifier, { imported: { name: 'SuspenseList' } })
		.forEach(() => stat('manual review: SuspenseList'));

	// Recast reuses a directive's original trailing semicolon and then emits a
	// second one when imports are inserted. Print directives afresh instead.
	for (const directive of root.get().node.program.directives || []) {
		directive.loc = null;
		directive.start = null;
		directive.end = null;
		directive.value.loc = null;
		directive.value.start = null;
		directive.value.end = null;
	}

	return root.toSource({ quote: 'single', trailingComma: false });
}

module.exports = transform;
module.exports.parser = 'babylon';
