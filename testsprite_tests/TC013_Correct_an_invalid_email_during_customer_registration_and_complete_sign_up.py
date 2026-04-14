import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:5173/dummy/admin
        await page.goto("http://localhost:5173/dummy/admin")
        
        # -> Navigate to http://localhost:5173/dummy/auth to reach the store-scoped registration page.
        await page.goto("http://localhost:5173/dummy/auth")
        
        # -> Click the 'Daftar' (Register) tab to reveal the registration form so we can fill name, email, and password.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/div/button[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the registration form with a name, an invalid email, and a valid password, then submit the form to trigger email validation.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Test User')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div[3]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('invalid-email')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div[4]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('password123')
        
        # -> Click the 'Daftar Sekarang' submit button to trigger email validation, then check for a visible email validation error message.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Replace the invalid email with a valid email (dummy@tendarapp.com) and submit the registration form.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div[3]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('dummy@tendarapp.com')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the No. WhatsApp field with a valid phone number and click 'Daftar Sekarang' to submit the registration, then verify the app redirects to the tenant menu.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div[2]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('081234567890')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div[4]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the 'Daftar Sekarang' submit button to submit the completed registration form and then verify the app redirects to the tenant menu.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the registration form by selecting the 'Daftar' tab so I can (re)fill the registration fields and verify email validation behavior.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/div/button[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Fill the registration form (name, phone, invalid email, password), submit to confirm email validation error, then correct the email and submit to verify that the app redirects to the tenant menu.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('Test User')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div[2]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('081234567890')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div[3]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('invalid-email')
        
        # -> Fill the Password field and click 'Daftar Sekarang' to trigger the email validation error (submit step 1 of 2).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div[4]/div/input').nth(0)
        await asyncio.sleep(3); await elem.fill('password123')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Replace the invalid email with dummy@tendarapp.com and submit the registration form to verify the app redirects to the tenant menu.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div/div/div/div/div/div[2]/form/div[3]/input').nth(0)
        await asyncio.sleep(3); await elem.fill('dummy@tendarapp.com')
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Alamat email tidak valid')]").nth(0).is_visible(), "The registration form should display an email validation error after submitting an invalid email.",
        current_url = await frame.evaluate("() => window.location.href")
        assert '/dummy/admin' in current_url, "The page should have navigated to the tenant menu after successful registration."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    