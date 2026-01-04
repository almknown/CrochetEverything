import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect } from '@playwright/test'

// Clerk test mode uses fixed OTP code 424242 for emails with +clerk_test suffix
const CLERK_TEST_OTP = '424242'

test.describe('Pattern Generation Flow', () => {
    test('should generate a crochet pattern with 3D preview', async ({ page }) => {
        // Inject testing token to bypass Clerk's bot detection
        await setupClerkTestingToken({ page })

        // Navigate to /generate first to preserve redirect URL
        await page.goto('/generate')

        // We should be redirected to sign-in
        await page.waitForURL('**/sign-in**', { timeout: 10000 })

        // Wait for Clerk sign-in form to load
        await page.waitForSelector('input[name="identifier"]', { timeout: 10000 })

        // Fill in test user credentials
        const testEmail = process.env.E2E_CLERK_USER_EMAIL
        const testPassword = process.env.E2E_CLERK_USER_PASSWORD

        if (!testEmail || !testPassword) {
            throw new Error('E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD must be set')
        }

        // Enter email
        await page.fill('input[name="identifier"]', testEmail)
        await page.click('button[data-localization-key="formButtonPrimary"]')

        // Wait for password field and enter password
        await page.waitForSelector('input[name="password"]', { timeout: 10000 })
        await page.fill('input[name="password"]', testPassword)
        await page.click('button[data-localization-key="formButtonPrimary"]')

        // Handle 2FA/Email verification if required (Clerk test mode uses 424242)
        // Wait a bit and check if we're on factor-two page
        await page.waitForTimeout(2000)

        const currentUrl = page.url()
        if (currentUrl.includes('factor-two') || currentUrl.includes('verify')) {
            console.log('OTP verification required, entering code 424242...')

            // Wait for the OTP page to fully load
            await page.waitForTimeout(1000)

            // Find the verification code textbox
            const codeInput = page.getByRole('textbox', { name: /verification code/i })

            if (await codeInput.isVisible({ timeout: 3000 })) {
                // Click to focus
                await codeInput.click()
                await page.waitForTimeout(500)

                // Type the code character by character with delays
                for (const char of CLERK_TEST_OTP) {
                    await page.keyboard.type(char, { delay: 100 })
                }

                console.log('OTP code entered, waiting for auth to complete...')

                // Wait for redirect (either to generate or home page)
                await page.waitForURL(url => !url.href.includes('factor-two') && !url.href.includes('sign-in'), { timeout: 30000 })
            }
        }

        // If we're on home, navigate to generate
        if (!page.url().includes('/generate')) {
            console.log('Navigating to /generate...')
            await page.goto('/generate')
        }

        // Verify we're on the generate page
        await expect(page.getByRole('heading', { name: /generator/i })).toBeVisible({ timeout: 10000 })
        console.log('✅ Successfully logged in and on the generate page!')

        // Find and fill the prompt textarea
        const promptTextarea = page.locator('textarea').first()
        await expect(promptTextarea).toBeVisible()
        await promptTextarea.fill('Make me a cozy round coaster')

        // Click the Generate button
        const generateButton = page.getByRole('button', { name: /generate/i })
        await expect(generateButton).toBeEnabled({ timeout: 5000 })
        await generateButton.click()
        console.log('Generate button clicked, waiting for AI response...')

        // Wait for generation to complete (this may take a while due to AI processing)
        // Look for the 3D canvas or pattern instructions
        await expect(page.locator('canvas')).toBeVisible({ timeout: 90000 })
        console.log('Canvas visible!')

        // Verify pattern instructions are displayed
        await expect(page.getByText(/stitch/i)).toBeVisible({ timeout: 15000 })

        console.log('✅ Pattern generation test passed!')
    })

    test('should access gallery without authentication', async ({ page }) => {
        await setupClerkTestingToken({ page })

        // Gallery should be public
        await page.goto('/gallery')

        // Verify gallery page loads
        await expect(page.getByRole('heading', { name: /gallery/i })).toBeVisible({ timeout: 5000 })
    })

    test('should redirect to sign-in when accessing generate without auth', async ({ page }) => {
        await setupClerkTestingToken({ page })

        // Clear any existing session
        await page.context().clearCookies()

        // Try to access generate page
        await page.goto('/generate')

        // Should be redirected to sign-in
        await expect(page).toHaveURL(/sign-in/)
    })
})
