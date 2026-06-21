# Controllers & middleware

## Controllers

Point routes at controller classes. Tyravel resolves controllers through the container:

```typescript
Route.get('/users', [UserController, 'index']);
Route.post('/users', [UserController, 'store', StoreUserRequest]);
```

```typescript
export class UserController {
  index() {
    return UserResource.collection(await User.all());
  }

  store(form: StoreUserRequest) {
    const { email, name } = form.validated();
    // ...
  }
}
```

Bind controllers in `AppServiceProvider` when they need dependencies:

```typescript
this.app.bind(UserController, () => new UserController(this.app));
```

## Custom middleware

Middleware receives `(request, next)` and may short-circuit with a response:

```typescript
app.middleware('json', async (_request, next) => {
  const response = await next();
  response.headers.set('x-tyravel-api', '1');
  return response;
});
```

Return a `Response` instead of calling `next()` to stop the pipeline.

## HTTP responses

```typescript
Response.json({ ok: true });
Response.html('<h1>Hello</h1>');
Response.text('plain');
Response.xml(feedXml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
Response.make(body, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
Response.redirect('/login');
Response.noContent();
```