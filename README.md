# Arbaminch University Meal Management System

Full-stack web application for managing campuses, students, meal schedules, meal scans, admin authentication, campus profiles, and password or OTP-based account flows.

## Tech Stack

### Frontend

- Next.js `15.1.0`
- React `19.0.0`
- Tailwind CSS `4.1.18`
- Axios `1.13.4`

### Backend

- Node.js
- Express `4.19.2`
- MySQL with mysql2 `3.6.5`
- JWT authentication with `jsonwebtoken` `9.0.3`
- Email delivery with `nodemailer` `7.0.12`

## Version Requirements

The safest project-wide runtime requirement is driven by the backend dependency set:

- Node.js: `>= 20.19.0`
- npm: recommended `>= 10`
- MySQL: recommended `8.x` or compatible server

### Notes

- Frontend dependency `next@15.1.0` requires Node.js `>= 20.9.0`.
- Backend dependency `mysql2@3.6.5` requires Node.js `>= 18`.
- This project is currently developed locally with Node.js `22.14.0` and npm `11.2.0`.

## Project Structure

```
arbaminchuniversity/
|-- backend/
`-- frontend/
```

## Environment Variables

Example environment files are included and should stay committed:

- `backend/.env.example`
- `frontend/.env.example`

Copy them before running the project:

PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Bash:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### Backend variables

- `NODE_ENV`: use `development` locally or `production` on the server
- `PORT`: backend server port such as `5000`
- `DB_HOST`: MySQL host such as `127.0.0.1` locally or `db.example.com` in production
- `DB_PORT`: MySQL port, usually `3306`
- `DB_USER`: MySQL username
- `DB_PASSWORD`: MySQL password
- `DB_NAME`: MySQL database name
- `EXTERNAL_DB_HOST`: optional external university MySQL host used for student sync
- `EXTERNAL_DB_PORT`: optional external university MySQL port, usually `3306`
- `EXTERNAL_DB_USER`: optional external university MySQL username
- `EXTERNAL_DB_PASSWORD`: optional external university MySQL password
- `EXTERNAL_DB_NAME`: optional external university database name
- `EXTERNAL_DB_TABLE`: external source table or view name for student sync
- `FRONTEND_URL`: frontend origin allowed by CORS, for example `http://localhost:3000` or `https://frontend.example.com`
- `COOKIE_SECURE`: set to `false` for plain HTTP and `true` for HTTPS so auth cookies work correctly
- `JWT_SECRET`: long random secret for JWT signing
- `SALT_ROUNDS`: bcrypt cost factor such as `10` or `12`
- `INITIAL_ADMIN_EMAIL`: email used by `npm run seed` to create the first admin account
- `INITIAL_ADMIN_PASSWORD`: password used by `npm run seed` to create the first admin account
- `RESEND_API_KEY`: Use resend api key

### Frontend variables

- `NEXT_PUBLIC_API_URL`: backend API base URL, for example `http://localhost:5000/api` in development or `https://api.example.com/api` in production

### Quick examples

Backend development example:

```env
NODE_ENV=development
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=mysql_username
DB_PASSWORD=mysql_password
DB_NAME=arbaminch_university_dev
EXTERNAL_DB_HOST=127.0.0.1
EXTERNAL_DB_PORT=3306
EXTERNAL_DB_USER=external_mysql_username
EXTERNAL_DB_PASSWORD=external_mysql_password
EXTERNAL_DB_NAME=external_university_source
EXTERNAL_DB_TABLE=external_students
FRONTEND_URL=http://localhost:3000
COOKIE_SECURE=false
JWT_SECRET=replace_with_a_long_random_development_secret
SALT_ROUNDS=10
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=change_me_on_first_login
RESEND_API_KEY=resend-api-key
```

Backend production example:

```env
NODE_ENV=production
PORT=5000
DB_HOST=db.example.com
DB_PORT=3306
DB_USER=production_db_user
DB_PASSWORD=production_db_password
DB_NAME=arbaminch_university_prod
EXTERNAL_DB_HOST=external-db.example.com
EXTERNAL_DB_PORT=3306
EXTERNAL_DB_USER=external_production_user
EXTERNAL_DB_PASSWORD=external_production_password
EXTERNAL_DB_NAME=external_university_source
EXTERNAL_DB_TABLE=external_students
FRONTEND_URL=https://frontend.example.com
COOKIE_SECURE=true
JWT_SECRET=replace_with_a_long_random_production_secret
SALT_ROUNDS=12
INITIAL_ADMIN_EMAIL=admin@domain.com
INITIAL_ADMIN_PASSWORD=change_me_on_first_login
RESEND_API_KEY=resend-api-key
```

Frontend development example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Frontend production example:

```env
NEXT_PUBLIC_API_URL=https://api.example.com/api
```

## Local Setup

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Update the environment values

Replace the placeholder values in:

- `backend/.env`
- `frontend/.env.local`

### 3. Update the backend secret

Set a strong `JWT_SECRET` value in `backend/.env`.
Use a long random string and do not commit the real value.
Admin and campus login stay active while the browser remains open and end when the browser is closed.

Example:

```env
JWT_SECRET=replace_this_with_a_long_random_secret_value
```

### 4. Run the apps

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

### 5. Seed the first admin

After the backend tables exist and `INITIAL_ADMIN_EMAIL` plus `INITIAL_ADMIN_PASSWORD` are set in `backend/.env`, run:

```bash
cd backend
npm run seed
```

The seed creates the default admin only if no admin exists yet, and that admin is forced to change the password on first login.

Default development URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Backend API base: `http://localhost:5000/api`

## Production Checklist

- Set `NODE_ENV=production` in the backend environment
- Use a production MySQL connection
- Set `FRONTEND_URL` to deployed frontend domain
- Set `COOKIE_SECURE=false` for plain HTTP or `true` for HTTPS
- Set `NEXT_PUBLIC_API_URL` to deployed backend API URL
- Use strong production secrets for `JWT_SECRET`
- Use a real SMTP or app-password-enabled email account

## Available Scripts

### Backend

- `npm run dev`: start backend with Nodemon
- `npm start`: start backend with Node
- `npm run seed`: create the initial admin from `backend/.env`

### Frontend

- `npm run dev`: start Next.js development server
- `npm run build`: build for production
- `npm run start`: start production server
- `npm run lint`: run ESLint
