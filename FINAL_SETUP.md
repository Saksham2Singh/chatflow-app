# ChatFlow Final Setup

## Local run
Open PowerShell in `backend` and run:

```powershell
npm install
npm approve-scripts --all
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000/login.html`.

Demo OTP: `123456`

Admin page: `http://localhost:3000/admin-login.html`

Local admin defaults:
- ID: `chatflowadmin`
- Password: `ChatFlow@123`

Change `JWT_SECRET`, `ADMIN_ID`, and `ADMIN_PASSWORD` before deployment.

## Important deployment requirement
Set these environment variables on the host:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_ID`
- `ADMIN_PASSWORD`
- `DEMO_OTP=123456`
- `NODE_ENV=production`

Run build command:

```text
npm install && npx prisma generate && npx prisma migrate deploy
```

Start command:

```text
npm start
```

## Media storage
Images and PDFs currently save in `backend/uploads`. This is reliable locally. Many cloud platforms erase local uploads during redeploy/restart. Before a public launch, use persistent disk or object storage such as Cloudinary/S3/Supabase Storage.

## New final features
- Live username availability
- Typing indicator
- Reply to message
- Delete message for me
- Clear chat for me
- Pin/unpin chats
- Admin disable/enable user
- Admin permanent user deletion
- Disabled-account API protection
- PNG logo, favicon, PWA manifest
- Render and Docker deployment files
