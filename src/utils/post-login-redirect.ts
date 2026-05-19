/**
 * Куда вести пользователя после входа.
 * Явный redirect из query имеет приоритет; иначе админы — в /admin.
 */
export function resolvePostLoginRedirect(
  redirectFromQuery: string | undefined,
  hasAdminAccess: boolean,
): string {
  if (redirectFromQuery && redirectFromQuery.startsWith('/')) {
    return redirectFromQuery
  }
  return hasAdminAccess ? '/admin' : '/discounts'
}
