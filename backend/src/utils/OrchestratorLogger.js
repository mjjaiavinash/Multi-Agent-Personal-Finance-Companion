/**
 * OrchestratorLogger
 *
 * Tracks the execution of each pipeline stage with:
 *  - Start / end timestamps
 *  - Duration in milliseconds
 *  - Status: "pending" | "success" | "failed" | "skipped"
 *  - Error message if the stage failed
 *
 * Design: immutable stage records — each call to start/complete/fail
 * returns a new record rather than mutating state, making the log
 * safe to read at any point during execution.
 *
 * Usage:
 *   const logger = new OrchestratorLogger();
 *   logger.start("categorizer");
 *   logger.complete("categorizer");
 *   logger.fail("patterns", new Error("Gemini timeout"));
 *   const log = logger.getLog();
 */
class OrchestratorLogger {
  constructor() {
    // Map of stageName → { status, startedAt, completedAt, durationMs, error }
    this._stages = new Map();
    this._pipelineStart = Date.now();
  }

  /**
   * Marks a stage as started.
   * @param {string} stage
   */
  start(stage) {
    this._stages.set(stage, {
      status:      "pending",
      startedAt:   new Date().toISOString(),
      completedAt: null,
      durationMs:  null,
      error:       null,
    });
    console.log(`[Orchestrator] ▶ Stage "${stage}" started`);
  }

  /**
   * Marks a stage as successfully completed.
   * @param {string} stage
   */
  complete(stage) {
    const entry = this._stages.get(stage);
    if (!entry) return;

    const completedAt = new Date();
    const startedAt   = new Date(entry.startedAt);
    const durationMs  = completedAt.getTime() - startedAt.getTime();

    this._stages.set(stage, {
      ...entry,
      status:      "success",
      completedAt: completedAt.toISOString(),
      durationMs,
    });
    console.log(`[Orchestrator] ✓ Stage "${stage}" completed in ${durationMs}ms`);
  }

  /**
   * Marks a stage as failed with an error message.
   * @param {string} stage
   * @param {Error}  err
   */
  fail(stage, err) {
    const entry = this._stages.get(stage) || {
      status:    "failed",
      startedAt: new Date().toISOString(),
    };

    const completedAt = new Date();
    const startedAt   = new Date(entry.startedAt);
    const durationMs  = completedAt.getTime() - startedAt.getTime();

    this._stages.set(stage, {
      ...entry,
      status:      "failed",
      completedAt: completedAt.toISOString(),
      durationMs,
      error:       err?.message || "Unknown error",
    });
    console.error(`[Orchestrator] ✗ Stage "${stage}" failed after ${durationMs}ms: ${err?.message}`);
  }

  /**
   * Marks a stage as skipped (e.g. a dependency stage failed).
   * @param {string} stage
   * @param {string} reason
   */
  skip(stage, reason = "Dependency stage failed") {
    this._stages.set(stage, {
      status:      "skipped",
      startedAt:   new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs:  0,
      error:       reason,
    });
    console.warn(`[Orchestrator] ⊘ Stage "${stage}" skipped: ${reason}`);
  }

  /**
   * Returns the full execution log as a plain object.
   * Includes per-stage records and overall pipeline timing.
   *
   * @returns {Object}
   */
  getLog() {
    const stages = {};
    for (const [name, record] of this._stages.entries()) {
      stages[name] = record;
    }

    const totalDurationMs = Date.now() - this._pipelineStart;
    const stageList       = Array.from(this._stages.values());
    const successCount    = stageList.filter((s) => s.status === "success").length;
    const failedCount     = stageList.filter((s) => s.status === "failed").length;
    const skippedCount    = stageList.filter((s) => s.status === "skipped").length;

    return {
      stages,
      pipeline: {
        totalDurationMs,
        totalStages:   stageList.length,
        successCount,
        failedCount,
        skippedCount,
        completedAt:   new Date().toISOString(),
      },
    };
  }

  /**
   * Returns the overall pipeline status based on stage outcomes.
   *
   * "success"  — all stages succeeded
   * "partial"  — some stages failed but at least one succeeded
   * "failed"   — all stages failed
   *
   * @returns {"success" | "partial" | "failed"}
   */
  getPipelineStatus() {
    const stages      = Array.from(this._stages.values());
    const successCount = stages.filter((s) => s.status === "success").length;
    const failedCount  = stages.filter((s) => s.status === "failed").length;

    if (failedCount === 0)                    return "success";
    if (successCount > 0 && failedCount > 0)  return "partial";
    return "failed";
  }
}

export default OrchestratorLogger;
