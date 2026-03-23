import { Suspense, lazy, type ComponentType } from 'react'

interface DynamicOptions {
  loading?: ComponentType
  ssr?: boolean
}

export default function dynamic<TProps extends object>(
  loader: () => Promise<{ default: ComponentType<TProps> } | ComponentType<TProps>>,
  options: DynamicOptions = {}
) {
  const LazyComponent = lazy(async () => {
    const module = await loader()
    return 'default' in module ? module : { default: module }
  })

  const LoadingComponent = options.loading

  return function DynamicComponent(props: TProps) {
    return (
      <Suspense fallback={LoadingComponent ? <LoadingComponent /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}
