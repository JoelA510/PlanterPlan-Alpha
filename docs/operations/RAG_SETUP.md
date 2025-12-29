# RAG Feature Setup (Opt-In)

The Retrieval Augmented Generation (RAG) features are **disabled by default** to avoid dependencies on Docker or Cloud environments during standard development.

## Prerequisite: Docker

Running the RAG backend (Edge Functions) locally requires **Docker**.

- **Main Workstation**: If you cannot run Docker, RAG features will be disabled.
- **Home Computer**: If you have Docker, you can enable RAG.

## How to Enable

1. **Environment Variable**:
    Add the following to your `.env` file (do not commit to git):

    ```bash
    REACT_APP_ENABLE_RAG=true
    ```

2. **Run the Backend (Requires Docker)**:

    ```bash
    # Start the local Edge Function
    supabase functions serve rag-answer --no-verify-jwt
    ```

3. **API Keys**:
    Ensure you have set the `GEMINI_API_KEY` secret locally:

    ```bash
    supabase secrets set GEMINI_API_KEY=your_key_here
    ```

## Database Migrations

The migration `supabase/migrations/20251227220000_rag_init.sql` enables the `vector` extension.

- If running against a **Remote Supabase Project**, this works automatically.
- If running against a **Local Non-Docker Postgres**, this may fail if `pgvector` is not installed. If it fails, you can delete the migration file on this machine or configure your local Postgres to support vectors.
