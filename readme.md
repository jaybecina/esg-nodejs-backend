### Environment variables

Required variables: 

```env
PORT=
DATABASE_URI=
JWT_SECRET=
FRONTEND_URL=

SMTP_USER=
SMTP_PASSWORD=
```

Optional variables for **Azure Blob Storage**:

```env
STORAGE_SERVICE=Azure

AZURE_STORAGE_ACCOUNT_NAME=
AZURE_STORAGE_ACCOUNT_KEY=
AZURE_STORAGE_CONTAINER_NAME=
```

Optional variables for **AWS S3**:
```env
STORAGE_SERVICE=AWS

S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_UPLOAD_ENDPOINT=
```

## Docker

#### Reminder

1. Please setup domains for frontend & backend first and then build the images.
Can't use URL like `http://localhost` for `FRONTEND_URL` in backend & `REACT_APP_API_URL` in frontend

2. If URL / Port of Backend Server is changed, please update these variables and then rebuild the images and containers

### Frontend (jll-frontend) Dockerfile (image)

1. Setup `.env`

Set `REACT_APP_API_URL=` equal to URL of API Server

2. Build the image `docker build -t jll-frontend .`
3. Run `docker run -dp <Host_Port>:80 jll-frontend` to create container

### Docker Compose

#### With frontend web image (jll-frontend)

1. Build the frontend web docker image `docker build -t jll-frontend .` in frontend root folder
2. Setup `.env` file (backend)
3. Run `APP_PORT=<Frontend_Port> docker-compose up -d`

#### Example of run docker-compose

Run `APP_PORT=5001 docker-compose up -d`

Port:
- React Web App: 5001
- Node application: `PORT` in `.env` 

### Backend Dockerfile (image)

1. Build the image `docker build -t jll-backend .`
2. Setup `.env` file in root folder
3. Create & run a container `docker run -dp <Host_Port>:<Container_Expose_Port> --env-file .env jll-backend`
4. Go to http://localhost:HostPort

## Database Setup

### Import

Import these json files to MongoDB one by one

1. [translations.json](./database/translations.json) to to collection `contents`
2. [users.json](./database/users.json) to collection `users`
3. [notification_templates.json](./database/notification_templates.json) to collection `notification_templates`
4. [reports.jon](./database/reports.json) to collection `reports`

### Commands

Import new translations from [translations.json](./database/translations.json) to collection `contents` in MongoDB

```bash
yarn ts-node src/migration/scripts/import_translations.ts
```

Export translations from collection `contents` in MongoDB to [translations.json](./database/translations.json)

```bash
yarn ts-node src/migration/scripts/export_translations.ts
```

## Deployment

The deployment of QA & UAT are similar

QA:

1. Go to server
2. `cd ~/jll-backend` to go to the root dir of project
3. run `git pull`
4. run `yarn install --frozen-lockfile` if any dependency is added or updated
5. edit `.env` if any environment variable is added or updated
6. `yarn build` to compile the project
7. `pm2 restart jll-be` to restart the service

### Info

QA Database: `jll-qa`

UAT Database: `jll-uat`

## Database migration (test)

script file name format: `{YYYYMMDDHHmmss}_{purpose}.ts`

use ts-node to run the script to update documents in MongoDB

```bash
yarn ts-node file-relative-path
```