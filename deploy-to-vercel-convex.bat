@echo off
REM Deploy Convex backend to the deployment used by Vercel production
set CONVEX_DEPLOYMENT=efficient-salamander-898
npx convex deploy --cmd "npx convex deploy"
