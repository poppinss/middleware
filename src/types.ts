/*
 * @poppinss/middleware
 *
 * (c) Poppinss
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

export type NextFn = () => Promise<unknown> | unknown

/**
 * Final handler is called when the entire chain has been
 * executed successfully.
 */
export type FinalHandler = () => Promise<unknown>

/**
 * Error handler is called any method in the pipeline that raises
 * an exception
 */
export type ErrorHandler = (error: unknown) => Promise<unknown>

/**
 * The executor function that invokes the middleware
 */
export type Executor<MiddlewareFn extends unknown> = (
  middleware: MiddlewareFn,
  next: NextFn
) => Promise<unknown>
