# Pagination

Paginate model queries with total counts and page metadata:

```typescript
// Shorthand
const page = await User.paginate(15, 2);

// Model query
const users = await User.query().orderBy('id').paginateModels(15, 2);

// From request query string (?page=3&per_page=25)
const users = await User.query()
  .orderBy('id')
  .paginateModels(request.perPage(), request.page());

return UserResource.collection(users);
```

`LengthAwarePaginator#toArray()` returns:

```json
{
  "data": [],
  "currentPage": 1,
  "perPage": 15,
  "total": 42,
  "lastPage": 3,
  "from": 1,
  "to": 15
}
```