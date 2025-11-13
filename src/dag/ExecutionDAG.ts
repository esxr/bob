/**
 * ExecutionDAG - Directed Acyclic Graph for Task Execution
 *
 * Based on DAG_METHODS.md research:
 * - Cycle detection: DFS with white-grey-black coloring
 * - Topological sort: Kahn's algorithm for execution layers
 * - Parallel execution: Tasks in same layer execute concurrently
 */

import { PlanNode, ValidationResult, DAGStats, TaskStatus } from '../types/dag';

/**
 * ExecutionDAG manages task dependencies and execution order
 */
export class ExecutionDAG {
  private tasks: Map<string, PlanNode> = new Map();

  constructor(tasks: PlanNode[] = []) {
    tasks.forEach(task => this.tasks.set(task.id, task));
  }

  /**
   * Add a task to the DAG
   */
  addTask(task: PlanNode): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): PlanNode | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): PlanNode[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Update a task's properties
   */
  updateTask(id: string, updates: Partial<PlanNode>): void {
    const task = this.tasks.get(id);
    if (task) {
      Object.assign(task, updates);
    }
  }

  /**
   * Get all tasks that are ready to execute
   * (status=pending and all dependencies completed)
   */
  getReadyTasks(): PlanNode[] {
    const ready: PlanNode[] = [];

    for (const task of this.tasks.values()) {
      // Must be pending
      if (task.status !== 'pending') {
        continue;
      }

      // All dependencies must be completed
      const allDepsCompleted = task.dependsOn.every(depId => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'completed';
      });

      if (allDepsCompleted) {
        ready.push(task);
      }
    }

    return ready;
  }

  /**
   * Mark task as executing
   */
  markExecuting(taskId: string): void {
    this.updateTask(taskId, { status: 'executing' });
  }

  /**
   * Mark task as completed with result
   */
  completeTask(taskId: string, result: any): void {
    this.updateTask(taskId, {
      status: 'completed',
      result,
    });
  }

  /**
   * Mark task as failed with error
   */
  failTask(taskId: string, error: string): void {
    this.updateTask(taskId, {
      status: 'failed',
      error,
    });
  }

  /**
   * Validate DAG structure
   * - All dependencies exist
   * - No circular dependencies (cycle detection)
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // Check all dependencies exist
    for (const task of this.tasks.values()) {
      for (const depId of task.dependsOn) {
        if (!this.tasks.has(depId)) {
          errors.push(
            `Task "${task.id}" depends on non-existent task "${depId}"`
          );
        }
      }
    }

    // Check for cycles using DFS
    if (!this.hasCycles()) {
      // No cycles found - validation passed if no other errors
    } else {
      errors.push('Cycle detected in task dependencies');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect cycles using DFS with color coding
   * White (0): Unvisited
   * Grey (1): Currently visiting (in recursion stack)
   * Black (2): Completely visited
   *
   * A cycle exists if we encounter a grey node during DFS
   */
  private hasCycles(): boolean {
    const colors = new Map<string, number>();
    const recStack: string[] = [];

    // Initialize all nodes as white (unvisited)
    for (const id of this.tasks.keys()) {
      colors.set(id, 0);
    }

    const dfs = (taskId: string): boolean => {
      // Mark as grey (visiting)
      colors.set(taskId, 1);
      recStack.push(taskId);

      const task = this.tasks.get(taskId);
      if (task) {
        for (const depId of task.dependsOn) {
          const color = colors.get(depId) || 0;

          // Grey node encountered - cycle detected!
          if (color === 1) {
            const cycleStart = recStack.indexOf(depId);
            const cycle = recStack.slice(cycleStart).concat(depId);
            console.error(`Cycle detected: ${cycle.join(' -> ')}`);
            return true;
          }

          // White node - continue DFS
          if (color === 0) {
            if (dfs(depId)) {
              return true;
            }
          }
        }
      }

      // Mark as black (visited)
      colors.set(taskId, 2);
      recStack.pop();
      return false;
    };

    // Check all nodes
    for (const id of this.tasks.keys()) {
      if (colors.get(id) === 0) {
        if (dfs(id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get execution layers using topological sort (Kahn's algorithm)
   * Returns tasks grouped by execution level - all tasks in a layer can execute in parallel
   *
   * Example output: [
   *   [task1, task2],  // Layer 1: No dependencies
   *   [task3],         // Layer 2: Depends on Layer 1
   *   [task4, task5]   // Layer 3: Depends on Layer 2
   * ]
   */
  getExecutionLayers(): PlanNode[][] {
    // Initialize in-degrees - count incoming edges for each node
    // In Kahn's algorithm, in-degree = number of dependencies (tasks this task depends on)
    const inDegree = new Map<string, number>();
    for (const task of this.tasks.values()) {
      inDegree.set(task.id, task.dependsOn.length);
    }

    // Find all tasks with in-degree 0 (no dependencies)
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const layers: PlanNode[][] = [];
    let processedCount = 0;

    while (queue.length > 0) {
      // All tasks in current layer can execute in parallel
      const currentLayer: PlanNode[] = [];
      const layerIds = [...queue];
      queue.length = 0;

      for (const id of layerIds) {
        const task = this.tasks.get(id);
        if (task) {
          currentLayer.push(task);
          processedCount++;

          // Decrement in-degree for tasks that depend on this task
          for (const [depId, depTask] of this.tasks) {
            if (depTask.dependsOn.includes(id)) {
              const newDegree = inDegree.get(depId)! - 1;
              inDegree.set(depId, newDegree);
              if (newDegree === 0) {
                queue.push(depId);
              }
            }
          }
        }
      }

      if (currentLayer.length > 0) {
        layers.push(currentLayer);
      }
    }

    // Verify all tasks were processed (detects cycles)
    if (processedCount !== this.tasks.size) {
      throw new Error(
        `Cycle detected: processed ${processedCount} of ${this.tasks.size} tasks`
      );
    }

    return layers;
  }

  /**
   * Check if all tasks are completed
   */
  isComplete(): boolean {
    return this.getAllTasks().every(task => task.status === 'completed');
  }

  /**
   * Check if any tasks have failed
   */
  hasFailed(): boolean {
    return this.getAllTasks().some(task => task.status === 'failed');
  }

  /**
   * Get failed tasks
   */
  getFailedTasks(): PlanNode[] {
    return this.getAllTasks().filter(task => task.status === 'failed');
  }

  /**
   * Get execution statistics
   */
  getStats(): DAGStats {
    const tasks = this.getAllTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      executing: tasks.filter(t => t.status === 'executing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): PlanNode[] {
    return this.getAllTasks().filter(task => task.status === status);
  }

  /**
   * Get dependency results for a task
   */
  getDependencyResults(task: PlanNode): Record<string, any> {
    const results: Record<string, any> = {};

    for (const depId of task.dependsOn) {
      const dep = this.tasks.get(depId);
      if (dep && dep.result !== undefined) {
        results[depId] = dep.result;
      }
    }

    return results;
  }
}
