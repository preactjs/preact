/* eslint-disable */
// preact-render-to-string@5.1.16
import { options as e, createElement as t, Fragment as r } from 'preact';
var n = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|^--/i,
	o = /[&<>"]/g,
	i = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' },
	a = function (e) {
		return i[e] || e;
	};
function l(e) {
	return 'string' != typeof e && (e = String(e)), e.replace(o, a);
}
var s = function (e, t) {
		return String(e).replace(/(\n+)/g, '$1' + (t || '\t'));
	},
	f = function (e, t, r) {
		return (
			String(e).length > (t || 40) ||
			(!r && -1 !== String(e).indexOf('\n')) ||
			-1 !== String(e).indexOf('<')
		);
	},
	u = {};
function c(e) {
	var t = '';
	for (var r in e) {
		var o = e[r];
		null != o &&
			'' !== o &&
			(t && (t += ' '),
			(t +=
				'-' == r[0]
					? r
					: u[r] || (u[r] = r.replace(/([A-Z])/g, '-$1').toLowerCase())),
			(t += ': '),
			(t += o),
			'number' == typeof o && !1 === n.test(r) && (t += 'px'),
			(t += ';'));
	}
	return t || void 0;
}
function p(e, t) {
	for (var r in t) e[r] = t[r];
	return e;
}
function _(e, t) {
	return (
		Array.isArray(t) ? t.reduce(_, e) : null != t && !1 !== t && e.push(t), e
	);
}
var v = { shallow: !0 },
	d = [],
	g = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/,
	h = /[\s\n\\/='"\0<>]/,
	m = function () {};
b.render = b;
var x = function (e, t) {
		return b(e, t, v);
	},
	y = [];
function b(t, r, n) {
	var o = S(t, r, n);
	return e.__c && e.__c(t, y), o;
}
function S(n, o, i, a, u, v) {
	if (null == n || 'boolean' == typeof n) return '';
	Array.isArray(n) && (n = t(r, null, n));
	var x = n.type,
		y = n.props,
		b = !1;
	o = o || {};
	var w,
		k = (i = i || {}).pretty,
		O = k && 'string' == typeof k ? k : '\t';
	if ('object' != typeof n && !x) return l(n);
	if ('function' == typeof x) {
		if (((b = !0), !i.shallow || (!a && !1 !== i.renderRootComponent))) {
			if (x === r) {
				var C = '',
					A = [];
				_(A, n.props.children);
				for (var H = 0; H < A.length; H++)
					C +=
						(H > 0 && k ? '\n' : '') +
						S(A[H], o, i, !1 !== i.shallowHighOrder, u, v);
				return C;
			}
			var j,
				F = (n.__c = {
					__v: n,
					context: o,
					props: n.props,
					setState: m,
					forceUpdate: m,
					__h: []
				});
			if (
				(e.__b && e.__b(n),
				e.__r && e.__r(n),
				x.prototype && 'function' == typeof x.prototype.render)
			) {
				var M = x.contextType,
					T = M && o[M.__c],
					$ = null != M ? (T ? T.props.value : M.__) : o;
				((F = n.__c = new x(y, $)).__v = n),
					(F._dirty = F.__d = !0),
					(F.props = y),
					null == F.state && (F.state = {}),
					null == F._nextState &&
						null == F.__s &&
						(F._nextState = F.__s = F.state),
					(F.context = $),
					x.getDerivedStateFromProps
						? (F.state = p(
								p({}, F.state),
								x.getDerivedStateFromProps(F.props, F.state)
						  ))
						: F.componentWillMount &&
						  (F.componentWillMount(),
						  (F.state =
								F._nextState !== F.state
									? F._nextState
									: F.__s !== F.state
									? F.__s
									: F.state)),
					(j = F.render(F.props, F.state, F.context));
			} else {
				var L = x.contextType,
					E = L && o[L.__c];
				j = x.call(n.__c, y, null != L ? (E ? E.props.value : L.__) : o);
			}
			return (
				F.getChildContext && (o = p(p({}, o), F.getChildContext())),
				e.diffed && e.diffed(n),
				S(j, o, i, !1 !== i.shallowHighOrder, u, v)
			);
		}
		x =
			(w = x).displayName ||
			(w !== Function && w.name) ||
			(function (e) {
				var t = (Function.prototype.toString
					.call(e)
					.match(/^\s*function\s+([^( ]+)/) || '')[1];
				if (!t) {
					for (var r = -1, n = d.length; n--; )
						if (d[n] === e) {
							r = n;
							break;
						}
					r < 0 && (r = d.push(e) - 1), (t = 'UnnamedComponent' + r);
				}
				return t;
			})(w);
	}
	var D,
		N,
		P = '';
	if (y) {
		var R = Object.keys(y);
		i && !0 === i.sortAttributes && R.sort();
		for (var U = 0; U < R.length; U++) {
			var W = R[U],
				q = y[W];
			if ('children' !== W) {
				if (
					!W.match(/[\s\n\\/='"\0<>]/) &&
					((i && i.allAttributes) ||
						('key' !== W &&
							'ref' !== W &&
							'__self' !== W &&
							'__source' !== W &&
							'defaultValue' !== W))
				) {
					if ('className' === W) {
						if (y.class) continue;
						W = 'class';
					} else
						u &&
							W.match(/^xlink:?./) &&
							(W = W.toLowerCase().replace(/^xlink:?/, 'xlink:'));
					if ('htmlFor' === W) {
						if (y.for) continue;
						W = 'for';
					}
					'style' === W && q && 'object' == typeof q && (q = c(q)),
						'a' === W[0] &&
							'r' === W[1] &&
							'boolean' == typeof q &&
							(q = String(q));
					var z = i.attributeHook && i.attributeHook(W, q, o, i, b);
					if (z || '' === z) P += z;
					else if ('dangerouslySetInnerHTML' === W) N = q && q.__html;
					else if ('textarea' === x && 'value' === W) D = q;
					else if ((q || 0 === q || '' === q) && 'function' != typeof q) {
						if (!((!0 !== q && '' !== q) || ((q = W), i && i.xml))) {
							P += ' ' + W;
							continue;
						}
						if ('value' === W) {
							if ('select' === x) {
								v = q;
								continue;
							}
							'option' === x && v == q && (P += ' selected');
						}
						P += ' ' + W + '="' + l(q) + '"';
					}
				}
			} else D = q;
		}
	}
	if (k) {
		var I = P.replace(/^\n\s*/, ' ');
		I === P || ~I.indexOf('\n')
			? k && ~P.indexOf('\n') && (P += '\n')
			: (P = I);
	}
	if (((P = '<' + x + P + '>'), h.test(String(x))))
		throw new Error(x + ' is not a valid HTML tag name in ' + P);
	var V,
		Z = g.test(String(x)) || (i.voidElements && i.voidElements.test(String(x))),
		B = [];
	if (N) k && f(N) && (N = '\n' + O + s(N, O)), (P += N);
	else if (null != D && _((V = []), D).length) {
		for (var G = k && ~P.indexOf('\n'), J = !1, K = 0; K < V.length; K++) {
			var Q = V[K];
			if (null != Q && !1 !== Q) {
				var X = S(Q, o, i, !0, 'svg' === x || ('foreignObject' !== x && u), v);
				if ((k && !G && f(X) && (G = !0), X))
					if (k) {
						var Y = X.length > 0 && '<' != X[0];
						J && Y ? (B[B.length - 1] += X) : B.push(X), (J = Y);
					} else B.push(X);
			}
		}
		if (k && G) for (var ee = B.length; ee--; ) B[ee] = '\n' + O + s(B[ee], O);
	}
	if (B.length || N) P += B.join('');
	else if (i && i.xml) return P.substring(0, P.length - 1) + ' />';
	return (
		!Z || V || N
			? (k && ~P.indexOf('\n') && (P += '\n'), (P += '</' + x + '>'))
			: (P = P.replace(/>$/, ' />')),
		P
	);
}
b.shallowRender = x;
export default b;
export {
	b as render,
	b as renderToStaticMarkup,
	b as renderToString,
	x as shallowRender
};
