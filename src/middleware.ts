import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isNoGroupRoute = createRouteMatcher(["/no-group(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  // Enforce authentication (redirects to Clerk sign-in if not logged in).
  // Do NOT pass organization requirement — we handle that ourselves below.
  await auth.protect();

  // Now read the session without enforcing org, so we can redirect gracefully
  const { orgId } = await auth();

  // Authenticated but no organization — redirect to /no-group
  if (!orgId && !isNoGroupRoute(request)) {
    return NextResponse.redirect(new URL("/no-group", request.url));
  }

  // On /no-group with an org — send them to the app
  if (orgId && isNoGroupRoute(request)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
