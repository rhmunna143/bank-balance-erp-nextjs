import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];
const SUPERADMIN_PREFIX = "/superadmin";
const RESERVED_SLUGS = [
  'login', 'register', 'forgot-password', 'reset-password',
  'create-bank', 'superadmin', 'api', 'profile', 'settings',
  'dashboard', 'admin', 'not-found',
  'cash-in', 'deposit', 'expenses', 'hand-cash', 'loans',
  'mother-accounts', 'profit-accounts', 'reports', 'transactions',
  'fund-transfer',
  'search',
  'users', 'withdraw',
];

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isLandingPage = pathname === "/";
  const isApiPath = pathname.startsWith("/api");
  const isSuperAdminPath = pathname.startsWith(SUPERADMIN_PREFIX);

  // Always allow API routes
  if (isApiPath) {
    return supabaseResponse;
  }

  // Landing page is always public for unauthenticated users
  // Authenticated users get redirected to their dashboard
  if (isLandingPage) {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Check if this is a bank landing page: /{slug} (single segment, not reserved)
  const segments = pathname.split('/').filter(Boolean);
  const isBankLanding = segments.length === 1 && !RESERVED_SLUGS.includes(segments[0]);

  if (isBankLanding) {
    if (user) {
      // Authenticated users go to the bank's dashboard
      const url = request.nextUrl.clone();
      url.pathname = `/${segments[0]}/dashboard`;
      return NextResponse.redirect(url);
    }
    // Unauthenticated users see the bank's public landing page
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login (except public paths)
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Guard SuperAdmin routes
  if (user && isSuperAdminPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_superadmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
