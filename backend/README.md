# ChatFlow Backend

The project now includes a PostgreSQL + Prisma 7 + Express + Socket.IO backend.

## Already completed

- PostgreSQL connection configuration
- Prisma 7 configuration with PostgreSQL driver adapter
- Database models and initial migration
- Demo OTP login API
- JWT authentication
- Profile create/update API
- Registered-user phone search
- Direct conversation creation
- Stored messages
- Realtime Socket.IO message delivery
- Frontend connected to the backend APIs
- Express serves the frontend and backend from one URL

## Run on Windows

Open PowerShell in the `backend` folder and run:

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Then open:

```text
http://localhost:3000
```

Do not open the HTML files using Live Server for backend testing. Use the URL above.

## Demo OTP

```text
123456
```

## Test real chatting locally

Use two different browser profiles, for example normal Edge and an InPrivate window. Register two different mobile numbers and complete both profiles. Search the other number from **New Chat**.

## Things that still require your action

1. PostgreSQL must be running on your computer.
2. The `chatflow_db` database must exist.
3. The password in `.env` must match your PostgreSQL password.
4. Run the four setup commands above.
5. For production, replace demo OTP with Firebase/Twilio/another SMS provider.
6. Before deployment, replace `JWT_SECRET` and use a hosted PostgreSQL URL.

## Important security note

The current `.env` is for local development only. It is ignored by Git. Never upload it publicly.

## Professional messaging update

This build includes persistent login, unread counters, last-message preview, message sent/read indicators, online/last-seen presence, profile editing, contact details, realtime refresh, responsive messenger UI, and search by name/phone/username.

After extracting, run in `backend`:

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000/login.html`. The root URL remains the separate public download/landing page.

## Final added features
- Registered-contact search and invite through the phone share sheet/WhatsApp.
- Image (JPG/PNG/WEBP), PDF and contact-card messages.
- Files are limited to 10 MB and saved in `backend/uploads` for local development.
- Admin dashboard for users, account creation, login history, chat/message counts.

## Admin access (change before deployment)
- URL: `http://localhost:3000/admin-login.html`
- Admin ID: `chatflowadmin`
- Password: `ChatFlow@123`

These values come from `.env` (`ADMIN_ID` and `ADMIN_PASSWORD`). Change both before hosting.

## Where data is saved
- User accounts, profiles, conversations, message records and login history: PostgreSQL database `chatflow_db`.
- Uploaded images and PDFs: `backend/uploads` on the server disk.
- Login tokens and selected local UI state: browser/app localStorage.

For production deployment, local upload storage should be replaced with persistent object storage such as Cloudinary, Amazon S3 or Supabase Storage because many cloud hosts erase local files during redeploy/restart.

## Functional settings added
The Settings page now saves privacy options, read receipts, notification preference and theme in PostgreSQL. It also includes blocked-user management, account statistics, real API health status, logout and permanent account deletion. Blocking is enforced when creating a direct chat and sending text/contact messages.


## Production polish included
- Live username availability while editing profile.
- Typing indicator, message replies, delete-for-me and clear-chat-for-me.
- Pinned chats.
- Admin enable/disable and permanent delete controls.
- Disabled accounts are rejected by protected APIs.
- Render blueprint and Dockerfile included.

## Deployment note
Local uploads are not permanent on many free hosts. For a public release, attach persistent storage or replace `/uploads` with an object-storage provider. Demo OTP remains intentionally enabled for this project build.
