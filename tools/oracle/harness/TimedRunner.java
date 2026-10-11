// SPDX-License-Identifier: EPL-2.0
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Runs cases on one worker thread with a per-case time limit (OR-2). A limit
 * of zero or less runs on the caller's thread without a bound.
 */
final class TimedRunner {

    private static final long NANOS_PER_MILLI = 1_000_000L;

    private final CaseRunner runner;
    private final long timeoutMs;
    private final ExecutorService worker;

    TimedRunner(final CaseRunner runner, final long timeoutMs) {
        this.runner = runner;
        this.timeoutMs = timeoutMs;
        this.worker = timeoutMs > 0 ? Executors.newSingleThreadExecutor(task -> {
            Thread thread = new Thread(task, "elk-oracle-case");
            thread.setDaemon(true);
            return thread;
        }) : null;
    }

    /** Returns the case result; its status is {@code timeout} when the limit passed. */
    CaseResult run(final CaseSpec spec) {
        if (worker == null) {
            return runner.run(spec);
        }
        long start = System.nanoTime();
        Future<CaseResult> future = worker.submit(() -> runner.run(spec));
        try {
            return future.get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            long ms = (System.nanoTime() - start) / NANOS_PER_MILLI;
            return new CaseResult(spec.id(), CaseResult.TIMEOUT, null, null, ms);
        } catch (InterruptedException | ExecutionException e) {
            throw new IllegalStateException("case runner failed: " + e, e);
        }
    }
}
