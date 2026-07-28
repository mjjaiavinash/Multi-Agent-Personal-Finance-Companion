# SpendSense AI - Deployment Guide

This guide covers deploying the SpendSense AI application across Netlify (Frontend), Render (Backend), and MongoDB Atlas (Database).

## 1. MongoDB Atlas Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under "Database Access", create a database user and save the password.
3. Under "Network Access", allow access from anywhere (`0.0.0.0/0`) since Render IPs are dynamic.
4. Click "Connect" -> "Connect your application" and copy the connection string (`MONGO_URI`). Replace `<password>` with your user's password.

## 2. Backend Deployment (Render)
1. Push your code to a GitHub repository.
2. Sign in to [Render](https://render.com/) and click "New" -> "Blueprint".
3. Connect your GitHub repository. Render will automatically detect the `backend/render.yaml` file.
4. Render will prompt you for the required environment variables:
   - `MONGO_URI`: The connection string from MongoDB Atlas.
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `CLIENT_URL`: The URL where your frontend will be deployed (e.g., `https://spendsense-ai.netlify.app`). Update this later after deploying the frontend!
5. Deploy the backend and copy the provided `.onrender.com` URL.

## 3. Frontend Deployment (Netlify)
1. Sign in to [Netlify](https://www.netlify.com/) and click "Add new site" -> "Import an existing project".
2. Connect your GitHub repository.
3. In the build settings, specify:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
4. Click "Add environment variables" and add:
   - `VITE_API_BASE_URL`: Your backend URL (e.g., `https://your-backend-name.onrender.com/api`)
5. Click "Deploy site".
6. Once deployed, copy the Netlify URL and **go back to your Render dashboard** to update the `CLIENT_URL` environment variable.

## 4. Verification
- Open your Netlify frontend URL.
- Create an account and add an expense.
- Navigate to the AI Analysis or Chat page to verify that the Gemini API is responding correctly.
