// Plugin activation happens at builder time and some tests toggle it via a process-wide
// environment variable, so tests must not run in parallel.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
