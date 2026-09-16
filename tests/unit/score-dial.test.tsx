import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreDial } from '@/components/aeroopt/score-dial';

describe('ScoreDial', () => {
  it('exposes an accessible label and renders the rounded score', () => {
    render(<ScoreDial score={90.4} />);
    const dial = screen.getByRole('status', { name: 'Travel optimization score 90.4 out of 100' });
    expect(dial).toBeInTheDocument();
    expect(dial).toHaveTextContent('90');
  });

  // jsdom normalises the inline hex colours to their rgb() equivalents.
  it('uses the green band for excellent scores', () => {
    render(<ScoreDial score={90} />);
    expect(screen.getByRole('status').getAttribute('style')).toContain('rgb(16, 185, 129)');
  });

  it('uses the red band for poor scores', () => {
    render(<ScoreDial score={40} />);
    expect(screen.getByRole('status').getAttribute('style')).toContain('rgb(239, 68, 68)');
  });
});
