// Smoke tests for HistoryPage.tsx
// HistoryPage is a static accordion page — no auth, no data fetching.
// Tests confirm: title renders, sections are present, back button fires navigate,
// and accordion expand/collapse works.
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// useNavigate is the only router hook used by HistoryPage.
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { HistoryPage } from '../HistoryPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>
  );
}

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /history/i })).toBeInTheDocument();
  });

  it('renders the subtitle blurb', () => {
    renderPage();
    expect(
      screen.getByText(/400 years of cards, cons, and submarines/i)
    ).toBeInTheDocument();
  });

  it('renders all nine accordion section buttons', () => {
    renderPage();
    const sectionIds = [
      'origin',
      'evolution',
      'rules',
      'variations',
      'culture',
      'lingo',
      'stats',
      'skill',
      'fun',
    ];
    sectionIds.forEach(id => {
      expect(screen.getByTestId(`history-section-${id}`)).toBeInTheDocument();
    });
  });

  it('section content is hidden until the button is clicked', () => {
    renderPage();
    // "Sir John Suckling" appears in the Origin section body.
    expect(screen.queryByText(/Sir John Suckling/)).toBeNull();
  });

  it('expands a section when clicked and shows its content', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('history-section-origin'));

    expect(screen.getByText(/Sir John Suckling/)).toBeInTheDocument();
  });

  it('collapses an expanded section on second click', () => {
    renderPage();

    const originBtn = screen.getByTestId('history-section-origin');
    fireEvent.click(originBtn); // expand
    expect(screen.getByText(/Sir John Suckling/)).toBeInTheDocument();

    fireEvent.click(originBtn); // collapse
    expect(screen.queryByText(/Sir John Suckling/)).toBeNull();
  });

  it('multiple sections can be open simultaneously', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('history-section-origin'));
    fireEvent.click(screen.getByTestId('history-section-rules'));

    // Origin content visible
    expect(screen.getByText(/Sir John Suckling/)).toBeInTheDocument();
    // Rules content visible — unique phrase from the Rules section
    expect(screen.getByText(/121 points/)).toBeInTheDocument();
  });

  it('back button navigates to /', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('history-back-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders the source attribution footer', () => {
    renderPage();
    expect(screen.getByText(/Cribbage Research Report/i)).toBeInTheDocument();
  });
});
