// lib/database/notifications.ts
import { client } from '../supabase'

interface CustomNotificationOptions extends NotificationOptions {
  vibrate?: number[];
}

interface NotificationPayload {
  id: string;
  user_id: string;
  type: 'task_reminder' | 'habit_reminder' | 'goal_deadline' | 'achievement' | 'general';
  entity_id?: string;
  entity_type?: 'task' | 'goal' | 'habit';
  title: string;
  message: string;
  scheduled_for?: string;
  status: 'pending' | 'sent' | 'read';
  read_at?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface Notification {
  id: string
  user_id: string
  type: 'task_reminder' | 'habit_reminder' | 'goal_deadline' | 'achievement' | 'general'
  entity_id?: string
  entity_type?: 'task' | 'goal' | 'habit'
  title: string
  message: string
  scheduled_for?: string
  status: 'pending' | 'sent' | 'read'
  read_at?: string
  created_at: string
  metadata?: Record<string, unknown>
}

interface Task {
  task_id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string
  is_completed: boolean
  category?: { name: string; color: string; icon: string }
  goal?: { title: string }
}

interface Habit {
  habit_id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}

interface Goal {
  goal_id: string;
  title: string;
  deadline: string | null;
}

interface NotificationSettings {
  emailReminders: boolean;
  taskDeadlines: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  habitReminders: boolean;
  browserNotifications: boolean;
}

export const notificationService = {
  // Create a notification
  async create(notification: Partial<Notification> & { user_id: string }) {
    const { data, error } = await client
      .from('notifications')
      .insert({
        ...notification,
        status: notification.status || 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  },

  // Get all notifications for a user
  async getAll(userId: string) {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  },

  // Get upcoming notifications
  async getUpcoming(userId: string) {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10)

    if (error) throw error
    return { data, error: null }
  },

  // Get unread notifications
  async getUnread(userId: string) {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'sent'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    const { data, error } = await client
      .from('notifications')
      .update({ 
        status: 'read', 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  },

  // Mark all as read
  async markAllAsRead(userId: string) {
    const { error } = await client
      .from('notifications')
      .update({ 
        status: 'read', 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .in('status', ['pending', 'sent'])

    if (error) throw error
    return { error: null }
  },

  // Delete notification
  async delete(notificationId: string) {
    const { error } = await client
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
    return { error: null }
  },

  // Schedule a task reminder
  async scheduleTaskReminder(userId: string, taskId: string, task: Task, reminderTime: Date) {
    return this.create({
      user_id: userId,
      type: 'task_reminder',
      entity_id: taskId,
      entity_type: 'task',
      title: 'Task Reminder',
      message: `Don't forget: ${task.title}`,
      scheduled_for: reminderTime.toISOString(),
      metadata: {
        task_title: task.title,
        task_priority: task.priority,
        task_due_date: task.due_date
      }
    })
  },

  // Schedule a habit reminder
  async scheduleHabitReminder(userId: string, habitId: string, habit: Habit, reminderTime: Date) {
    return this.create({
      user_id: userId,
      type: 'habit_reminder',
      entity_id: habitId,
      entity_type: 'habit',
      title: 'Habit Check-in',
      message: `Time to check in: ${habit.name}`,
      scheduled_for: reminderTime.toISOString(),
      metadata: {
        habit_name: habit.name,
        habit_frequency: habit.frequency
      }
    })
  },

  // Schedule a goal deadline reminder
  async scheduleGoalDeadline(userId: string, goalId: string, goal: Goal, reminderTime: Date) {
    return this.create({
      user_id: userId,
      type: 'goal_deadline',
      entity_id: goalId,
      entity_type: 'goal',
      title: 'Goal Deadline Approaching',
      message: `Your goal "${goal.title}" deadline is approaching`,
      scheduled_for: reminderTime.toISOString(),
      metadata: {
        goal_title: goal.title,
        goal_deadline: goal.deadline
      }
    })
  },

  // Update notification settings
  async updateSettings(userId: string, settings: NotificationSettings) {
    const { error } = await client
      .from('notification_settings')
      .upsert({ user_id: userId, ...settings })

    if (error) throw error
    return { error: null }
  }
}

// Browser notification functionality
export class BrowserNotificationService {
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  static async showNotification(title: string, options?: CustomNotificationOptions) {
    const hasPermission = await this.requestPermission()
    
    if (hasPermission) {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return notification
    }
  }

  static async scheduleNotification(
    title: string, 
    options: CustomNotificationOptions, 
    delay: number
  ) {
    setTimeout(() => {
      this.showNotification(title, options)
    }, delay)
  }

  static async showFromDatabaseNotification(notification: Notification) {
    const options: CustomNotificationOptions = {
      body: notification.message,
      tag: notification.id,
      data: notification,
      requireInteraction: notification.type !== 'general'
    }

    // Add type-specific options
    if (notification.type === 'task_reminder' && notification.metadata?.task_priority === 'high') {
      options.requireInteraction = true
      options.vibrate = [200, 100, 200]
    }

    await this.showNotification(notification.title, options)
  }
}

// Integrated notification manager
export const NotificationManager = {
  // Check and show browser notifications for upcoming events
  async checkAndShowNotifications(userId: string) {
    try {
      const { data: notifications } = await notificationService.getUpcoming(userId)
      
      if (!notifications) return

      notifications.forEach((notification: Notification) => {
        const timeDiff = notification.scheduled_for 
          ? new Date(notification.scheduled_for).getTime() - Date.now()
          : 0
        
        if (timeDiff > 0 && timeDiff < 3600000) { // Within 1 hour
          BrowserNotificationService.scheduleNotification(
            notification.title,
            {
              body: notification.message,
              tag: notification.id,
              data: notification
            },
            timeDiff
          )
        }
      })
    } catch (error) {
      console.error('Error checking notifications:', error)
    }
  },

  // Create and optionally show a notification immediately
  async createAndShow(notification: Partial<Notification> & { user_id: string }, showNow = false) {
    const { data } = await notificationService.create(notification)
    
    if (data && showNow) {
      await BrowserNotificationService.showFromDatabaseNotification(data)
    }
    
    return data
  },

  // Get notification count for badge
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data } = await notificationService.getUnread(userId)
      return data?.length || 0
    } catch (error) {
      console.error('Error getting notification count:', error)
      return 0
    }
  }
}

export async function createNotification(notification: NotificationPayload) {
  let data: NotificationPayload;
  try {
    const { data: result, error } = await client
      .from('notifications')
      .insert(notification)
      .select()
      .single()
    
    if (error) throw error
    data = result
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
  return data
}