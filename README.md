# Kusuma Personal Dashboard deployment

The frontend is published by GitHub Pages and the Node.js API is hosted by Railway. The Railway service needs a persistent volume so the SQLite database and uploaded files survive deploys and restarts.

## Deploy the API to Railway

1. Create a Railway project from this GitHub repository and deploy the `main` branch.
2. Add a Railway volume mounted at `/data`.
3. Set these service variables:
   - `DATA_DIR=/data`
   - `NODE_ENV=production`
   - `SESSION_SECRET` to a long, random value
   - `FRONTEND_URL=https://yuefop-lgtm.github.io`
   - `INITIAL_ADMIN_PASSWORD` to a new, strong password
4. Wait for the `/healthz` health check to pass, then copy the Railway service's public HTTPS URL.

The initial username is `agung`. The initial password is read only when the database is first created; changing the variable later does not change an existing account password.

## Publish the frontend with GitHub Pages

1. In the repository settings, open **Pages** and set the build/deployment source to **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions → Variables**, add `API_BASE_URL` with the Railway public HTTPS URL (for example, `https://your-service.up.railway.app`).
3. Push to `main` or run the **Deploy GitHub Pages** workflow from the Actions tab. The workflow is skipped until `API_BASE_URL` is set.

The site URL will be `https://yuefop-lgtm.github.io/kusuma-personal-dashboard/`. Keep the Railway volume attached to the service; without it, database and uploaded-file data may be lost when the service is replaced.

## Run locally

Run `npm start` and open `http://localhost:3000`. Local development uses the default `agung` / `kusuma` account only when creating a fresh local database.
