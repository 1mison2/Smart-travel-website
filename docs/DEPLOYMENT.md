# Deployment

This project deploys as two services:

- Backend: Express API in `backend`
- Frontend: Vite React app in `frontend/frontend`

## 1. Backend

Recommended service settings:

- Runtime: Node.js 20
- Root directory: repository root, with `render.yaml`; or manually set root/build commands
- Build command: `cd backend && npm install`
- Start command: `cd backend && npm start`

Required environment variables:

- `MONGO_URI`
- `JWT_SECRET`
- `FRONTEND_URL`

Feature-specific environment variables:

- Cloudinary uploads: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Google sign-in: `GOOGLE_CLIENT_ID`
- Google Maps/Places: `GOOGLE_MAPS_API_KEY`
- Khalti payments: `KHALTI_SECRET_KEY`, `KHALTI_MODE`
- Email notifications: `EMAIL_USER`, `EMAIL_PASS`

## 2. Frontend

Recommended service settings:

- Framework: Vite
- Root directory: `frontend/frontend`
- Build command: `npm run build`
- Output directory: `dist`

Required environment variable:

- `VITE_API_BASE`: deployed backend URL, for example `https://smart-travel-backend.onrender.com`

Optional frontend variables:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_OPENROUTESERVICE_API_KEY`

## 3. After Deployment

1. Set backend `FRONTEND_URL` to the deployed frontend URL.
2. Set frontend `VITE_API_BASE` to the deployed backend URL.
3. Redeploy both services after changing env vars.
4. Test login, admin location upload, explore pages, chat, and payments.
