---
name: Detached background task containment
description: Safety rule for API work started outside an awaited request or startup chain.
---

Any Promise launched from a timer, recovery hook, startup callback, or other detached path must end at an explicit rejection boundary that logs failure without terminating the API process. Promises that are part of an active request should remain awaited so request error handling can respond normally.

**Why:** A transient database timeout in detached account-deletion recovery escaped as an unhandled rejection and shut down the whole API process.

**How to apply:** When adding fire-and-forget API work, route it through the shared safe background-task boundary and test both success and rejection containment. Never use an empty catch or silently discard the error.