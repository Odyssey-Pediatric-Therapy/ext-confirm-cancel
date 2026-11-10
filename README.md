# Confirm Cancel for EspoCRM

Standalone extension that asks before discarding unsaved changes when Cancel is clicked in a detail edit form or a full edit/create form. No Odyssey extension dependency.

- **Discard Changes** runs the normal cancel action.
- **Keep Editing**, Escape in the dialog, or dismissal preserves the form.
- Unchanged forms cancel immediately.
- Focused input is fetched before checking for changes.
- Repeated clicks open one confirmation. Existing keyboard cancel confirmations remain unchanged.

## Requirements

EspoCRM 10.0 or newer, PHP 8.5 or newer. Development uses Node.js 24+ and npm 11+.

## Test and build

```sh
npm ci
npm test
npm run extension
```

The installable ZIP is written to `build/confirm-cancel-1.0.1.zip`. Install it through Administration > Extensions in EspoCRM. Rebuild/clear cache if needed, then refresh the browser.

No database migrations or installation scripts are required. The extension appends global view setup handlers and leaves existing handlers in place.

## Development

`build.js` and the development configuration follow the EspoCRM extension tools scaffold used by ext-odyssey. Copy `config-default.json` to `config.json` to configure a separate local instance. Local configuration, dependencies, and generated builds are ignored by Git.

The confirmation feature was extracted from ext-odyssey. No Odyssey business logic or development site data is included.

## Manual verification

1. Edit an existing record, change a value, and click Cancel: verify the confirmation opens.
2. Choose Keep Editing: verify the entered value remains.
3. Click Cancel again and choose Discard Changes: verify the original record values return.
4. Edit without changing anything: verify Cancel closes immediately.
5. Repeat in a full edit/create form and with a focused text field.
6. Press Escape while editing: verify the existing confirmation appears only once.

Automated tests exercise the handler contract; live browser verification is still required.
