// app/lib/export.ts
import { taskService } from './database/tasks';
import { goalService } from './database/goals';
import { habitService } from './database/habits';
import { journalService } from './database/journal';
import { categoryService } from './database/categories';
import { userService } from './database/users';
import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => void;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Define types for the data structures
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  category?: string;
  goal?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress?: number;
  deadline?: string;
  category?: string;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: string;
  reminder_time?: string;
  target_count?: number;
  streak?: number;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  content: string;
  mood?: string;
  tags?: string[];
}

// interface Category {
//   id: string;
//   user_id: string;
//   name: string;
//   color?: string;
// }

export const exportService = {
  async exportToJSON(userId: string) {
    try {
      // Gather all user data
      const [
        { data: tasks },
        { data: goals },
        { data: habits },
        { data: journalEntries },
        { data: categories },
        { data: userStats }
      ] = await Promise.all([
        taskService.getUserTasks(userId),
        goalService.getUserGoals(userId),
        habitService.getUserHabits(userId),
        journalService.getUserJournalEntries(userId),
        categoryService.getUserCategories(userId),
        userService.getUserStats(userId)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: {
          tasks,
          goals,
          habits,
          journalEntries,
          categories,
          stats: userStats
        }
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `life-manager-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      return { success: false, error };
    }
  },
  
  async exportToCSV(userId: string, type: 'tasks' | 'goals' | 'habits' | 'journal') {
    try {
      let data: (Task | Goal | Habit | JournalEntry)[] | undefined;
      let headers: string[];
      let filename: string;

      switch (type) {
        case 'tasks':
          const { data: tasks } = await taskService.getUserTasks(userId);
          data = tasks ?? [];
          headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Due Date', 'Category', 'Goal'];
          filename = 'tasks';
          break;
        case 'goals':
          const { data: goals } = await goalService.getUserGoals(userId);
          data = goals ?? [];
          headers = ['ID', 'Title', 'Description', 'Status', 'Progress', 'Deadline', 'Category'];
          filename = 'goals';
          break;
        case 'habits':
          const { data: habits } = await habitService.getUserHabits(userId);
          data = habits ?? [];
          headers = ['ID', 'Title', 'Description', 'Frequency', 'Reminder Time', 'Target Count'];
          filename = 'habits';
          break;
        case 'journal':
          const { data: entries } = await journalService.getUserJournalEntries(userId);
          data = entries ?? [];
          headers = ['ID', 'Date', 'Content', 'Mood', 'Tags'];
          filename = 'journal';
          break;
      }

      // Convert data to CSV
      const csvContent = [
        headers.join(','),
        ...(data || []).map((item: Task | Goal | Habit | JournalEntry) => {
          const values = headers.map(header => {
            const key = header.toLowerCase().replace(/\s+/g, '_') as keyof typeof item;
            const value = item[key];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          });
          return values.join(',');
        })
      ].join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `life-manager-${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      return { success: false, error };
    }
  },
  
  async importFromJSON(userId: string, file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate data structure
      if (!data.version || !data.data) {
        throw new Error('Invalid export file format');
      }

      const { tasks, goals, habits, journalEntries, categories } = data.data;

      // Import data in sequence to maintain referential integrity
      if (categories) {
        for (const category of categories) {
          await categoryService.createCategory({
            user_id: userId,
            ...category
          });
        }
      }

      if (goals) {
        for (const goal of goals) {
          await goalService.createGoal({
            user_id: userId,
            ...goal
          });
        }
      }

      if (tasks) {
        for (const task of tasks) {
          await taskService.createTask({
            user_id: userId,
            ...task
          });
        }
      }

      if (habits) {
        for (const habit of habits) {
          await habitService.createHabit({
            user_id: userId,
            ...habit
          });
        }
      }

      if (journalEntries) {
        for (const entry of journalEntries) {
          await journalService.createJournalEntry({
            user_id: userId,
            ...entry
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error importing from JSON:', error);
      return { success: false, error };
    }
  },

  async exportToPDF(userId: string) {
    try {
      // Gather all user data
      const [
        { data: tasks },
        { data: goals },
        { data: habits },
        { data: journalEntries },
        // Removed userStats since it's not used
      ] = await Promise.all([
        taskService.getUserTasks(userId),
        goalService.getUserGoals(userId),
        habitService.getUserHabits(userId),
        journalService.getUserJournalEntries(userId),
      ]);

      // Create PDF document with proper configuration for browser
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        floatPrecision: 16
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Add title
      doc.setFontSize(24);
      doc.setTextColor(102, 51, 153); // Purple color
      doc.text('Life Manager Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      // Add date
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      // Add stats summary
      doc.setFontSize(16);
      doc.setTextColor(102, 51, 153);
      doc.text('Summary', margin, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(0);
      
      // Calculate stats from actual data
      const completedTasks = (tasks as Task[])?.filter((task: Task) => task.status === 'completed').length || 0;
      const activeGoals = (goals as Goal[])?.filter((goal: Goal) => goal.status === 'active').length || 0;
      
      const stats = [
        ['Total Tasks', tasks?.length || 0],
        ['Completed Tasks', completedTasks],
        ['Total Goals', goals?.length || 0],
        ['Active Goals', activeGoals],
        ['Total Habits', habits?.length || 0]
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: stats,
        theme: 'grid',
        headStyles: { fillColor: [102, 51, 153] },
        margin: { left: margin },
        styles: { fontSize: 10, cellPadding: 5 }
      });
      yPos = doc.lastAutoTable.finalY + 20;

      // Add Tasks Overview
      if (tasks && tasks.length > 0) {
        doc.setFontSize(16);
        doc.setTextColor(102, 51, 153);
        doc.text('Tasks Overview', margin, yPos);
        yPos += 10;

        const taskData = (tasks as Task[]).map((task: Task) => [
          task.title,
          task.status,
          task.priority,
          task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Title', 'Status', 'Priority', 'Due Date']],
          body: taskData,
          theme: 'grid',
          headStyles: { fillColor: [102, 51, 153] },
          margin: { left: margin },
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 40 }
          }
        });
        yPos = doc.lastAutoTable.finalY + 20;
      }

      // Add Goals Progress
      if (goals && goals.length > 0) {
        doc.setFontSize(16);
        doc.setTextColor(102, 51, 153);
        doc.text('Goals Progress', margin, yPos);
        yPos += 10;

        const goalData = (goals as Goal[]).map((goal: Goal) => [
          goal.title,
          goal.status,
          `${goal.progress || 0}%`,
          goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Title', 'Status', 'Progress', 'Deadline']],
          body: goalData,
          theme: 'grid',
          headStyles: { fillColor: [102, 51, 153] },
          margin: { left: margin },
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 40 }
          }
        });
        yPos = doc.lastAutoTable.finalY + 20;
      }

      // Add Habits Tracking
      if (habits && habits.length > 0) {
        doc.setFontSize(16);
        doc.setTextColor(102, 51, 153);
        doc.text('Habits Tracking', margin, yPos);
        yPos += 10;

        const habitData = (habits as Habit[]).map((habit: Habit) => [
          habit.title,
          habit.frequency,
          habit.streak || 0,
          habit.reminder_time || 'No reminder'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Title', 'Frequency', 'Current Streak', 'Reminder']],
          body: habitData,
          theme: 'grid',
          headStyles: { fillColor: [102, 51, 153] },
          margin: { left: margin },
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 40 }
          }
        });
        yPos = doc.lastAutoTable.finalY + 20;
      }

      // Add Journal Summary
      if (journalEntries && journalEntries.length > 0) {
        doc.setFontSize(16);
        doc.setTextColor(102, 51, 153);
        doc.text('Recent Journal Entries', margin, yPos);
        yPos += 10;

        const journalData = (journalEntries as JournalEntry[]).slice(0, 10).map((entry: JournalEntry) => [
          new Date(entry.entry_date).toLocaleDateString(),
          entry.mood || 'No mood',
          entry.content.substring(0, 50) + '...'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Mood', 'Preview']],
          body: journalData,
          theme: 'grid',
          headStyles: { fillColor: [102, 51, 153] },
          margin: { left: margin },
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 100 }
          }
        });
      }

      // Save the PDF with proper MIME type
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `life-manager-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      return { success: false, error };
    }
  }
};