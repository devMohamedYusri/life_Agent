import { client } from '../supabase'

export const journalService = {
  // Get all journal entries for user
  async getUserJournalEntries(userId, limit = 50) {
    const { data, error } = await client
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(limit)
    
    return { data, error }
  },

  // Get journal entry by date
  async getJournalEntryByDate(userId, date) {
    const { data, error } = await client
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .single()
    
    return { data, error }
  },

  // Create new journal entry
  async createJournalEntry(entryData) {
    const { data, error } = await client
      .from('journal_entries')
      .insert([entryData])
      .select()
      .single()
    
    return { data, error }
  },

  // Update journal entry
  async updateJournalEntry(entryId, updates) {
    const { data, error } = await client
      .from('journal_entries')
      .update(updates)
      .eq('entry_id', entryId)
      .select()
      .single()
    
    return { data, error }
  },

  // Delete journal entry
  async deleteJournalEntry(entryId) {
    const { data, error } = await client
      .from('journal_entries')
      .delete()
      .eq('entry_id', entryId)
    
    return { data, error }
  },

  // Get entries by mood
  async getEntriesByMood(userId, mood) {
    const { data, error } = await client
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('mood', mood)
      .order('entry_date', { ascending: false })
    
    return { data, error }
  },

  // Get entries by tags
  async getEntriesByTag(userId, tag) {
    const { data, error } = await client
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .contains('tags', [tag])
      .order('entry_date', { ascending: false })
    
    return { data, error }
  },

  // Get mood statistics
  async getMoodStats(userId, startDate, endDate) {
    const { data, error } = await client
      .from('journal_entries')
      .select('mood, entry_date')
      .eq('user_id', userId)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .not('mood', 'is', null)
    
    if (error) return { data: null, error }

    const moodCounts = {}
    data?.forEach(entry => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1
    })

    return { data: moodCounts, error: null }
  },

  // Search journal entries
  async searchJournalEntries(userId, searchTerm) {
    const { data, error } = await client
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .or(`content.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      .order('entry_date', { ascending: false })
    
    return { data, error }
  },

  // Get recent entries
  async getRecentEntries(userId, days = 7) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data, error } = await client
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .order('entry_date', { ascending: false })
    
    return { data, error }
  }
}