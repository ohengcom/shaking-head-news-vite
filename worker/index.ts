interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{
          response(): Response
        }>
      }
    }
  }
}

type AppHandler = {
  fetch(request: Request): Promise<Response>
}

type HandleImageOptimization =
  (typeof import('vinext/server/image-optimization'))['handleImageOptimization']

let appHandlerPromise: Promise<AppHandler> | null = null
let imageOptimizationPromise: Promise<HandleImageOptimization> | null = null

async function getAppHandler(): Promise<AppHandler> {
  if (!appHandlerPromise) {
    appHandlerPromise = import('vinext/server/app-router-entry').then((module) => {
      const handler = (module as { default?: AppHandler }).default
      if (!handler || typeof handler.fetch !== 'function') {
        throw new Error('Invalid vinext app handler export')
      }
      return handler
    })
  }

  return appHandlerPromise
}

async function getImageOptimizationHandler(): Promise<HandleImageOptimization> {
  if (!imageOptimizationPromise) {
    imageOptimizationPromise = import('vinext/server/image-optimization').then((module) => {
      if (typeof module.handleImageOptimization !== 'function') {
        throw new Error('Invalid image optimization handler export')
      }
      return module.handleImageOptimization
    })
  }

  return imageOptimizationPromise
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`
  }
  return String(error)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url)

      if (url.pathname === '/_vinext/image') {
        const handleImageOptimization = await getImageOptimizationHandler()
        return await handleImageOptimization(request, {
          fetchAsset: (assetPath) => env.ASSETS.fetch(new Request(new URL(assetPath, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality })
            return result.response()
          },
        })
      }

      const appHandler = await getAppHandler()
      return await appHandler.fetch(request)
    } catch (error) {
      const message = toErrorMessage(error)
      console.error('Worker request failed', message)
      return new Response(`Worker runtime error\n${message}`, {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }
  },
}
