import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  return auth.api.getSession({ headers: getRequest().headers });
});
