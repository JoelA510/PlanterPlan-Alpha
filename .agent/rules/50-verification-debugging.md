
# Verification + Debugging (always-on)

## Verification requirement

For any logic change, API change, or schema change:

- Define the verification command(s): test, lint, typecheck, build.
- Attempt to run them in-terminal.
- If unable (blocked by missing env/secrets/services), report:
  - what you tried,
  - why it failed,
  - the exact command for a human to run,
  - expected outcome if successful.

## Debugging loop cap

Use the "Debug Loop (5)" workflow when a verification command fails.
Do not loop endlessly.

## Browser Agent Testing Rules

- **Credentials Source**: ALWAYS pull `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` from the `.env` file when a browser interaction requires login.
- **Form Hygiene**: ALWAYS clear input fields before filling them to prevent concatenation errors or double-typing.
- **Validation**: Verify login success by checking for post-login indicators (e.g., Dashboard URL, Sidebar content, User Profile).
