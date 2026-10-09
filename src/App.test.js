jest.mock('./RiverMap', () => ({
  __esModule: true,
  default: ({ initialState, onBack, renderDetails }) => {
    const { rivers } = require('./rivers');
    return (
      <section aria-label="River map">
        <p>Selected state: {initialState || 'all'}</p>
        <button onClick={onBack}>Back to home</button>
        {renderDetails(rivers[0], rivers[0].segments[0], 0)}
      </section>
    );
  }
}));

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div aria-label="State selection map">{children}</div>,
  TileLayer: () => null,
  GeoJSON: ({ data, onEachFeature }) => (
    <div>
      {data.features.map(feature => {
        const handlers = {};
        onEachFeature(feature, {
          on: (event, callback) => { handlers[event] = callback; }
        });
        return (
          <button key={feature.properties.name} onClick={() => handlers.click()}>
            Explore {feature.properties.name}
          </button>
        );
      })}
    </div>
  )
}));

jest.mock('./fetchUSGSFlow', () => ({
  fetchUSGSFlow: jest.fn(),
  fetchHistoricalFlow: jest.fn()
}));

jest.mock('./us-states.json', () => {
  const states = jest.requireActual('./us-states.json');
  return {
    ...states,
    features: [
      ...states.features,
      { properties: { name: 'North Carolina' } }
    ]
  };
});

jest.mock('./CommentsSection', () => ({
  CommentsSection: ({ riverName, riverState }) => (
    <div>Comments for {riverName} ({riverState})</div>
  )
}));

jest.mock('@vercel/analytics/react', () => ({ Analytics: () => null }), { virtual: true });

jest.mock('recharts', () => {
  const Empty = () => null;
  return {
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    LineChart: ({ data }) => <div data-testid="line-chart">{JSON.stringify(data)}</div>,
    BarChart: ({ data }) => <div data-testid="bar-chart">{JSON.stringify(data)}</div>,
    Line: Empty, XAxis: Empty, YAxis: Empty, CartesianGrid: Empty,
    Tooltip: Empty, Legend: Empty, Bar: Empty
  };
});

jest.mock('./rivers', () => {
  const segment = {
    name: 'Test rapids',
    description: 'Segment description',
    coordinates: [[-110, 43], [-111, 44]],
    videos: [{ id: 'first-video', label: 'First run' }, { id: 'second-video', label: 'Second run' }]
  };
  const stats = { yearly_average: 100, record_high: 1000, record_low: 10 };
  return {
    rivers: Object.freeze([
      { name: 'Gentle River', state: 'OR', grade: 'II', usgs_gage: 'gage-a', usgs_data: stats, description: 'Trip description', segments: [segment] },
      { name: 'Hard River', state: 'WY', grade: 'V', usgs_gage: 'gage-b', usgs_data: stats, segments: [segment] },
      { name: 'Ungaged River', state: 'NC', grade: 'III', usgs_gage: null, usgs_data: stats, segments: [segment] }
    ])
  };
});

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App, { FlowChart } from './App';
import { fetchUSGSFlow, fetchHistoricalFlow } from './fetchUSGSFlow';
import { rivers } from './rivers';

beforeEach(() => {
  jest.clearAllMocks();
  fetchUSGSFlow.mockImplementation(gage => Promise.resolve(gage === 'gage-a' ? 0 : null));
  fetchHistoricalFlow.mockResolvedValue([]);
});

