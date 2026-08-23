import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth";

export const authClient = createAuthClient({
  plugins: [polarClient(), twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
