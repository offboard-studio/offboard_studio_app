import { render, screen } from '@testing-library/react';

import App from '../App';

describe('App', () => {
  test('should home page by default', () => {
    render(<App />);

    const headerText = screen.getAllByText(
      /Offboard StudioApp/i
    );

    expect(headerText[0]).toBeInTheDocument();
  });
});
