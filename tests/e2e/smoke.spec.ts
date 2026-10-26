import { expect, test } from '@playwright/test'

const PROTECTED_ROUTES = ['/', '/gastos', '/cuentas', '/salud', '/entrenos']

test('/login renders the Google sign-in button', async ({ page }) => {
  const res = await page.goto('/login')
  expect(res?.status()).toBe(200)
  await expect(page.getByText('Acceso privado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible()
})

for (const route of PROTECTED_ROUTES) {
  test(`unauthenticated ${route} redirects to /login`, async ({ page, request }) => {
    const res = await request.get(route, { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(new URL(res.headers()['location'], 'http://localhost').pathname).toBe('/login')

    await page.goto(route)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible()
  })
}
