/*
 * @poppinss/middleware
 *
 * (c) Poppinss
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Runner } from './runner.js'
import { MiddlewareHandler, MiddlewareProviderHandler } from './types.js'

/**
 * The middleware class implements the chain of responsibility design pattern
 * and allows executing handlers in series.
 */
export class Middleware<Args extends any[]> {
  #middleware: Set<MiddlewareHandler<Args> | MiddlewareProviderHandler<Args>> = new Set()

  /**
   * Get access to all the registered middleware. The return value is
   * a set of handlers.
   */
  all() {
    return this.#middleware
  }

  /**
   * Find if a handler has been registered as a middleware
   * already.
   */
  has(handler: MiddlewareHandler<Args> | MiddlewareProviderHandler<Args>): boolean {
    return this.#middleware.has(handler)
  }

  /**
   * Add a middleware. Adding the same middleware
   * twice will result in a noop.
   */
  add(handler: MiddlewareHandler<Args> | MiddlewareProviderHandler<Args>): this {
    this.#middleware.add(handler)
    return this
  }

  /**
   * Remove a specific middleware
   */
  remove(handler: MiddlewareHandler<Args> | MiddlewareProviderHandler<Args>): boolean {
    return this.#middleware.delete(handler)
  }

  /**
   * Remove all middleware
   */
  clear(): void {
    this.#middleware.clear()
  }

  /**
   * Merge middleware from a existing middleware
   * instance. The merged middleware are
   * appended
   */
  merge(hooks: Middleware<Args>) {
    hooks.all().forEach((handler) => {
      this.add(handler)
    })
  }

  /**
   * Returns an instance of the runner to run hooks
   */
  runner(): Runner<Args> {
    return new Runner([...this.all()])
  }
}
