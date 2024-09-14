import { createContext } from 'react';

export const SelectionContext = createContext<DOMRect | null>(null);
