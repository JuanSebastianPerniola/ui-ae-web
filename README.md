# ui-ae-web

## Vercel deployment

The Azure-backed API requests are sent through the Vercel functions in `api/`.
This avoids browser CORS preflight failures and keeps the Azure Function key out
of the browser bundle.

Configure the following Vercel environment variable before deploying:

```text
IBEROSTAR_FUNCTION_CODE=<Azure Function code>
```

The value may be copied either in its raw form or URL-encoded form.
Do not include `code=` in the value.

Set it for every environment in which the site should make API requests
(Preview and/or Production), then redeploy.
