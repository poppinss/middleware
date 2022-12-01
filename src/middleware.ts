/*
 * @poppinss/middleware
 *
 * (c) Poppinss
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Runner } from './runner.js'

/**
 * The middleware class implements the chain of responsibility design pattern
 * and allows executing handlers in series.
 */
export class Middleware<MiddlewareFn extends any> {
  #middleware: Set<MiddlewareFn> = new Set()
  #middlewareArray?: MiddlewareFn[]
  #isFrozen: boolean = false

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
  has(handler: MiddlewareFn): boolean {
    return this.#middleware.has(handler)
  }

  /**
   * Add a middleware. Adding the same middleware
   * twice will result in a noop.
   */
  add(handler: MiddlewareFn): this {
    if (this.#isFrozen) {
      throw new Error('Middleware stack is frozen. Cannot add new middleware')
    }

    this.#middleware.add(handler)
    return this
  }

  /**
   * Remove a specific middleware
   */
  remove(handler: MiddlewareFn): boolean {
    if (this.#isFrozen) {
      throw new Error('Middleware stack is frozen. Cannot remove middleware')
    }

    return this.#middleware.delete(handler)
  }

  /**
   * Remove all middleware
   */
  clear(): void {
    if (this.#isFrozen) {
      throw new Error('Middleware stack is frozen. Cannot clear middleware')
    }

    this.#middleware.clear()
  }

  /**
   * Merge middleware from a existing middleware
   * instance. The merged middleware are
   * appended
   */
  merge(hooks: Middleware<MiddlewareFn>) {
    if (this.#isFrozen) {
      throw new Error('Middleware stack is frozen. Cannot merge middleware')
    }

    hooks.all().forEach((handler) => {
      this.add(handler)
    })
  }

  /**
   * Freezes the middleware stack for further modifications
   */
  freeze() {
    if (this.#isFrozen) {
      return
    }

    this.#isFrozen = true
    this.#middlewareArray = [...this.all()]
  }

  /**
   * Returns an instance of the runner to run hooks
   */
  runner(): Runner<MiddlewareFn> {
    this.freeze()
    return new Runner(this.#middlewareArray!)
  }
}
