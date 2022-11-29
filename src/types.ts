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
 * Type for the middleware inline closure
 */
export type MiddlewareHandler<Args extends any[]> = (
  ...args: [...Args, NextFn]
) => Promise<void> | void

/**
 * Type of the object based middleware handler
 */
export type MiddlewareProviderHandler<Args extends any[]> = {
  name: string
  handle(...args: [...Args, NextFn]): Promise<void> | void
}

/**
 * Final handler is called when the entire chain has been
 * executed successfully.
 */
export type FinalHandler<Args extends any[]> = (...args: Args) => Promise<void> | void
