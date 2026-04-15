# Arbaminch University Meal Management System

Full-stack web application for managing campuses, students, meal schedules, meal scans, admin authentication, campus profiles, and password or OTP-based account flows.

## Tech Stack

### Frontend
- Next.js `16.1.4`
- React `19.2.3`
- Tailwind CSS `4.1.18`
- Axios `1.13.4`

### Backend
- Node.js
- Express `5.2.1`
- MongoDB with Mongoose `9.1.4`
- JWT authentication with `jsonwebtoken` `9.0.3`
- Cloudinary uploads with `cloudinary` `1.41.3`
- Email delivery with `nodemailer` `7.0.12`

## Version Requirements

The safest project-wide runtime requirement is driven by the backend dependency set:

- Node.js: `>= 20.19.0`
- npm: recommended `>= 10`
- MongoDB: recommended `7.x` or MongoDB Atlas with a valid connection string

### Notes
- Frontend dependency `next@16.1.4` requires Node.js `>= 20.9.0`.
- Backend dependency `mongoose@9.1.4` requires Node.js `>= 20.19.0`.
- This project is currently developed locally with Node.js `22.14.0` and npm `11.2.0`.

## Project Structure

```text
arbaminchuniversity/
|-- backend/
`-- frontend/
```

## Environment Variables

Example environment files are included and should be committed:

- `backend/.env.example`
- `frontend/.env.example`

### Backend variables
- `NODE_ENV`: runtime mode such as `development` or `production`
- `PORT`: backend server port
- `MONGO_URI`: MongoDB connection string
- `FRONTEND_URL`: allowed frontend origin for CORS and reset-password links
- `JWT_SECRET`: secret used for signing authentication and OTP tokens
- `JWT_EXPIRES`: token expiry value such as `1d` or `30d`
- `SALT_ROUNDS`: bcrypt salt rounds
- `EMAIL_USER`: SMTP sender email account
- `EMAIL_PASS`: SMTP or app password for the sender account
- `CLOUDINARY_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret

### Frontend variables
- `NEXT_PUBLIC_API_URL`: backend API base URL, for example `http://localhost:5000/api`

## Local Setup

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Create environment files

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

### 3. Update the backend secret

Set a strong `JWT_SECRET` value in `backend/.env`.
Use a long random string and do not commit the real value.

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

Default development URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Backend API base: `http://localhost:5000/api`

## Production Checklist

- Set `NODE_ENV=production` in the backend environment
- Use a production MongoDB connection string
- Set `FRONTEND_URL` to deployed frontend domain
- Set `NEXT_PUBLIC_API_URL` to deployed backend API URL
- Use strong production secrets for `JWT_SECRET`
- Use production Cloudinary credentials
- Use a real SMTP or app-password-enabled email account

## Available Scripts

### Backend
- `npm run dev`: start backend with Nodemon
- `npm start`: start backend with Node

### Frontend
- `npm run dev`: start Next.js development server
- `npm run build`: build for production
- `npm run start`: start production server
- `npm run lint`: run ESLint
