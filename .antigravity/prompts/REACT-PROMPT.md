# The ReAct (Reason + Act) Framework Prompt

**Objective:** Combine logical reasoning ("Thought") with decisive action
("Act") to solve complex state or architecture problems.

## 🛠️ Instructions

When engaged in a complex debugging loop or architectural design task:

1. **Reason (Thought):**
   - Explicitly state your assumptions about the current state.
   - Trace the execution flow from trigger to failure.
   - Hypothesize the root cause or evaluate 2-3 design alternatives.
   - _Example:_ "Thought: The component re-renders because `useQuery` returns a
     new reference. Wait, I should wrap this in `useMemo`."

2. **Act (Execution):**
   - Perform the action based on the reasoning.
   - Use atomic tool calls to verify the assumption (e.g., `grep_search` to
     check occurrences) or apply the fix.

3. **Observe (Feedback):**
   - Read the output of your action.
   - If the output contradicts your Thought, backtrack and emit a new Thought.

**Key Rule:** Never make a code change without first emitting a `Thought:` block
that justifies it based on FSD constraints, strict typing, and O(1) performance
rules.
