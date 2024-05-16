## Usage

### `pnpm dev`

Runs the app in the development mode `http://localhost:3000`

### Dummy

To run the dummy

1. Add the following to `/etc/hosts`
   
   ```bash
   127.0.0.1       localhost dummy.localhost
   ```

2. Go to `http://dummy.localhost:3000` and login

3. [Select the mode](/packages/functions/src/replicache/dummy/data.ts) with `http://dummy.localhost:3000?dummy=<mode>`
