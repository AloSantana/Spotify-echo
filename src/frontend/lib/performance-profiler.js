/**
 * React Profiler onRender callback function.
 * Logs performance data to the console for analysis.
 *
 * @param {string} id - The "id" prop of the Profiler tree that has just committed.
 * @param {'mount' | 'update'} phase - Identifies if the tree has just been mounted or re-rendered.
 * @param {number} actualDuration - Time spent rendering the committed update.
 * @param {number} baseDuration - Estimated time to render the entire subtree without memoization.
 * @param {number} startTime - When React began rendering this update.
 * @param {number} commitTime - When React committed this update.
 * @param {Set<object>} interactions - The set of interactions belonging to this update.
 */
export const onRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
  interactions
) => {
  const performanceData = {
    profilerId: id,
    phase,
    actualDuration: `${actualDuration.toFixed(2)}ms`,
    baseDuration: `${baseDuration.toFixed(2)}ms`,
    startTime: `${startTime.toFixed(2)}ms`,
    commitTime: `${commitTime.toFixed(2)}ms`,
    interactions: Array.from(interactions),
  };

  // Log performance data to the console for analysis
  console.group(`Profiler [${id}]`);
  console.log(`Phase: ${phase}`);
  console.log(`Actual duration: ${performanceData.actualDuration}`);
  console.log(`Base duration: ${performanceData.baseDuration}`);
  console.groupEnd();
};
