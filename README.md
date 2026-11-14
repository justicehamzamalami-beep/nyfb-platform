# nyfb-platform

## Performance branch notes

The `perf/admin-realtime-refresh-throttle` branch contains a review-only set of client request reductions:

- Admin realtime refreshes are debounced and limited to membership changes while the tab is visible.
- Member dashboard referral summary uses exact database counts rather than downloading every referral row.
- Personal notification refreshes are debounced during realtime event bursts.

These changes are not production until the pull request is reviewed, the preview build passes, and member/admin workflows are smoke-tested.
