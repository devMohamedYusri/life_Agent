import { client } from '../supabase'

export const calendarService = {
  // Get all calendar events for user
  async getUserCalendarEvents(userId) {
    const { data, error } = await client
      .from('calendar_events')
      .select(`
        *,
        task:tasks(task_id, title, status)
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
    
    return { data, error }
  },

  // Get events by date range
  async getEventsByDateRange(userId, startDate, endDate) {
    const { data, error } = await client
      .from('calendar_events')
      .select(`
        *,
        task:tasks(task_id, title, status)
      `)
      .eq('user_id', userId)
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time', { ascending: true })
    
    return { data, error }
  },

  // Get events for today
  async getTodayEvents(userId) {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()
    
    const { data, error } = await client
      .from('calendar_events')
      .select(`
        *,
        task:tasks(task_id, title, status)
      `)
      .eq('user_id', userId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .order('start_time', { ascending: true })
    
    return { data, error }
  },

  // Get upcoming events
  async getUpcomingEvents(userId, limit = 10) {
    const now = new Date().toISOString()
    
    const { data, error } = await client
      .from('calendar_events')
      .select(`
        *,
        task:tasks(task_id, title, status)
      `)
      .eq('user_id', userId)
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(limit)
    
    return { data, error }
  },

  // Create new calendar event
  async createCalendarEvent(eventData) {
    const { data, error } = await client
      .from('calendar_events')
      .insert([eventData])
      .select(`
        *,
        task:tasks(task_id, title, status)
      `)
      .single()
    
    return { data, error }
  },

  // Update calendar event
  async updateCalendarEvent(eventId, updates) {
    const { data, error } = await client
      .from('calendar_events')
      .update(updates)
      .eq('event_id', eventId)
      .select(`
        *,
        task:tasks(task_id, title, status)
      `)
      .single()
    
    return { data, error }
  },

  // Delete calendar event
  async deleteCalendarEvent(eventId) {
    const { data, error } = await client
      .from('calendar_events')
      .delete()
      .eq('event_id', eventId)
    
    return { data, error }
  },

  // Get events by task
  async getEventsByTask(taskId) {
    const { data, error } = await client
      .from('calendar_events')
      .select('*')
      .eq('task_id', taskId)
      .order('start_time', { ascending: true })
    
    return { data, error }
  },

  // Get AI scheduled events
  async getAIScheduledEvents(userId) {
    const { data, error } = await client
      .from('calendar_events')
      .select(`
        *,
        task:tasks(task_id, title, status)
      `)
      .eq('user_id', userId)
      .eq('is_ai_scheduled', true)
      .order('start_time', { ascending: true })
    
    return { data, error }
  },

  // Check for conflicting events
  async checkEventConflicts(userId, startTime, endTime, excludeEventId = null) {
    let query = client
      .from('calendar_events')
      .select('event_id, title, start_time, end_time')
      .eq('user_id', userId)
      .or(`start_time.lte.${endTime},end_time.gte.${startTime}`)

    if (excludeEventId) {
      query = query.neq('event_id', excludeEventId)
    }

    const { data, error } = await query

    return { data, error }
  }
}