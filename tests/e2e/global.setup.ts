import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

// Setup must be run serially
setup.describe.configure({ mode: 'serial' })

setup('global setup', async ({ }) => {
    // This obtains a Testing Token at test suite start
    // The token is then available for all subsequent tests
    await clerkSetup()
})
