alter policy "Members submit own support groups"
on public.support_groups
with check (false);

alter policy "Members submit welfare applications"
on public.welfare_applications
with check (false);

alter policy "Members apply as campus mobilizers"
on public.campus_mobilizers
with check (false);

alter policy "Members RSVP to published events"
on public.event_attendance
with check (false);

alter policy "Members submit tasks"
on public.task_submissions
with check (false);

alter policy "Scoped leaders create events"
on public.events
with check (false);

alter policy "Scoped leaders create tasks"
on public.volunteer_tasks
with check (false);

alter policy "Members claim one daily login reward"
on public.reward_transactions
with check (false);
