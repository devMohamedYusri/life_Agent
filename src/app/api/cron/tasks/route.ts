import { NextResponse } from 'next/server';
import { client } from '@//lib/supabase';
import { notificationService } from '@//lib/database/notifications';
// import { Task } from '../../../lib/database/tasks';

// Helper function to get all active users
async function getActiveUserIds(): Promise<string[]> {
  const { data, error } = await client
    .from('users')
    .select('id')
    .eq('status', 'active');

  if (error) throw error;
  return data.map(user => user.id);
}

export async function GET() {
  try {
    const userIds = await getActiveUserIds();
    let notificationsCreated = 0;
    const notifications = notificationService(client);

    for (const userId of userIds) {
      // --- 1. Overdue Tasks Notification ---
      const { data: overdueTasks } = await client
        .from('tasks')
        .select('id, title')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .lt('due_date', new Date().toISOString());

      if (overdueTasks && overdueTasks.length > 0) {
        // To avoid spam, we'll only send one overdue notice per run if they haven't been notified recently.
        // For a real app, you'd check the last notification time. For now, we'll just send it.
        await notifications.create({
          user_id: userId,
          type: 'task_reminder',
          title: 'You have overdue tasks!',
          message: `You have ${overdueTasks.length} task(s) that are past their due date.`,
        });
        notificationsCreated++;
      }

      // --- 2. Tasks Due Soon (next hour) ---
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const { data: dueSoonTasks } = await client
        .from('tasks')
        .select('id, title')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .gte('due_date', now.toISOString())
        .lte('due_date', oneHourFromNow.toISOString());

      if (dueSoonTasks && dueSoonTasks.length > 0) {
        for (const task of dueSoonTasks) {
            await notifications.create({
                user_id: userId,
                type: 'task_reminder',
                title: 'Task Due Soon',
                message: `Your task "${task.title}" is due in the next hour.`,
                entity_id: task.id,
                entity_type: 'task',
            });
            notificationsCreated++;
        }
      }
      
      // --- 3. Daily Task Summary (e.g., run this cron at 8 AM) ---
      // This part of the logic should only run if the cron job is triggered at a specific time of day.
      // You would add a condition here, e.g., if (new Date().getHours() === 8) { ... }
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: todayTasks } = await client
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .gte('due_date', todayStart.toISOString())
        .lte('due_date', todayEnd.toISOString());

      if (todayTasks && todayTasks.length > 0) {
          // You would add logic here to only send this once per day.
          await notifications.create({
              user_id: userId,
              type: 'task_reminder',
              title: 'Your Daily Summary',
              message: `You have ${todayTasks.length} tasks scheduled for today.`,
          });
          notificationsCreated++;
      }
    }

    return NextResponse.json({
      message: `Task cron job ran successfully. Created ${notificationsCreated} notifications.`,
    });

  } catch (error) {
    console.error('Task cron job failed:', error);
    const err = error as Error;
    return NextResponse.json({ error: 'Task cron job failed', details: err.message }, { status: 500 });
  }
} 