import { NextResponse } from 'next/server';
import { client } from '@//lib/supabase';

export async function GET() {
  try {
    const now = new Date().toISOString();

    // Find pending notifications that are scheduled for now or in the past
    const { data: notifications, error } = await client
      .from('notifications')
      .select('id')
      .eq('status', 'pending')
      .lte('scheduled_for', now);

    if (error) {
      throw new Error(`Error fetching scheduled notifications: ${error.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No pending notifications to process.' });
    }

    const notificationIds = notifications.map(n => n.id);

    // In a real system, you would trigger push/email notifications here.
    // For now, we just update their status to 'sent'.
    const { error: updateError } = await client
      .from('notifications')
      .update({ status: 'sent' })
      .in('id', notificationIds);

    if (updateError) {
      throw new Error(`Error updating notification statuses: ${updateError.message}`);
    }

    return NextResponse.json({
      message: `Successfully processed ${notifications.length} notifications.`,
      processedIds: notificationIds,
    });

  } catch (error) {
    console.error('Cron job for notifications failed:', error);
    const err = error as Error;
    return NextResponse.json({ error: 'Cron job failed', details: err.message }, { status: 500 });
  }
} 