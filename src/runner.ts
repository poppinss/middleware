/*
 * @poppinss/middleware
 *
 * (c) Poppinss
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { debuglog } from 'node:util'
import type { ErrorHandler, Executor, FinalHandler } from './types.js'

const debug = debuglog('poppinss:middleware')

/**
 * Run a function only once. Tightly coupled with the Runner class
 */
function once(scope: Runner<any>, callback: (scope: Runner<any>) => Promise<void> | void) {
  function next(): Promise<void> | void {
    if (next.called) {
      return
    }

    next.called = true
    debug('next invoked')
    return callback(scope)
  }
  next.called = false

  return next
}

/**
 * Default final handler resolves the middleware chain right away
 */
const DEFAULT_FINAL_HANDLER = () => Promise.resolve()

/**
 * Runnable to execute an array of functions in sequence. The queue is
 * advanced only when the current function calls `next`.
 *
 * ```js
 * const runner = new Runnable([async function fn1 (params, next) {
 * }])
 * ```
 */
export class Runner<MiddlewareFn extends any> {
  /**
   * An array of middleware to execute
   */
  #middleware: MiddlewareFn[]

  /**
   * The active index for the middleware handler
   */
  #currentIndex = 0

  /**
   * Executor is responsible for executing a middleware
   */
  #executor!: Executor<MiddlewareFn>

  /**
   * Final handler to execute
   */
  #finalHandler: FinalHandler = DEFAULT_FINAL_HANDLER

  /**
   * Error handler to self handle errors
   */
  #errorHandler?: ErrorHandler

  constructor(middleware: MiddlewareFn[]) {
    this.#middleware = middleware
  }

  /**
   * Invoke one middleware at a time. Middleware fns will be executed
   * recursively until `next` is invoked.
   *
   * If one method doesn't call `next`, then the chain will be finished
   * automatically.
   */
  #invoke(self: Runner<MiddlewareFn>): Promise<void> | void {
    const middleware = self.#middleware[self.#currentIndex++]
    debug('running middleware at index', self.#currentIndex)

    /**
     * Empty stack
     */
    if (!middleware) {
      return self.#finalHandler()
    }

    return self.#executor(middleware, once(self, self.#invoke))
  }

  /**
   * Same as invoke, but captures errors
   */
  #invokeWithErrorManagement(self: Runner<MiddlewareFn>): Promise<void> | void {
    const middleware = self.#middleware[self.#currentIndex++]
    debug('running middleware at index', self.#currentIndex)

    /**
     * Empty stack
     */
    if (!middleware) {
      return self.#finalHandler().catch(self.#errorHandler)
    }

    return self
      .#executor(middleware, once(self, self.#invokeWithErrorManagement))
      .catch(self.#errorHandler)
  }

  /**
   * Final handler to be executed, when the chain ends successfully.
   */
  finalHandler(finalHandler: FinalHandler): this {
    this.#finalHandler = finalHandler
    return this
  }

  /**
   * Specify a custom error handler to use. Defining an error handler
   * turns will make run method not throw an exception and instead
   * run the upstream middleware logic
   */
  errorHandler(errorHandler: ErrorHandler): this {
    this.#errorHandler = errorHandler
    return this
  }

  /**
   * Start the middleware queue and pass params to it. The `params`
   * array will be passed as spread arguments.
   */
  async run(cb: Executor<MiddlewareFn>): Promise<void> {
    this.#executor = cb
    debug('starting middleware chain with %d middleware', this.#middleware.length)

    if (this.#errorHandler) {
      return this.#invokeWithErrorManagement(this)
    }

    return this.#invoke(this)
  }
}
