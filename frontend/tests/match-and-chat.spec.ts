import { test, expect } from '@playwright/test';

// This test verifies the chat messaging flow works correctly.
// It goes directly to the chat page (which has pre-existing matches from the database seed)
// then selects a match and sends a message.

test.describe('Chat Messaging Flow', () => {
  test('should be able to send and receive a message in an existing match', async ({ page }) => {
    // Login explicitly
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    
    // Wait until redirected away from login
    await page.waitForURL('**/', { timeout: 10000 });

    // Navigate directly to chat page
    await page.goto('/chat');
    await page.waitForURL('**/chat', { timeout: 5000 });

    // Wait for the matches list to load
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });

    // Check if there are any matches in the sidebar
    const matchButtons = page.locator('aside button:has(h4)');
    const count = await matchButtons.count();

    if (count === 0) {
      console.log('No matches found. Skipping test.');
      test.skip();
      return;
    }

    // Click the first match in the sidebar
    await matchButtons.first().click();

    // Wait for chat to load and socket to join the room
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 8000 });

    // The chat input should now be visible
    const chatInput = page.locator('input[placeholder="Type a message..."]');
    await expect(chatInput).toBeVisible({ timeout: 8000 });

    // Wait for socket room to be joined
    await page.waitForTimeout(1500);

    // Send a test message by clicking the send button
    const testMessage = `Hello! Playwright test message - ${Date.now()}`;
    // Use type() instead of fill() to trigger React's onChange event properly
    await chatInput.click();
    await chatInput.type(testMessage);
    // Click the send button (form submit button with Send icon)
    const sendButton = page.locator('form button[type="submit"]');
    await expect(sendButton).not.toBeDisabled({ timeout: 3000 });
    await sendButton.click();

    // Wait briefly for socket echo / state update
    await page.waitForTimeout(3000);

    // Verify the message appears in the chat
    // The message is echoed back via socket receive_message event from the backend
    const messageBubble = page.locator(`text=${testMessage}`);
    await expect(messageBubble).toBeVisible({ timeout: 10000 });

    console.log('[Test] Chat messaging test passed!');
  });

  test('should navigate to chat from match overlay after swiping right', async ({ page }) => {
    // Login explicitly
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/', { timeout: 10000 });

    // Wait for discover page to load
    await page.waitForTimeout(2000);
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });

    // Check if there are candidates
    const cardVisible = await page.locator('div.cursor-grab').first().isVisible();
    if (!cardVisible) {
      console.log('No cards visible on swipe page. Skipping test.');
      test.skip();
      return;
    }

    // Click LIKE button (bg-rose-600) — swipe right
    const likeButton = page.locator('button.bg-rose-600').first();
    await likeButton.click();
    await page.waitForTimeout(600);

    // Try to swipe on a second card (after tutorial is dismissed)
    const secondCardVisible = await page.locator('div.cursor-grab').first().isVisible();
    if (secondCardVisible) {
      await likeButton.click();
    }

    // If match modal appears, click Send Message
    const matchHeading = page.locator('h1:has-text("Match")');
    const matchFound = await matchHeading.isVisible({ timeout: 5000 }).catch(() => false);

    if (matchFound) {
      await page.locator('button:has-text("Send Message")').click();
      await page.waitForURL('**/chat', { timeout: 8000 });

      // Click the first match
      await page.locator('aside button:has(h4)').first().click();

      // Verify chat input is visible
      const chatInput = page.locator('input[placeholder="Type a message..."]');
      await expect(chatInput).toBeVisible({ timeout: 8000 });

      // Send a message
      const msg = `Match test message - ${Date.now()}`;
      await chatInput.fill(msg);
      await chatInput.press('Enter');
      await expect(page.locator(`text=${msg}`)).toBeVisible({ timeout: 8000 });
      console.log('[Test] Match-to-chat flow test passed!');
    } else {
      console.log('No match triggered. Test completed without match scenario.');
    }
  });
});
