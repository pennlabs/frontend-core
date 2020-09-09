# REST Live Hooks

React hooks built to handle CRUD through RESTful APIs and realtime updates through websockets.

This package exposes two hooks, `useRealtimeResource` and `useRealtimeResourceList`. Both hooks
have identical semantics to the respective hooks found
in [`@pennlabs/rest-hooks`](https://github.com/pennlabs/frontend-core/tree/master/packages/rest-hooks),
with one important distinction. These realtime hooks enable realtime updates via subscriptions
based on the asynchronous websocket API defined by [`django-rest-live`](https://github.com/pennlabs/django-rest-live).

Because these hooks return the exact same values as the base `rest-hooks`, they can be used as drop-in replacements
when you want to add realtime features to your React/Django app.

## Documentation

### Prior Reading
This library relies heavily on [`django-rest-live`](https://github.com/pennlabs/django-rest-live/blob/master/README.md#usage)
and [`rest-hooks`](https://github.com/pennlabs/frontend-core/blob/master/packages/rest-hooks/README.md#documentation)
for its functionality. It would be helpful to read through the README documentation for each of
those libraries before moving on to this package.

### Usage
The realtime hooks differ from the base REST hooks mostly in a `subscribeRequest`
object that's added to every hook call. The object's structure is as follows:

```js
const subscribeRequest = {
  model: "app.Model",
  property: "id",
  value: 5
}
```
- `model` is a string label referring to the django model to subscribe to.
- `property` is the optional "group key" discussed in the [django-rest-live](https://github.com/pennlabs/django-rest-live/blob/master/README.md#subscribe-to-groups)
documentation. If it is not present, it defaults to the `id` field on the model, which is unique,
so no grouping will occur. Make sure to add a group key for useResourceList. 
- `value` is the value match on for updates, generally an ID, either of the entity
(for `useRealtimeResource`) or the grouped related object (for `useRealtimeResource`).

Here are the signatures for the two functions:
- `{data, error, isValidating, mutate } = useResource(url, subscribeRequest, configOptions)`
- `{data, error, isValidating, mutate } = useResourceList(listUrl, getResourceUrl, subscribeRequest, configOptions)`
    - `configOptions` takes in one additional optional property, `sortBy`, which will sort newly created elements that are
    added to the list. This is some code duplication from any ordering enforced on the back-end, but is necessary
    since the websocket subscription does not include all elements in the list, but only the new one.