async function renderHome() {
  render(<App />);
  await screen.findByText('0 CFS');
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test('renders the homepage, live zero/unavailable flows, and sorts cards without mutating rivers', async () => {
  const originalOrder = rivers.map(river => river.name);
  await renderHome();

  expect(screen.getByRole('heading', { name: /River Flows/ })).toBeInTheDocument();
  expect(screen.getByLabelText('State selection map')).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual([
    'Featured Rivers by Grade', 'Hard River', 'Ungaged River', 'Gentle River'
  ]);
  expect(rivers.map(river => river.name)).toEqual(originalOrder);
  expect(screen.getAllByText('N/A')).toHaveLength(2);
  expect(fetchUSGSFlow.mock.calls).toEqual([['gage-a'], ['gage-b']]);
});

test('bypasses the live-flow cache at each five-minute refresh and stops polling on unmount', async () => {
  jest.useFakeTimers();
  try {
    let unmount;
    await act(async () => {
      ({ unmount } = render(<App />));
    });
    expect(fetchUSGSFlow.mock.calls).toEqual([['gage-a'], ['gage-b']]);
    await act(async () => {
      jest.advanceTimersByTime(299999);
    });
    expect(fetchUSGSFlow).toHaveBeenCalledTimes(2);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(fetchUSGSFlow.mock.calls.slice(2)).toEqual([
      ['gage-a', { refresh: true }], ['gage-b', { refresh: true }]
    ]);
    await act(async () => {
      jest.advanceTimersByTime(300000);
    });
    expect(fetchUSGSFlow.mock.calls.slice(4)).toEqual([
      ['gage-a', { refresh: true }], ['gage-b', { refresh: true }]
    ]);
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(300000);
    });
    expect(fetchUSGSFlow).toHaveBeenCalledTimes(6);
  } finally {
    jest.useRealTimers();
  }
});

