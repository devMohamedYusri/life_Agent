import { useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { Task, Goal, Habit, JournalEntry } from '../../lib/export';

export const useAIAgent = () => {
  const { supabase } = useSupabase();

  const addTask = useCallback(async (task: Partial<Task>) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [supabase]);

  const addGoal = useCallback(async (goal: Partial<Goal>) => {
    const { data, error } = await supabase
      .from('goals')
      .insert([goal])
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [supabase]);

  const addHabit = useCallback(async (habit: Partial<Habit>) => {
    const { data, error } = await supabase
      .from('habits')
      .insert([habit])
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [supabase]);

  const addJournalEntry = useCallback(async (entry: Partial<JournalEntry>) => {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([entry])
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [supabase]);

  return {
    addTask,
    addGoal,
    addHabit,
    addJournalEntry
  };
}; 