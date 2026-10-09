import { act, render, screen } from '@testing-library/react';
import { FlowChart, monthlyFlowStats } from './App';
import { fetchHistoricalFlow } from './fetchUSGSFlow';

jest.mock('react-leaflet', () => ({}));
jest.mock('@vercel/analytics/react', () => ({ Analytics: () => null }), { virtual: true });
jest.mock('./CommentsSection', () => ({ CommentsSection: () => null }));
jest.mock('./fetchUSGSFlow', () => ({ fetchHistoricalFlow: jest.fn() }));
jest.mock('recharts', () => {
  const React = require('react');
  const Wrapper = ({ children }) => React.createElement('div', null, children);
  return {
    ResponsiveContainer: Wrapper, BarChart: Wrapper, LineChart: Wrapper,
    Line: () => null, Bar: () => null, CartesianGrid: () => null,
    XAxis: () => null, YAxis: () => null, Tooltip: () => null, Legend: () => null
  };
});

const river = { name: 'Snake', state: 'Wyoming', grade: 'III', usgs_gage: '13010050', segments: [{ name: 'Canyon' }] };
beforeEach(() => { fetchHistoricalFlow.mockReset(); });

test('monthly statistics use only actual daily means, preserving all-missing months', () => {
  expect(monthlyFlowStats([
    { date: '2026-08-01', flow: 0 }, { date: '2026-08-02', flow: 10 },
    { date: '2026-08-03', flow: null }, { date: '2026-09-01', flow: null }
  ])).toEqual([{ month: '2026-08', flow: 5, days: 2 }, { month: '2026-09', flow: null, days: 0 }]);
});

test('does not show fabricated records or turn unavailable live readings into zero', async () => {
  fetchHistoricalFlow.mockResolvedValue([]);
  render(<FlowChart river={river} currentFlow={null} />);
  expect(await screen.findByText('No monthly observations available.')).toBeInTheDocument();
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(screen.queryByText(/Record High/)).not.toBeInTheDocument();
  expect(screen.getByText(/association with this river section is unverified/)).toBeInTheDocument();
});

test('resets loading and rejects historical results from a previously selected river', async () => {
  let oldResolve;
  let newResolve;
  fetchHistoricalFlow.mockImplementationOnce(() => new Promise(resolve => { oldResolve = resolve; }))
    .mockImplementationOnce(() => new Promise(resolve => { newResolve = resolve; }));
  const { rerender } = render(<FlowChart river={river} currentFlow={0} />);
  rerender(<FlowChart river={{ ...river, name: 'Other', usgs_gage: '13012400' }} />);
  await act(async () => { oldResolve([{ date: '2026-01-01', flow: 999 }]); });
  expect(screen.getByText('Loading historical data...')).toBeInTheDocument();
  await act(async () => { newResolve([]); });
  expect(screen.getByText('No monthly observations available.')).toBeInTheDocument();
  expect(screen.queryByText(/999 CFS/)).not.toBeInTheDocument();
  rerender(<FlowChart river={{ ...river, name: 'Ungauged', usgs_gage: null }} />);
  expect(screen.queryByText('Loading historical data...')).not.toBeInTheDocument();
});
