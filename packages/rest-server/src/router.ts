export type RouteHandler<A> = (args: A) => PromiseLike<any> | any

export type RouteErrorHandler<A> = (
  args: Parameters<RouteHandler<A>>[0] & {
    error: Error
  }
) => PromiseLike<any> | any

/**
 * A generic router that matches over arbitrary routing criteria by comparing
 * JSON.stringify output. Routes can be added via matching criteria. A fallback
 * route for when no other routes match is required. A special "route" for handling
 * errors thrown by other routes can also optionally be provided.
 */
export class Router<MatchCriteria, A> {
  public routes: { [k: string]: RouteHandler<A> | undefined } = {}
  public errorHandler: RouteErrorHandler<A> | undefined

  constructor(public defaultHandler: RouteHandler<A>) {}

  /**
   * Specify an error handler that'll be run if any route handlers throw an error
   * @param fn
   */
  error(fn: RouteErrorHandler<A>) {
    this.errorHandler = fn
    return this
  }

  /**
   * Register a route with the given criteria (which will be JSON.stringified) to be
   * handled by the given function.
   * @param matchCriteria
   * @param fn
   */
  add(matchCriteria: MatchCriteria, fn: RouteHandler<A>) {
    this.routes[JSON.stringify(matchCriteria)] = fn
    return this
  }

  /**
   * Process a request by JSON.stringify-ing the values and trying to find a route handler
   * that's been registered to handle them. If none match, then use the fallback handler. If
   * an error is thrown, then the error handler will be called.
   * @param matchValues
   * @param args
   */
  async route(
    matchValues: MatchCriteria,
    args: A
  ): Promise<Router<MatchCriteria, A>> {
    try {
      const fn = this.routes[JSON.stringify(matchValues)]
      if (fn) {
        await fn(args)
        return this
      }
      await this.defaultHandler(args)
    } catch (error) {
      if (this.errorHandler) await this.errorHandler({ ...args, error })
      else throw error
    }
    return this
  }
}
