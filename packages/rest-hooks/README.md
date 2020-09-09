# REST hooks

React hooks for easy CRUD with REST resources.

This package exposes two hooks, `useResource` and `useResourceList`.
Both hooks have similar semantics to [SWR](https://github.com/vercel/swr/),
with one key improvement: generic, optimistic client-side updates!

They take advantage of the [mutation and POST request](https://swr.vercel.app/docs/mutation#mutation-and-post-request)
pattern in the SWR docs to make local changes feel more or less instantaneous.

## Documentation

### `useResource`
`{data, error, isValidating, mutate } = useResource(url, { ...configOptions })`
- `url`: the URL of the resource in question.
- `configOptions` are any of the options specified in the [SWR documentation](https://swr.vercel.app/docs/options).
- `data`, `error`, and `isValidating` are passed through directly from SWR.
- `mutate<T>(patched: Partial<T>, { ...mutateOptions })`
    The `mutateOptions` can include:
    - `method ["POST"]`: HTTP method to use when sending update to backend.
    - `sendRequest [true]`: Whether or not to update the backend.
    - `revalidate [true]`: Whether or not to request fully new data from the
    backend after updating the resource.
    
    
### `useResourceList`
The most magic in this package comes when dealing with lists, where
we're able to patch in updates and new elements with ease. It's important
to keep in mind that `useResourceList` expects all elements returned from the JSON
list to have an `id` field which *uniquely identifies* that element within the list.
`{data, error, isValidating, mutate } = useResourceList(listUrl, getResourceUrl, { ...configOptions })`
- `listUrl`: the URL of the resource list in question.
- `getResourceUrl: (id: string) => string`: A dynamic mapping from an element's ID to the URL
                                            it can be located at for updates.
- `configOptions` are any of the options specified in the
[SWR documentation](https://swr.vercel.app/docs/options).
- `data`, `error`, and `isValidating` are passed through directly from SWR.
- `mutate<T>(id: Identifier, patched: Partial<T>, { ...mutateOptions })`
    - `id` is the identifier for this element. If `append` is `false` and
    there is no matching `id`, the list will not be updated locally.
    if `id` is undefined, the request to the backend will not occur and standard SWR
    revalidation will take place. This is so the semantics for calls like `mutate()` still
    apply.
    - `patched` are the new / updated fields of this element.
    If `patched` is `null`, then the element with the given ID will be removed from the list.
    
    The `mutateOptions` can include:
    - `method ["POST"]`: HTTP method to use when sending update to backend.
    - `sendRequest [true]`: Whether or not to update the backend.
    - `revalidate [true]`: Whether or not to request fully new data from the
       backend after updating the resource.
    - `append [false]`: Toggle this flag to enable append mode.
       In append mode, the patched object will be added into the list as its
       own element if an element with that ID does not exist in the list already.
    - `sortBy`: A [comparison function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
       which will define how the list will be sorted after the call to mutate.
       
