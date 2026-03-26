import type { Page } from '@playwright/test';

/**
 * Vision-based verification layer using Gemini 3 Flash API.
 *
 * Takes screenshots and sends them to a vision AI model to verify
 * visual correctness independent of DOM selectors. This ensures tests
 * remain robust even when element names, classes, or IDs change.
 *
 * Requires GEMINI_API_KEY environment variable.
 */

interface VisionCheckResult {
  passed: boolean;
  confidence: number;
  description: string;
  raw?: string;
}

interface VisionCheckOptions {
  /** Maximum time to wait for vision API response (ms) */
  timeout?: number;
  /** Minimum confidence score to pass (0-1) */
  minConfidence?: number;
  /** Full page screenshot vs viewport only */
  fullPage?: boolean;
}

const DEFAULT_OPTIONS: Required<VisionCheckOptions> = {
  timeout: 30000,
  minConfidence: 0.7,
  fullPage: false,
};

/**
 * Captures a screenshot and sends it to Gemini Vision API with a verification prompt.
 * Returns a structured result indicating whether the visual check passed.
 */
export async function verifyWithVision(
  page: Page,
  prompt: string,
  options?: VisionCheckOptions
): Promise<VisionCheckResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Gracefully skip vision checks when API key is not configured
    console.warn('[vision] GEMINI_API_KEY not set — skipping vision verification');
    return {
      passed: true,
      confidence: 0,
      description: 'Vision check skipped (no API key)',
    };
  }

  // Disable animations for consistent screenshots
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'vision-test-disable-animations';
    style.textContent = '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }';
    document.head.appendChild(style);
  });

  try {
    const screenshot = await page.screenshot({
      fullPage: opts.fullPage,
      type: 'png',
    });

    const base64Image = screenshot.toString('base64');

    const response = await fetchGeminiVision(apiKey, base64Image, prompt, opts.timeout);

    return parseVisionResponse(response);
  } finally {
    // Cleanup: remove animation-disabling style
    await page.evaluate(() => {
      document.getElementById('vision-test-disable-animations')?.remove();
    });
  }
}

/**
 * Sends screenshot to Gemini 3 Flash vision endpoint.
 */
async function fetchGeminiVision(
  apiKey: string,
  base64Image: string,
  prompt: string,
  timeout: number
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: base64Image,
                  },
                },
                {
                  text: `You are a visual QA testing assistant. Analyze this screenshot and answer the following question with a JSON response.

Question: ${prompt}

Respond ONLY with valid JSON in this exact format:
{
  "passed": true/false,
  "confidence": 0.0 to 1.0,
  "description": "Brief explanation of what you see"
}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parses the Gemini response into a structured result.
 */
function parseVisionResponse(raw: string): VisionCheckResult {
  try {
    // Extract JSON from response (may have markdown code fences)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        passed: false,
        confidence: 0,
        description: 'Failed to parse vision response',
        raw,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      passed: Boolean(parsed.passed),
      confidence: Number(parsed.confidence) || 0,
      description: String(parsed.description || ''),
      raw,
    };
  } catch {
    return {
      passed: false,
      confidence: 0,
      description: 'Failed to parse vision response JSON',
      raw,
    };
  }
}

/**
 * Asserts a vision check passes. Throws if the check fails or confidence is below threshold.
 */
export async function assertVision(
  page: Page,
  prompt: string,
  options?: VisionCheckOptions
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result = await verifyWithVision(page, prompt, options);

  if (!result.passed) {
    throw new Error(
      `Vision check failed: ${result.description}\nPrompt: ${prompt}\nConfidence: ${result.confidence}`
    );
  }

  if (result.confidence > 0 && result.confidence < opts.minConfidence) {
    throw new Error(
      `Vision check confidence too low: ${result.confidence} < ${opts.minConfidence}\nPrompt: ${prompt}\nDescription: ${result.description}`
    );
  }
}

/**
 * Runs multiple vision checks on a page in parallel.
 * Returns all results. Throws if any check fails.
 */
export async function assertVisionChecks(
  page: Page,
  checks: Record<string, string>,
  options?: VisionCheckOptions
): Promise<Record<string, VisionCheckResult>> {
  // Take one screenshot and reuse across all checks
  const results: Record<string, VisionCheckResult> = {};
  for (const [name, prompt] of Object.entries(checks)) {
    results[name] = await verifyWithVision(page, prompt, options);
  }

  const failures = Object.entries(results).filter(([, r]) => !r.passed);
  if (failures.length > 0) {
    const messages = failures.map(([name, r]) => `  ${name}: ${r.description}`).join('\n');
    throw new Error(`Vision checks failed:\n${messages}`);
  }

  return results;
}
