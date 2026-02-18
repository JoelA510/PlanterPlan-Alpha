import { useState, useEffect } from 'react'
import {
    DragEndEvent,
    DragOverEvent,
    DragStartEvent
} from '@dnd-kit/core'

import { TaskNode } from '@/shared/lib/tree-helpers'
import { useUpdateTask } from './useTaskMutations'

export function useTaskTreeDnD(initialTree: TaskNode[]) {
    // Helper to traverse and populate map
    const deriveItems = (nodes: TaskNode[]) => {
        const newItems: Record<string, string[]> = {}
        const traverse = (n: TaskNode[]) => {
            n.forEach(node => {
                newItems[node.id] = node.children.map(c => c.id)
                traverse(node.children)
            })
        }
        traverse(nodes)
        return newItems
    }

    const [items, setItems] = useState<Record<string, string[]>>(() => deriveItems(initialTree))
    const [prevTree, setPrevTree] = useState(initialTree)

    // Sync state from props (pattern from React docs)
    if (initialTree !== prevTree) {
        setPrevTree(initialTree)
        setItems(deriveItems(initialTree))
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    // Helper to check if source is an ancestor of target
    const isAncestor = (sourceId: string, targetId: string) => {
        if (sourceId === targetId) return true

        // Find children of source from current items state
        const children = items[sourceId] || []
        for (const childId of children) {
            if (isAncestor(childId, targetId)) return true
        }
        return false
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // Cycle detection: Cannot drop a node into its own descendant
        // Note: 'over' could be a container (if we implemented container droppables) or an item
        // If we drop ON an item, we might be reparenting UNDER it or reordering NEXT to it.
        // If reordering next to it, it's fine unless we are moving a parent into its child's list.

        // Simplified check: validation should ideally happen before state update.
        // But for DragOver visual feedback, we might want to just block the update.

        // For now, let's implement strict ancestor check on the *target container*.
        // But finding the target container during DragOver depends on where we are.

        // If we are over an item, DndKit finds the container of that item.
        // If the container of the "over" item is a descendant of "active", BLOCK IT.

        const findContainer = (id: string) => {
            if (id in items) return id
            return Object.keys(items).find(key => items[key].includes(id))
        }

        const activeContainer = findContainer(activeId)
        const overContainer = findContainer(overId)

        if (
            !activeContainer ||
            !overContainer ||
            activeContainer === overContainer
        ) {
            return
        }

        // Check cycle: Is 'activeId' an ancestor of 'overContainer'?
        // The 'overContainer' is the parent of the item we are hovering over.
        // If we move 'activeId' to 'overContainer', 'activeId' becomes a child of 'overContainer'.
        // This is safe unless 'overContainer' is 'activeId' or one of its descendants.
        if (isAncestor(activeId, overContainer)) {
            // Cycle detected!
            return
        }

        // Move item between containers optimally
        setItems((prev) => {
            const activeItems = prev[activeContainer]
            const overItems = prev[overContainer]
            const activeIndex = activeItems.indexOf(activeId)
            const overIndex = overItems.indexOf(overId)

            let newIndex
            if (overId in prev) {
                // We're over a container placeholder?
                newIndex = overItems.length + 1
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top >
                    over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            return {
                ...prev,
                [activeContainer]: [
                    ...prev[activeContainer].filter((item) => item !== activeId)
                ],
                [overContainer]: [
                    ...prev[overContainer].slice(0, newIndex),
                    activeItems[activeIndex],
                    ...prev[overContainer].slice(newIndex, prev[overContainer].length)
                ]
            }
        })
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        const activeId = active.id as string
        const overId = over ? (over.id as string) : null

        if (activeId && overId) {
            // Find containers again
            const findContainer = (id: string) => {
                if (id in items) return id
                return Object.keys(items).find(key => items[key].includes(id))
            }

            const activeContainer = findContainer(activeId)
            const overContainer = findContainer(overId)

            if (activeContainer && overContainer) {
                const activeIndex = items[activeContainer].indexOf(activeId)
                const overIndex = items[overContainer].indexOf(overId)

                // Check cycle again before committing (double safety)
                if (activeContainer !== overContainer && isAncestor(activeId, overContainer)) {
                    // console.warn("Cycle detection blocked drop")
                    return
                }

                if (activeIndex !== overIndex || activeContainer !== overContainer) {
                    // Calculate new position
                    // We need to look at neighbors to calculate average position
                    // TODO: Implement sophisticated positioning based on surrounding items
                    const newPos = (overIndex) * 10000 + 5000

                    // Traverse to find where activeId ended up
                    const finalContainer = Object.keys(items).find(key => items[key].includes(activeId))

                    updateTask({
                        id: activeId,
                        parent_task_id: finalContainer === 'root' ? null : (finalContainer || null),
                        position: newPos
                    })

                    // No need to set items, DragOver did it.
                }
            }
        }

        setActiveId(null)
    }

    return {
        items,
        activeId,
        handleDragStart,
        handleDragOver,
        handleDragEnd
    }
}
