import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RecordProvider, useRecordContext } from '../contexts/RecordContext';
import type { ReactNode } from 'react';

// Wrapper to provide the RecordContext
const wrapper = ({ children }: { children: ReactNode }) => (
    <RecordProvider showToast={() => {}}>{children}</RecordProvider>
);

describe('RecordContext', () => {
    it('should initialize with default record values and non-editing state', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        expect(result.current.record).toBeDefined();
        expect(result.current.record.patientFields.length).toBeGreaterThan(0);
        expect(result.current.isEditing).toBe(false);
        expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should allow toggling the editing state', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        act(() => {
            result.current.setIsEditing(true);
        });

        expect(result.current.isEditing).toBe(true);
    });

    it('should update patient fields and set hasUnsavedChanges', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        act(() => {
            result.current.handlePatientFieldChange(0, 'John Doe');
        });

        expect(result.current.record.patientFields[0].value).toBe('John Doe');
        expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should handle adding and removing sections', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        const initialSectionCount = result.current.record.sections.length;

        act(() => {
            result.current.handleAddSection({ title: 'Test Section', content: 'Test Content' } as any);
        });

        expect(result.current.record.sections.length).toBe(initialSectionCount + 1);
        expect(result.current.record.sections[initialSectionCount].title).toBe('Test Section');

        act(() => {
            result.current.handleRemoveSection(initialSectionCount);
        });

        expect(result.current.record.sections.length).toBe(initialSectionCount);
    });
});
