import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('joins truthy class values and drops falsy ones', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('lets later Tailwind utilities win over conflicting earlier ones', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('merges conditional object and array inputs', () => {
    expect(cn('base', { active: true, hidden: false }, ['x', 'y'])).toBe('base active x y');
  });
});
