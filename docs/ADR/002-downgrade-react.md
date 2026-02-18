Title: Downgrade React to v18
Context: ProjectView crashed with "Invalid hook call" / "Cannot read properties of null (reading 'useMemo')" when using @dnd-kit with React 19.2.0.
Decision: Downgrade React to 18.3.1.
Consequences: Improved compatibility with ecosystem libraries.
Rollback: Revert package.json changes.
Owner: Antigravity
Reviewer: User
