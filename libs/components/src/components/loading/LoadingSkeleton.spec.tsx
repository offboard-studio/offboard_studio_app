import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  LoadingSkeleton,
  CardSkeleton,
  ListItemSkeleton,
  DashboardSkeleton,
  BoardSkeleton,
  ProfileSkeleton,
} from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  describe('CardSkeleton', () => {
    it('should render card skeleton', () => {
      const { container } = render(<CardSkeleton />);
      expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    });
  });

  describe('ListItemSkeleton', () => {
    it('should render list item skeleton with avatar', () => {
      const { container } = render(<ListItemSkeleton />);
      // Should have circular skeleton for avatar
      expect(container.querySelector('.MuiSkeleton-circular')).toBeInTheDocument();
    });
  });

  describe('DashboardSkeleton', () => {
    it('should render dashboard skeleton with multiple cards', () => {
      const { container } = render(<DashboardSkeleton />);
      // Should have multiple skeleton elements
      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBeGreaterThan(1);
    });
  });

  describe('BoardSkeleton', () => {
    it('should render board skeleton with sidebar and canvas', () => {
      const { container } = render(<BoardSkeleton />);
      expect(container.firstChild).toHaveStyle({ display: 'flex' });
    });
  });

  describe('ProfileSkeleton', () => {
    it('should render profile skeleton with avatar', () => {
      const { container } = render(<ProfileSkeleton />);
      expect(container.querySelector('.MuiSkeleton-circular')).toBeInTheDocument();
    });
  });

  describe('LoadingSkeleton component', () => {
    it('should render card variant by default', () => {
      const { container } = render(<LoadingSkeleton />);
      expect(container.querySelector('.MuiSkeleton-rectangular')).toBeInTheDocument();
    });

    it('should render multiple cards when count is specified', () => {
      const { container } = render(<LoadingSkeleton variant="card" count={3} />);
      const rectangularSkeletons = container.querySelectorAll('.MuiSkeleton-rectangular');
      // Each card has one rectangular skeleton for the image
      expect(rectangularSkeletons.length).toBe(3);
    });

    it('should render list variant', () => {
      const { container } = render(<LoadingSkeleton variant="list" count={2} />);
      const circularSkeletons = container.querySelectorAll('.MuiSkeleton-circular');
      expect(circularSkeletons.length).toBe(2);
    });

    it('should render dashboard variant', () => {
      render(<LoadingSkeleton variant="dashboard" />);
      // Dashboard skeleton renders internally
      expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    });

    it('should render board variant', () => {
      const { container } = render(<LoadingSkeleton variant="board" />);
      expect(container.firstChild).toHaveStyle({ display: 'flex' });
    });

    it('should render profile variant', () => {
      const { container } = render(<LoadingSkeleton variant="profile" />);
      expect(container.querySelector('.MuiSkeleton-circular')).toBeInTheDocument();
    });
  });
});
