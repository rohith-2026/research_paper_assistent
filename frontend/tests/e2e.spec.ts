import { test, expect, request as pwRequest } from '@playwright/test';

const apiBase = process.env.PW_API_BASE_URL || 'http://127.0.0.1:8000';

async function backendReady(request: typeof pwRequest) {
  try {
    const res = await request.get(`${apiBase}/healthz/ready`);
    return res.ok();
  } catch {
    return false;
  }
}

async function getTokens(request: typeof pwRequest, email: string, password: string) {
  const res = await request.post(`${apiBase}/auth/login`, {
    data: { email, password },
  });
  const body = await res.json();
  return {
    access: body.access_token as string,
    refresh: body.refresh_token as string,
  };
}

async function seedUser(request: typeof pwRequest) {
  const seed = Date.now();
  const email = `e2e_${seed}@example.com`;
  const password = 'E2ePass123!';
  await request.post(`${apiBase}/auth/register`, {
    data: { name: 'E2E User', email, password },
  });
  return { email, password };
}

test.describe.serial('Research assistant flows', () => {
  let email = '';
  let password = '';

  test.beforeAll(async ({ request }) => {
    if (!(await backendReady(request))) return;
    const creds = await seedUser(request);
    email = creds.email;
    password = creds.password;
  });

  test('Login works (UI)', async ({ page, request }) => {
    test.skip(!(await backendReady(request)), 'Backend not reachable');

    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });

  test('Query text -> save paper', async ({ page, request }) => {
    test.skip(!(await backendReady(request)), 'Backend not reachable');

    const tokens = await getTokens(request, email, password);
    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('rpa_access_token', access);
        localStorage.setItem('rpa_refresh_token', refresh);
      },
      tokens
    );

    await page.goto('/dashboard/query-text');
    await page
      .getByPlaceholder('Enter your research question or paste text to analyze...')
      .fill('graph neural networks for scientific discovery');
    await page.getByRole('button', { name: 'Analyze' }).click();

    await expect(page.getByText('Top 10 Research Papers')).toBeVisible({
      timeout: 60000,
    });

    await page.getByTitle('Save paper').first().click();
    await expect(page.getByText('Paper saved')).toBeVisible();
  });

  test('Paper summary -> regenerate', async ({ page, request }) => {
    test.skip(!(await backendReady(request)), 'Backend not reachable');

    const tokens = await getTokens(request, email, password);
    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('rpa_access_token', access);
        localStorage.setItem('rpa_refresh_token', refresh);
      },
      tokens
    );

    await page.goto('/dashboard/paper-summary');
    const summarySelect = page.locator('select').first();
    await expect(summarySelect).not.toHaveValue('', { timeout: 20000 });
    await page.getByRole('button', { name: 'Regenerate' }).click();

    await expect(page.getByText('Summary generated')).toBeVisible({
      timeout: 90000,
    });
  });

  test('Downloads -> record PDF', async ({ page, request }) => {
    test.skip(!(await backendReady(request)), 'Backend not reachable');

    const tokens = await getTokens(request, email, password);
    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('rpa_access_token', access);
        localStorage.setItem('rpa_refresh_token', refresh);
      },
      tokens
    );

    await page.goto('/dashboard/downloads');
    const downloadSelect = page.locator('select').first();
    await expect(downloadSelect).not.toHaveValue('', { timeout: 20000 });
    const paperId = await downloadSelect.inputValue();
    await page.getByRole('button', { name: 'Export PDF' }).click();

    await expect(page.getByText(paperId)).toBeVisible();
  });

  test('Notes -> save note', async ({ page, request }) => {
    test.skip(!(await backendReady(request)), 'Backend not reachable');

    const tokens = await getTokens(request, email, password);
    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('rpa_access_token', access);
        localStorage.setItem('rpa_refresh_token', refresh);
      },
      tokens
    );

    await page.goto('/dashboard/notes');
    const notesSelect = page.locator('select').first();
    await expect(notesSelect).not.toHaveValue('', { timeout: 20000 });

    const note = `E2E note ${Date.now()}`;
    await page.locator('textarea').fill(note);
    await page.getByRole('button', { name: 'Save Now' }).click();

    await expect(page.getByText('Note saved')).toBeVisible();
  });

  test('Chatbot -> send message', async ({ page, request }) => {
    test.skip(!(await backendReady(request)), 'Backend not reachable');

    const tokens = await getTokens(request, email, password);
    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('rpa_access_token', access);
        localStorage.setItem('rpa_refresh_token', refresh);
      },
      tokens
    );

    await page.goto('/dashboard/chatbot');
    const msg = `Hello from e2e ${Date.now()}`;
    await page.getByPlaceholder('Ask about the paper, summary, or query...').fill(msg);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText(msg)).toBeVisible();
  });

  test('Connected graph loads', async ({ page, request }) => {
    test.skip(!(await backendReady(request)), 'Backend not reachable');

    const tokens = await getTokens(request, email, password);
    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem('rpa_access_token', access);
        localStorage.setItem('rpa_refresh_token', refresh);
      },
      tokens
    );

    await page.goto('/dashboard/connected-graph');
    await expect(page.locator('div.h-\\[460px\\] svg')).toBeVisible();
  });
});
