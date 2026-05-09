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
