# prohelper_customers

Customer portal for ProHelper.

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test:run`
- `npx tsc --noEmit`

## GitHub Actions deploy

Workflow: `.github/workflows/deploy.yml`

Required repository secrets:

- `DEPLOY_HOST`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`
- `DEPLOY_POST_COMMAND`

SSH user is fixed to `root`, and SSH port is fixed to `22` in the workflow.
