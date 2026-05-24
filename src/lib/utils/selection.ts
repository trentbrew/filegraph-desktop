import type { MouseEvent } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';

type SelectionEvent =
  | Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey'>
  | undefined;

export const isMultiSelectEvent = (event?: SelectionEvent) =>
  Boolean(event?.metaKey || event?.ctrlKey || event?.shiftKey);

export const buildSelectionState = (
  currentSelection: RowSelectionState,
  itemKey: string,
  checked: boolean,
  event?: SelectionEvent,
) => {
  const nextSelection = isMultiSelectEvent(event)
    ? { ...currentSelection }
    : {};

  if (checked) {
    nextSelection[itemKey] = true;
  } else {
    delete nextSelection[itemKey];
  }

  return nextSelection;
};