test('explores all rivers, returns home, selects a state, and clears that filter on all-rivers navigation', async () => {
  await renderHome();
  fireEvent.click(screen.getByRole('button', { name: 'Explore all rivers' }));
  expect(screen.getByText('Selected state: all')).toBeInTheDocument();
  expect(screen.queryByLabelText('State selection map')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
  await screen.findByText('0 CFS');
  fireEvent.click(screen.getByRole('button', { name: 'Explore WY' }));
  expect(screen.getByText('Selected state: WY')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
  await screen.findByText('0 CFS');
  fireEvent.click(screen.getByRole('button', { name: 'Explore all rivers' }));
  expect(screen.getByText('Selected state: all')).toBeInTheDocument();
  await screen.findByText('No historical data available for this river');
});

test('converts multiword state names to abbreviations and preserves featured-card state codes', async () => {
  await renderHome();
  fireEvent.click(screen.getByRole('button', { name: 'Explore North Carolina' }));
  expect(screen.getByText('Selected state: NC')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
  await screen.findByText('0 CFS');
  const card = screen.getByRole('heading', { name: 'Gentle River' }).parentElement;
  fireEvent.click(within(card).getByRole('button', { name: /View on Map/ }));
  expect(screen.getByText('Selected state: OR')).toBeInTheDocument();
  await screen.findByText('No historical data available for this river');
});

test('connects river details, comments, videos, and directions to the new map', async () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);
  try {
    await renderHome();
    fireEvent.click(screen.getByRole('button', { name: 'Explore all rivers' }));
    expect(screen.getByRole('heading', { name: 'Flow Analysis - Gentle River - Test rapids' })).toBeInTheDocument();
    expect(screen.getByText('Comments for Gentle River (OR)')).toBeInTheDocument();
    expect(screen.getByText('Trip description')).toBeInTheDocument();
    expect(screen.getByText('Segment description')).toBeInTheDocument();

    const video = screen.getByTitle('Test rapids Kayaking Video');
    expect(video).toHaveAttribute('src', 'https://www.youtube.com/embed/first-video?autoplay=1&mute=1');
    fireEvent.click(screen.getByRole('button', { name: 'Second run' }));
    expect(video).toHaveAttribute('src', 'https://www.youtube.com/embed/second-video?autoplay=1&mute=1');
    fireEvent.click(screen.getByRole('button', { name: /Get Directions/ }));
    expect(open).toHaveBeenCalledWith('https://www.google.com/maps/dir/43,-110/44,-111', '_blank');
    await screen.findByText('No historical data available for this river');
  } finally {
    open.mockRestore();
  }
});

test.each([
  [0, '0 CFS', 0],
  [null, 'N/A', null],
  [undefined, 'Loading...', null],
  [NaN, 'N/A', null]
])('presents current flow %s truthfully in both the text and statistics', (flow, label, chartValue) => {
  render(<FlowChart river={rivers[2]} currentFlow={flow} />);
  expect(screen.getByText('Current:').parentElement).toHaveTextContent(`Current: ${label}`);
  const stats = JSON.parse(screen.getByTestId('bar-chart').textContent);
  expect(stats[0]).toEqual({ name: 'Current', value: chartValue });
  expect(screen.getByText('No historical data available for this river')).toBeInTheDocument();
  expect(fetchHistoricalFlow).not.toHaveBeenCalled();
});

test('resets historical loading/data and ignores responses for previously selected rivers', async () => {
  const first = deferred();
  const second = deferred();
  fetchHistoricalFlow.mockImplementation(gage => gage === 'gage-a' ? first.promise : second.promise);
  const { rerender } = render(<FlowChart river={rivers[0]} currentFlow={0} />);
  expect(screen.getByText('Loading historical data...')).toBeInTheDocument();

  rerender(<FlowChart river={rivers[1]} currentFlow={null} />);
  await act(async () => {
    second.resolve([{ date: 'new-date', flow: 200 }]);
  });
  expect(screen.getAllByTestId('line-chart')[1]).toHaveTextContent('new-date');
  await act(async () => {
    first.resolve([{ date: 'stale-date', flow: 999 }]);
  });
  expect(screen.queryByText(/stale-date/)).not.toBeInTheDocument();
  expect(screen.getAllByTestId('line-chart')[1]).toHaveTextContent('new-date');

  fetchHistoricalFlow.mockReturnValue(new Promise(() => {}));
  rerender(<FlowChart river={rivers[0]} currentFlow={0} />);
  expect(screen.getByText('Loading historical data...')).toBeInTheDocument();
  expect(screen.queryByText(/new-date/)).not.toBeInTheDocument();
  rerender(<FlowChart river={rivers[2]} currentFlow={null} />);
  expect(screen.queryByText('Loading historical data...')).not.toBeInTheDocument();
  expect(screen.getByText('No historical data available for this river')).toBeInTheDocument();
});

test('a stale request cannot clear loading for a pending newer request', async () => {
  const first = deferred();
  const second = deferred();
  fetchHistoricalFlow.mockImplementation(gage => gage === 'gage-a' ? first.promise : second.promise);
  const { rerender } = render(<FlowChart river={rivers[0]} />);
  rerender(<FlowChart river={rivers[1]} />);
  await act(async () => {
    first.resolve([{ date: 'stale-date', flow: 999 }]);
  });
  expect(screen.getByText('Loading historical data...')).toBeInTheDocument();
  await act(async () => {
    second.resolve([]);
  });
  expect(screen.getByText('No historical data available for this river')).toBeInTheDocument();
});

test('switching to an ungaged river stops loading and discards the pending historical response', async () => {
  const first = deferred();
  fetchHistoricalFlow.mockReturnValue(first.promise);
  const { rerender } = render(<FlowChart river={rivers[0]} />);
  rerender(<FlowChart river={rivers[2]} />);
  expect(screen.getByText('No historical data available for this river')).toBeInTheDocument();
  await act(async () => {
    first.resolve([{ date: 'stale-date', flow: 999 }]);
  });
  expect(screen.queryByText(/stale-date/)).not.toBeInTheDocument();
  expect(screen.queryByText('Loading historical data...')).not.toBeInTheDocument();
});

test('historical failures finish loading without retaining another river data', async () => {
  fetchHistoricalFlow.mockResolvedValueOnce([{ date: 'old-date', flow: 50 }]);
  const { rerender } = render(<FlowChart river={rivers[0]} />);
  await waitFor(() => expect(screen.getAllByTestId('line-chart')).toHaveLength(2));
  fetchHistoricalFlow.mockRejectedValueOnce(new Error('Unavailable'));
  rerender(<FlowChart river={rivers[1]} />);
  expect(screen.getByText('Loading historical data...')).toBeInTheDocument();
  await screen.findByText('No historical data available for this river');
  expect(screen.queryByText(/old-date/)).not.toBeInTheDocument();
});

test('changing segments resets the selected video', () => {
  const { rerender } = render(<FlowChart river={rivers[2]} segment={rivers[2].segments[0]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Second run' }));
  rerender(<FlowChart river={rivers[2]} segment={{ ...rivers[2].segments[0], name: 'Next rapids' }} />);
  expect(screen.getByTitle('Next rapids Kayaking Video')).toHaveAttribute(
    'src', 'https://www.youtube.com/embed/first-video?autoplay=1&mute=1'
  );
});
