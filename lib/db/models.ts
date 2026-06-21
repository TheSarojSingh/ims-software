// Central registry — import this file to guarantee all schemas are registered.
// mongodb.ts does `await import('@/lib/db/models')` on every cold start.
export { Institute }    from '@/models/Institute';
export { Admin }        from '@/models/Admin';
export { Faculty }      from '@/models/Faculty';
export { Section }      from '@/models/Section';
export { ClassEntry }   from '@/models/ClassEntry';
export { RoutineImport} from '@/models/RoutineImport';