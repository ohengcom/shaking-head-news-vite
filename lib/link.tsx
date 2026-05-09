import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { Link as RouterLink } from 'react-router-dom'

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  replace?: boolean
}

function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, replace, children, ...props },
  ref
) {
  if (isExternalHref(href)) {
    return (
      <a ref={ref} href={href} {...props}>
        {children}
      </a>
    )
  }

  return (
    <RouterLink ref={ref} to={href} replace={replace} {...props}>
      {children}
    </RouterLink>
  )
})

export default Link
