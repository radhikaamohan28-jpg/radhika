import { WorkflowHistory, getNextSequence } from '../models/index.js';

export interface WorkflowHistoryEntry {
  sampleId: number;
  eventType: string;
  previousStatus: string | null;
  newStatus: string;
  userId?: number | null;
  userName?: string | null;
  comments?: string | null;
}

export async function recordWorkflowHistory(entry: WorkflowHistoryEntry): Promise<void> {
  try {
    const nextId = await getNextSequence('workflow_history');
    await WorkflowHistory.create({
      id: nextId,
      sample_id: entry.sampleId,
      event_type: entry.eventType,
      previous_status: entry.previousStatus || null,
      new_status: entry.newStatus,
      user_id: entry.userId || null,
      user_name: entry.userName || 'System',
      comments: entry.comments || null,
      created_at: new Date(),
    });
  } catch (error) {
    console.error('Failed to write workflow history entry to MongoDB:', error);
  }
}
