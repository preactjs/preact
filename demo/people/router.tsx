import { ComponentChild, ComponentFactory, createContext, FunctionalComponent, h, JSX } from "preact"
import { useCallback, useContext, useEffect, useMemo, useState } from "preact/hooks"

export type RouterData = {
  match: string[];
  path: string[];
  navigate(path: string): void;
}

const RouterContext = createContext<RouterData>({ match: [], path: [], navigate() {} })
export const useRouter = () => useContext(RouterContext)

const useLocation = (cb: () => void) => {
  useEffect(() => {
    window.addEventListener("popstate", cb)
    return () => {
      window.removeEventListener("popstate", cb)
    }
  }, [cb])
}

export const Router: FunctionalComponent = props => {
  const [path, setPath] = useState(location.pathname)

  const update = useCallback(() => {
    setPath(location.pathname)
  }, [setPath])

  useLocation(update)

  const navigate = useCallback(
    (path: string) => {
      history.pushState(null, "", path)
      update()
    },
    [update],
  )

  const router = useMemo<RouterData>(
    () => ({
      match: [],
      navigate,
      path: path.split("/").filter(Boolean),
    }),
    [navigate, path],
  )

  return <RouterContext.Provider children={props.children} value={router} />
}

export type RouteChildProps = { route: string }
export type RouteProps = {
  component?: ComponentFactory<RouteChildProps>;
  match: string;
  render?(route: string): ComponentChild;
}
export const Route: FunctionalComponent<RouteProps> = props => {
  const router = useRouter()
  const [dir, ...subpath] = router.path

  if (dir == null) return null
  if (props.match !== "*" && dir !== props.match) return null

  const children = useMemo(() => {
    if (props.component) return <props.component key={dir} route={dir} />
    if (props.render) return props.render(dir)
    return props.children
  }, [props.component, props.render, props.children, dir])

  const innerRouter = useMemo<RouterData>(
    () => ({
      ...router,
      match: [...router.match, dir],
      path: subpath,
    }),
    [router.match, dir, subpath.join("/")],
  )

  return <RouterContext.Provider children={children} value={innerRouter} />
}

export type LinkProps = JSX.HTMLAttributes & {
  active?: boolean | string;
}
export const Link: FunctionalComponent<LinkProps> = props => {
  const router = useRouter()

  const classProps = [props.class, props.className]
  const originalClasses = useMemo(() => {
    const classes = []
    for (const prop of classProps) if (prop) classes.push(...prop.split(/\s+/))
    return classes
  }, classProps)

  const activeClass = useMemo(() => {
    if (!props.active || props.href == null) return undefined
    const href = props.href.split("/").filter(Boolean)
    const path = props.href[0] === "/" ? [...router.match, ...router.path] : router.path
    const isMatch = href.every((dir, i) => dir === path[i])
    if (isMatch) return props.active === true ? "active" : props.active
  }, [originalClasses, props.active, props.href, router.match, router.path])

  const classes = activeClass == null ? originalClasses : [...originalClasses, activeClass]

  const getHref = useCallback(() => {
    if (props.href == null || props.href[0] === "/") return props.href
    const path = props.href.split("/").filter(Boolean)
    return "/" + [...router.match, ...path].join("/")
  }, [router.match, props.href])

  const handleClick = useCallback(
    (ev: MouseEvent) => {
      const href = getHref()
      if (props.onClick != null) props.onClick(ev)
      if (ev.defaultPrevented) return
      if (href == null) return
      if (ev.button !== 0) return
      if (props.target != null && props.target !== "_self") return
      if (ev.metaKey || ev.altKey || ev.ctrlKey || ev.shiftKey) return
      ev.preventDefault()
      router.navigate(href)
    },
    [getHref, router.navigate, props.onClick, props.target],
  )

  return <a {...props} class={classes.join(" ")} href={getHref()} onClick={handleClick} />
}
