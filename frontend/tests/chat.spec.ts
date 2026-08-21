import { test, expect } from '@playwright/test';

test.describe('Chat Messaging Feature', () => {
  test('should send and receive a message', async ({ page }) => {
    // Navigate to the app (auto-logs in as demo user)
    await page.goto('/');

    // Go to the chat page
    await page.click('a[href="/chat"]');
    await page.waitForURL('**/chat');

    // Wait for matches to load
    // Assuming there's at least one match because we seeded it
    // Use a selector that targets the match buttons specifically, not the refresh button
    const matchButton = page.locator('aside button:has(img), aside button:has(div.rounded-full)').first();
    
    // We might need to wait for the loading spinner to disappear
    await expect(page.locator('.animate-spin')).not.toBeVisible();
    
    // Check if there's a match, if not, we can't test messaging
    const hasMatch = await matchButton.isVisible();
    if (!hasMatch) {
      console.log('No matches available to test messaging. Please ensure the database is seeded.');
      test.skip();
      return;
    }

    // Click the first match
    await matchButton.click();

    // Wait for chat history to finish loading (spinner disappears)
    await expect(page.locator('.animate-spin')).not.toBeVisible();

    // The chat input should become visible
    const chatInput = page.locator('input[placeholder="Type a message..."]');
    await expect(chatInput).toBeVisible();

    // Type a unique test message
    const testMessage = `Hello from Playwright! ${Date.now()}`;
    await chatInput.fill(testMessage);

    // Send the message
    await chatInput.press('Enter'); // Or click the send button

    // The message should appear in the chat history
    const messageBubble = page.locator('text=' + testMessage);
    await expect(messageBubble).toBeVisible({ timeout: 5000 });
  });
});
