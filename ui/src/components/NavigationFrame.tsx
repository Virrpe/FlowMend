/**
 * Navigation frame with Shopify Admin UI style navigation
 */

import { Frame, Navigation } from '@shopify/polaris';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationFrameProps {
  children: React.ReactNode;
}

export function NavigationFrame({ children }: NavigationFrameProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      label: 'Dashboard',
      url: '/dashboard',
      selected: location.pathname === '/dashboard',
      onClick: (event) => {
        event.preventDefault();
        navigate('/dashboard');
      },
    },
    {
      label: 'Runs',
      url: '/runs',
      selected: location.pathname.startsWith('/runs'),
      onClick: (event) => {
        event.preventDefault();
        navigate('/runs');
      },
    },
    {
      label: 'Templates',
      url: '/templates',
      selected: location.pathname === '/templates',
      onClick: (event) => {
        event.preventDefault();
        navigate('/templates');
      },
    },
    {
      label: 'Settings',
      url: '/settings',
      selected: location.pathname === '/settings',
      onClick: (event) => {
        event.preventDefault();
        navigate('/settings');
      },
    },
  ];

  const secondaryMenuItems = [
    {
      label: 'Support',
      url: '/app/support',
      external: true,
    },
    {
      label: 'Privacy Policy',
      url: '/app/privacy',
      external: true,
    },
  ];

  return (
    <Frame
      navigation={
        <Navigation location={location.pathname}>
          <Navigation.Section items={navigationItems} />
          <Navigation.Section
            title="Resources"
            items={secondaryMenuItems}
            separator
          />
        </Navigation>
      }
    >
      {children}
    </Frame>
  );
}
