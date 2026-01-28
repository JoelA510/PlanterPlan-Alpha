
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

## Browser Agent Testing Rules (CRITICAL)

1.  **Credentials Source**: 
    - **NEVER** use hardcoded or guessed credentials.
    - **ALWAYS** read the `.env` file first to retrieve `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`.

2.  **Login Hygiene (MANDATORY)**:
    - **Step 1: Clear Fields**: Before typing, YOU MUST execute JavaScript to clear the fields.
      ```javascript
      document.getElementById('email').value = '';
      document.getElementById('password').value = '';
      ```
    - **Step 2: Type Credentials**: Enter the values retrieved from `.env`.
    - **Step 3 (Fallback)**: If standard typing fails, use JS to set values and dispatch events:
      ```javascript
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
        
        if (valueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else {
          valueSetter.call(element, value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setNativeValue(document.getElementById('email'), 'EMAIL_FROM_ENV');
      setNativeValue(document.getElementById('password'), 'PASSWORD_FROM_ENV');
      ```

3.  **Validation**: 
    - Verify login success by checking for post-login indicators (e.g., Dashboard URL, Sidebar content, User Profile).
    - If login fails, **STOP** and report the screenshot. Do not retry aimlessly.
