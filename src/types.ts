/*
 * @poppinss/middleware
 *
 * (c) Poppinss
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

export type NextFn = () => Promise<void> | void

/**
 * Final handler is called when the entire chain has been
 * executed successfully.
 */
export type FinalHandler = () => Promise<void> | void

/**
 * The executor function that invokes the middleware
 */
export type Executor<MiddlewareFn extends any> = (middleware: MiddlewareFn, next: NextFn) => any
