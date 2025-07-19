---
title: "Effectifying a Fastify tRPC server"
description: "Step by step guide on how to add effect to an existing Fastify tRPC server"
date: "Jul 18 2025"
---

# Integrating Effect with Fastify and tRPC: A Type-Safe Journey

Recently, we embarked on a mission to integrate [Effect](https://effect.website/) into our Fastify server that uses tRPC for API endpoints. Effect is a powerful functional programming library for TypeScript that provides composable, type-safe error handling and dependency injection. Here's how we successfully "effectified" our entire server stack.

## Why Effect?

Before diving into the implementation, let's understand why we chose Effect:

- **Type-safe error handling**: Effect makes errors first-class citizens in the type system
- **Dependency injection**: Clean, composable dependency injection without the ceremony
- **Composability**: Effects can be easily composed, transformed, and chained
- **Resource management**: Built-in support for resource acquisition and cleanup

## Building Effect-Based Services

The foundation of our Effect integration started with converting our services to use Effect's service pattern. Here's how we transformed our database services:

### TransactionService with Effect

```typescript
export class TransactionService extends Effect.Service<TransactionService>()('TransactionService', {
  effect: Effect.gen(function* () {
    const { query } = yield* Database

    const getTransactions = (addressId: string) =>
      query((db) =>
        db.select().from(schema.transactions).where(eq(schema.transactions.addressId, addressId))
      )

    return { getTransactions } as const
  }),
  dependencies: [Database.Default],
}) {}
```

### AddressService with Effect

```typescript
export class AddressService extends Effect.Service<AddressService>()('AddressService', {
  effect: Effect.gen(function* () {
    const { query } = yield* Database

    const getAddress = (address: string) =>
      Effect.gen(function* () {
        const rows = yield* query((db) =>
          db
            .select({ id: schema.addresses.id })
            .from(schema.addresses)
            .where(eq(schema.addresses.address, address))
        )
        return rows[0]
      })

    return { getAddress } as const
  }),
  dependencies: [Database.Default],
}) {}
```

Key patterns we established:

1. **Effect.Service**: Each service extends `Effect.Service` with a unique identifier
2. **Effect.gen**: We use generator functions for composable, imperative-style code
3. **Dependency injection**: Services declare their dependencies explicitly
4. **Yield syntax**: The `yield*` operator unwraps Effect values

## Creating Effect-Based tRPC Procedures

The next challenge was integrating Effect with tRPC procedures. Here's our approach:

```typescript
const listTransactionsEffect = () =>
  Effect.gen(function* () {
    const transactionService = yield* TransactionService
    const addressService = yield* AddressService

    const input = '0x375C2ae616b111a760D0EaaDF98D4Ea94612f323'
    
    const address = yield* addressService.getAddress(input)

    if (!address) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Address for guest session not found',
      })
    }

    return yield* transactionService.getTransactions(address.id)
  }).pipe(Effect.provide([AddressService.Default, TransactionService.Default]))

export const transactionRouter = router({
  list: publicProcedure.query(() => Effect.runPromise(listTransactionsEffect())),
})
```

The key insight here is using `Effect.runPromise` to bridge Effect computations with tRPC's Promise-based API. This allows us to:

- Compose multiple services declaratively
- Handle errors in a type-safe manner
- Provide dependencies explicitly
- Maintain the functional programming paradigm

## Effectifying Fastify Integration

The most complex part was creating an Effect-based Fastify tRPC plugin. We built a custom plugin that handles tRPC requests using Effect:

### FastifyTrpcPlugin

```typescript
export class FastifyTrpcPlugin extends Effect.Service<FastifyTrpcPlugin>()('FastifyTrpcPlugin', {
  effect: Effect.gen(function* () {
    const { addAllRoute } = yield* FastifyRoute
    const fastifyInstance = yield* EffectfulFastifyInstance

    const registerTRPCPlugin = <TRouter extends AnyRouter>(
      options: EffectTRPCPluginOptions<TRouter>
    ) =>
      Effect.gen(function* () {
        // Configure content type parser for tRPC
        yield* Effect.sync(() => {
          fastifyInstance.removeContentTypeParser('application/json')
          fastifyInstance.addContentTypeParser(
            'application/json',
            { parseAs: 'string' },
            (_, body, done) => {
              done(null, body)
            }
          )
        })

        // Use addAllRoute to handle all HTTP methods
        yield* addAllRoute(`${options.prefix ?? ''}/:path`, (req, res) =>
          Effect.gen(function* () {
            const params = req.params as Record<'path', string>
            const path = params.path
            yield* effectTrpcRequestHandler({
              ...options.trpcOptions,
              req,
              res,
              path,
            })
          })
        )
      })

    return { registerTRPCPlugin } as const
  }),
}) {}
```

### Custom tRPC Request Handler

We created an effectful version of the tRPC request handler that bridges Effect with tRPC's internal APIs:

```typescript
export const effectTrpcRequestHandler = <
  TRouter extends AnyRouter,
  TRequest extends FastifyRequest,
  TResponse extends FastifyReply,
>(
  opts: FastifyTrpcHandlerOptions<TRouter, TRequest, TResponse> & {
    req: TRequest
    res: TResponse
    path: string
  }
) =>
  Effect.gen(function* () {
    const incomingMessage: NodeHTTPRequest = opts.req.raw

    // Handle request body
    if ('body' in opts.req) {
      incomingMessage.body = opts.req.body
    }

    const req = incomingMessageToRequest(incomingMessage, opts.res.raw, {
      maxBodySize: null,
    })

    // Create context function that bridges Effect and Promise
    const createContext = async (innerOpts: { info: TRPCRequestInfo }) => {
      if (opts.createContext) {
        const contextOptions = {
          req: opts.req,
          res: opts.res,
          info: innerOpts.info,
        }
        const effectContext = opts.createContext(contextOptions)
        return await Effect.runPromise(effectContext)
      }
      return undefined
    }

    // Process the tRPC request
    const res = yield* Effect.promise(() =>
      resolveResponse({
        ...opts,
        req,
        error: null,
        createContext,
        onError(o) {
          opts?.onError?.({
            ...o,
            req: opts.req,
          })
        },
      })
    )

    // Set response headers and send body
    yield* Effect.sync(() => {
      opts.res.status(res.status)
      for (const [key, value] of res.headers.entries()) {
        opts.res.header(key, value)
      }
    })

    if (res.body) {
      yield* Effect.promise(async () => {
        const responseText = await new Response(res.body).text()
        opts.res.send(responseText)
      })
    }
  })
```

## Integrating with Drizzle ORM

Our database integration uses Drizzle ORM within Effect contexts. Here's how we structured our database service:

```typescript
export class Database extends Effect.Service<Database>()('Database', {
  effect: Effect.gen(function* () {
    const query = <T>(queryFn: (db: DrizzleDB) => T) =>
      Effect.gen(function* () {
        // Execute query with error handling
        return yield* Effect.try({
          try: () => queryFn(db),
          catch: (error) => new Error(`Database query failed: ${error}`),
        })
      })

    return { query } as const
  }),
}) {}
```

This pattern allows us to:
- Wrap database operations in Effect contexts
- Handle database errors in a type-safe way
- Compose database operations with other effects
- Maintain transactional boundaries when needed

## Server Composition with Effect

Finally, we composed everything together in our main server setup:

```typescript
export class FastifyApp extends Effect.Service<FastifyApp>()('FastifyApp', {
  scoped: Effect.gen(function* () {
    const server = yield* EffectfulFastifyInstance

    // Register routes through Effect services
    yield* AuthRouter
    yield* TrpcRouter

    // Configure middleware
    server.register(cors, {
      origin: env.ENVIRONMENT === 'development' ? 'http://localhost:3000' : env.FRONTEND_URL,
      credentials: true,
    })

    // Start server with proper cleanup
    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => server.listen({ port: 4000, host: '0.0.0.0' }),
        catch: (error) => new Error(`Failed to start server: ${error}`),
      }),
      () =>
        Effect.async<void>((resume) => {
          server.close(() => resume(Effect.void))
        })
    )

    return { server }
  }),
}) {}
```

## Key Benefits We Achieved

1. **Type Safety**: Effect's type system catches errors at compile time
2. **Composability**: Services can be easily composed and tested in isolation
3. **Dependency Injection**: Clean, explicit dependency management
4. **Error Handling**: Structured error handling throughout the application
5. **Resource Management**: Automatic cleanup of resources like database connections

## Lessons Learned

1. **Start Small**: Begin with leaf services and work your way up
2. **Bridge Carefully**: Use `Effect.runPromise` judiciously to bridge Effect and Promise worlds
3. **Embrace Generators**: The `Effect.gen` syntax makes asynchronous code readable
4. **Test Services**: Effect services are highly testable due to dependency injection
5. **Document Dependencies**: Make service dependencies explicit and well-documented

## Conclusion

Integrating Effect with Fastify and tRPC required careful consideration of how to bridge different paradigms, but the result is a robust, type-safe server architecture. The combination of Effect's functional programming principles with tRPC's type safety and Fastify's performance creates a powerful foundation for building scalable applications.

The key to success was building incrementally, starting with services and working up to the full integration. While there's a learning curve, the benefits of type safety, composability, and structured error handling make it worthwhile for complex applications.

If you're considering a similar integration, start with your data layer services and gradually work your way up to the HTTP handling layer. The investment in Effect's paradigm pays dividends in maintainability and reliability.