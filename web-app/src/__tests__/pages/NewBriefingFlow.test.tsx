/**
 * NewBriefing 3-step walkthrough — fills step 0, advances to topics, picks a
 * topic, advances to participants, adds one, then triggers the createBriefing
 * mutation via the WizardShell finish button.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@/test-utils';
import { renderPage } from '../helpers/renderPage';

vi.mock('@/lib/data/projects', async (io) => ({ ...(await io<object>()), listProjects: vi.fn() }));
vi.mock('@/lib/data/briefings', async (io) => ({ ...(await io<object>()), createBriefing: vi.fn() }));

import { listProjects } from '@/lib/data/projects';
import { createBriefing } from '@/lib/data/briefings';
import NewBriefing from '@/pages/NewBriefing';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([]);
});

describe('NewBriefing — step walkthrough', () => {
  it('renders step 0 with the project + inspector inputs', () => {
    renderPage(<NewBriefing />, '/briefings/new?project=p1');
    expect(screen.getByText('ახალი ინსტრუქტაჟი')).toBeInTheDocument();
    expect(screen.getByText('ინსტრუქტორი *')).toBeInTheDocument();
  });

  it('advances step 0 → step 1 once inspectorName is filled', () => {
    renderPage(<NewBriefing />, '/briefings/new?project=p1');
    // The inspector input is the FloatingLabelInput; query its underlying <input> by index.
    const inputs = document.body.querySelectorAll<HTMLInputElement>('input');
    // Step 0 has: datetime-local input + inspector text input (last input).
    const inspectorInput = inputs[inputs.length - 1];
    expect(inspectorInput).toBeTruthy();
    fireEvent.change(inspectorInput, { target: { value: 'ი. ინსპექტორი' } });

    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    // Step 1: topics. The known TOPIC_LABELS render as pill buttons.
    expect(screen.getByText('სიმაღლეზე მუშაობა')).toBeInTheDocument();
  });

  it('advances step 1 → step 2 once a topic is picked', () => {
    renderPage(<NewBriefing />, '/briefings/new?project=p1');
    const inputs = document.body.querySelectorAll<HTMLInputElement>('input');
    const inspectorInput = inputs[inputs.length - 1];
    fireEvent.change(inspectorInput, { target: { value: 'ი' } });
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Pick a topic.
    fireEvent.click(screen.getByText('სიმაღლეზე მუშაობა'));
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Step 2: participants — the "name, surname" placeholder appears.
    expect(screen.getByPlaceholderText('სახელი, გვარი')).toBeInTheDocument();
  });

  it('fires createBriefing when a participant is added and finish is clicked', async () => {
    vi.mocked(createBriefing).mockResolvedValue({ id: 'b1' } as never);
    renderPage(<NewBriefing />, '/briefings/new?project=p1');

    const inputs = document.body.querySelectorAll<HTMLInputElement>('input');
    const inspectorInput = inputs[inputs.length - 1];
    fireEvent.change(inspectorInput, { target: { value: 'ი' } });
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    fireEvent.click(screen.getByText('სიმაღლეზე მუშაობა'));
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Step 2: add a participant via the name input + "დამატება" button.
    fireEvent.change(screen.getByPlaceholderText('სახელი, გვარი'), { target: { value: 'მამა' } });
    fireEvent.click(screen.getByRole('button', { name: /დამატება/ }));

    // Now the finish button is enabled. WizardShell shows "დასრულება" on the last step.
    const finishBtn = screen.getByRole('button', { name: /დასრულება/ });
    fireEvent.click(finishBtn);

    await waitFor(() =>
      expect(createBriefing).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'p1', topics: ['height_work'], inspectorName: 'ი' }),
      ),
    );
  });
});
