import {
  useLocation,
  useNavigate,
  useSearchParams as useReactRouterSearchParams,
} from 'react-router-dom'

export function useRouter() {
  const navigate = useNavigate()

  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    refresh: () => window.location.reload(),
    back: () => navigate(-1),
    forward: () => navigate(1),
    prefetch: async () => {},
  }
}

export function usePathname() {
  return useLocation().pathname
}

export function useSearchParams() {
  const [params] = useReactRouterSearchParams()
  return params
}

export function redirect(href: string): never {
  if (typeof window !== 'undefined') {
    window.location.assign(href)
  }

  throw new Error(`Redirected to ${href}`)
}

export function notFound(): never {
  if (typeof window !== 'undefined') {
    window.location.assign('/404')
  }

  throw new Error('Not found')
}
