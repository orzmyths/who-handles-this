import { useLanguage } from '@/language-context';
import copy from '@/workflow-copy.json';

export type WorkflowCopy = typeof copy.en;

export function useWorkflowCopy(): WorkflowCopy {
  const { language } = useLanguage();
  return ((copy as Record<string, WorkflowCopy>)[language] ?? copy.en);
}

export const lookup = (c: WorkflowCopy, prefix: string, key: string, fallback?: string) =>
  (c as Record<string, string>)[`${prefix}_${key}`] ?? fallback ?? key;
