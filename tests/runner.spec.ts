/*
 * @poppinss/middleware
 *
 * (c) Poppinss
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { Runner } from '../src/runner.js'
import type { NextFn } from '../src/types.js'

function sleep(timeout: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, timeout)
  })
}

test.group('Runner', () => {
  test('compose a middleware chain that can be executed in sequence', async ({ assert }) => {
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      return next()
    }

    async function second(_: any, next: NextFn) {
      chain.push('second')
      await next()
    }

    async function third(_: any, next: NextFn) {
      chain.push('third')
      await next()
    }

    const runner = new Runner([first, second, third])

    await runner.run((fn, next) => fn({}, next))
    assert.deepEqual(chain, ['first', 'second', 'third'])
  })

  test('execute in sequence even when some methods are async', async ({ assert }) => {
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      await next()
    }

    async function second(_: any, next: NextFn) {
      await sleep(100)
      chain.push('second')
      await next()
    }

    async function third(_: any, next: NextFn) {
      chain.push('third')
      await next()
    }

    const runner = new Runner([first, second, third])

    await runner.run((fn, next) => fn({}, next))
    assert.deepEqual(chain, ['first', 'second', 'third'])
  })

  test('stop middleware chain when a method throws exception', async ({ assert }) => {
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      await next()
    }

    async function second() {
      throw new Error('I am killed')
    }

    async function third(_: any, next: NextFn) {
      chain.push('third')
      await next()
    }

    const runner = new Runner([first, second, third])

    await assert.rejects(() => runner.run((fn, next) => fn({}, next)), 'I am killed')
    assert.deepEqual(chain, ['first'])
  })

  test('define middleware as object', async ({ assert }) => {
    const chain: any[] = []

    async function first(this: any, _: any, next: NextFn) {
      chain.push(this)
      await next()
    }

    async function second(this: any, _: any, next: NextFn) {
      chain.push(this)
      await next()
    }

    async function third(this: any, _: any, next: NextFn) {
      chain.push(this)
      await next()
    }

    class Foo {}
    const runner = new Runner<{ handle(ctx: any, next: NextFn): void }>([
      {
        handle: (context, next) => {
          return first(context, next)
        },
      },
      {
        handle: (context, next) => {
          const foo = new Foo()
          return second.bind(foo)(context, next)
        },
      },
      {
        handle: (context, next) => {
          return third(context, next)
        },
      },
    ])

    await runner.run(async (fn, next) => fn.handle({}, next))
    assert.equal(chain[0], null)
    assert.instanceOf(chain[1], Foo)
    assert.equal(chain[0], null)
  })

  test('pass context to all the middleware functions', async ({ assert }) => {
    const request = {
      first: false,
      second: false,
      third: false,
    }

    async function first(context: typeof request, next: NextFn) {
      context.first = true
      await next()
    }

    async function second(context: typeof request, next: NextFn) {
      context.second = true
      await next()
    }

    async function third(context: typeof request, next: NextFn) {
      context.third = true
      await next()
    }

    const runner = new Runner([first, second, third])
    await runner.run((fn, next) => fn(request, next))
    assert.deepEqual(request, { first: true, second: true, third: true })
  })

  test('ignore multiple calls to next', async ({ assert }) => {
    assert.plan(1)
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      await next()
    }

    async function second(_: any, next: NextFn) {
      chain.push('second')
      await next()
      await next()
    }

    async function third(_: any) {
      chain.push('third')
    }

    async function fourth(_: any) {
      chain.push('fourth')
    }

    const runner = new Runner([first, second, third, fourth])

    await runner.run((fn, next) => fn({}, next))
    assert.deepEqual(chain, ['first', 'second', 'third'])
  })

  test('params should not collide with each other', async ({ assert }) => {
    async function first(request: any, next: NextFn) {
      request.count++
      await next()
    }

    async function second(request: any, next: NextFn) {
      request.count++
      await sleep(500)
      await next()
    }

    async function third(request: any, next: NextFn) {
      request.count++
      await next()
    }

    const runner = new Runner([first, second, third])
    const runner2 = new Runner([first, second, third])

    const request = { count: 0 }
    const otherRequest = { count: 0 }

    await Promise.all([
      await runner.run((fn, next) => fn(request, next)),
      await runner2.run((fn, next) => fn(otherRequest, next)),
    ])

    assert.equal(request.count, 3)
    assert.equal(otherRequest.count, 3)
  })

  test('run fine when methods are not async and neither returns promise', async ({ assert }) => {
    assert.plan(1)
    const chain: string[] = []

    function first() {
      chain.push('first')
    }

    const runner = new Runner([first])

    await runner.run(async (fn) => fn())
    assert.deepEqual(chain, ['first'])
  })

  test('execute middleware in reverse after execution', async ({ assert }) => {
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      await next()
      chain.push('first after')
    }

    async function second(_: any, next: NextFn) {
      chain.push('second')
      await sleep(200)
      await next()
      chain.push('second after')
    }

    async function third(_: any, next: NextFn) {
      chain.push('third')
      await next()
      chain.push('third after')
    }

    const runner = new Runner([first, second, third])

    await runner.run((fn, next) => fn({}, next))
    assert.deepEqual(chain, [
      'first',
      'second',
      'third',
      'third after',
      'second after',
      'first after',
    ])
  })

  test('execute middleware in reverse even when they have delays', async ({ assert }) => {
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      await next()
      chain.push('first after')
    }

    async function second(_: any, next: NextFn) {
      chain.push('second')
      await sleep(200)
      await next()
      await sleep(100)
      chain.push('second after')
    }

    async function third(_: any, next: NextFn) {
      chain.push('third')
      await next()
      await sleep(200)
      chain.push('third after')
    }

    const runner = new Runner([first, second, third])

    await runner.run((fn, next) => fn({}, next))
    assert.deepEqual(chain, [
      'first',
      'second',
      'third',
      'third after',
      'second after',
      'first after',
    ])
  })

  test('execute middleware in reverse when exceptions are catched', async ({ assert }) => {
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      try {
        await next()
      } finally {
        chain.push('first after')
      }
    }

    async function second(_: any, next: NextFn) {
      chain.push('second')
      await sleep(200)
      await next()
      await sleep(100)
      chain.push('second after')
    }

    async function third() {
      throw new Error('Something went wrong')
    }

    const runner = new Runner([first, second, third])

    await assert.rejects(() => runner.run((fn, next) => fn({}, next)), 'Something went wrong')
    assert.deepEqual(chain, ['first', 'second', 'first after'])
  })

  test('report error thrown inside syncrohonous functions', async ({ assert }) => {
    const runner = new Runner([
      function fn() {
        throw new Error('Something went wrong')
      },
    ])

    await assert.rejects(() => runner.run((fn) => fn()), 'Something went wrong')
  })

  test('define final handler to be executed after chain', async ({ assert }) => {
    const stack: any[] = []

    const runner = new Runner<(_: any, next: NextFn) => void>([
      function fn(ctx, next) {
        stack.push(ctx)
        return next()
      },
    ])

    async function finalHandler(ctx: any) {
      stack.push(ctx)
    }

    runner.finalHandler(() => finalHandler('foo'))
    await runner.run(async (fn, next) => fn('foo', next))

    assert.deepEqual(stack, ['foo', 'foo'])
  })

  test('do not call final handler when next is not called', async ({ assert }) => {
    const stack: any[] = []

    const runner = new Runner<(_: any, next: NextFn) => void>([
      function fn(ctx) {
        stack.push(ctx)
      },
    ])

    async function finalHandler(ctx: any) {
      stack.push(ctx)
    }

    runner.finalHandler(() => finalHandler('bar'))
    await runner.run(async (fn, next) => fn('bar', next))

    assert.deepEqual(stack, ['bar'])
  })

  test('do not call final handler when middleware raises exception', async ({ assert }) => {
    assert.plan(2)
    const stack: any[] = []

    const runner = new Runner<(_: any, next: NextFn) => void>([
      function fn(ctx) {
        stack.push(ctx)
        throw new Error('Failed')
      },
    ])

    async function finalHandler(ctx: any) {
      stack.push(ctx)
    }

    runner.finalHandler(() => finalHandler('bar'))

    await assert.rejects(() => runner.run(async (fn, next) => fn('bar', next)), 'Failed')
    assert.deepEqual(stack, ['bar'])
  })

  test('hand over exception a custom exception handler', async ({ assert }) => {
    assert.plan(2)
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      await next()
    }

    async function second() {
      throw new Error('I am killed')
    }

    async function third(_: any, next: NextFn) {
      chain.push('third')
      await next()
    }

    const runner = new Runner([first, second, third])
    runner.errorHandler(async (error) => {
      assert.equal(error.message, 'I am killed')
    })

    await runner.run((fn, next) => fn({}, next))
    assert.deepEqual(chain, ['first'])
  })

  test('execute middleware in reverse when error handler is defined', async ({ assert }) => {
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      await next()
      chain.push('first after')
    }

    async function second(_: any, next: NextFn) {
      chain.push('second')
      await sleep(200)
      await next()
      await sleep(100)
      chain.push('second after')
    }

    async function third() {
      throw new Error('Something went wrong')
    }

    const runner = new Runner([first, second, third])
    runner.errorHandler(async () => {})

    await runner.run((fn, next) => fn({}, next))
    assert.deepEqual(chain, ['first', 'second', 'second after', 'first after'])
  })

  test('return error handler response via next method', async ({ assert }) => {
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      const response = await next()
      chain.push('first after')

      return response
    }

    async function second(_: any, next: NextFn) {
      chain.push('second')
      await sleep(200)
      const response = await next()
      await sleep(100)
      chain.push('second after')

      return response
    }

    async function third() {
      throw new Error('Something went wrong')
    }

    async function fourth() {
      chain.push('fourth')
    }

    const runner = new Runner([first, second, third, fourth])
    runner.errorHandler(async () => {
      return 'handled'
    })
    runner.finalHandler(async () => {
      chain.push('final handler')
    })

    const response = await runner.run((fn, next) => fn({}, next))
    assert.equal(response, 'handled')
    assert.deepEqual(chain, ['first', 'second', 'second after', 'first after'])
  })

  test('raise exception thrown by error handler', async ({ assert }) => {
    const chain: string[] = []

    async function first(_: any, next: NextFn) {
      chain.push('first')
      const response = await next()
      chain.push('first after')

      return response
    }

    async function second(_: any, next: NextFn) {
      chain.push('second')
      await sleep(200)
      const response = await next()
      await sleep(100)
      chain.push('second after')

      return response
    }

    async function third() {
      throw new Error('Something went wrong')
    }

    async function fourth() {
      chain.push('fourth')
    }

    const runner = new Runner([first, second, third, fourth])
    runner.errorHandler(async (error) => {
      throw error
    })
    runner.finalHandler(async () => {
      chain.push('final handler')
    })

    await assert.rejects(() => runner.run((fn, next) => fn({}, next)), 'Something went wrong')
    assert.deepEqual(chain, ['first', 'second'])
  })
})
