// frontend/pages/api/auth/[...auth0].ts

import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

export default handleAuth({
  login: handleLogin({
    returnTo: '/dashboard',
    authorizationParams: {
      // ▼▼▼ このaudienceの指定が重要です ▼▼▼
      audience: process.env.AUTH0_API_AUDIENCE, 
      // ▲▲▲ ここまで ▲▲▲
      scope: 'openid profile email', //
    },
  }),
});