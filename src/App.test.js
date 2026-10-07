import { fireEvent, render, screen } from '@testing-library/react';
import { WhitewaterSections } from './WhitewaterSections';

const river = {
  name: 'Snake River',
  grade: 'II',
  segments: [
    { name: 'Upper Run', grade: 'III' },
    { name: 'Lower Run' }
  ]
};

test('lists whitewater sections with their rapid classes', () => {
  render(
    <WhitewaterSections
      river={river}
      selectedSegment={river.segments[0]}
      onSelect={jest.fn()}
      gradeColors={{ II: '#3498db', III: '#8e44ad' }}
    />
  );

  expect(screen.getByRole('button', { name: 'Upper Run Class III' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Lower Run Class II' })).toHaveAttribute('aria-pressed', 'false');
});

test('selecting a section notifies the parent', () => {
  const onSelect = jest.fn();
  render(
    <WhitewaterSections
      river={river}
      selectedSegment={river.segments[0]}
      onSelect={onSelect}
      gradeColors={{ II: '#3498db', III: '#8e44ad' }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Lower Run Class II' }));
  expect(onSelect).toHaveBeenCalledWith(river.segments[1]);
});
